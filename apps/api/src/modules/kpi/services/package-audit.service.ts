import { FastifyInstance } from 'fastify';
import {
  PackageAuditListParams,
  PackageAuditListResponse,
  PackageAuditRecord,
  ReviewPackageAuditParams,
} from '@mos-lab/shared';

export class PackageAuditService {
  constructor(private fastify: FastifyInstance) {}

  async listManualAdjustments(params: PackageAuditListParams): Promise<PackageAuditListResponse> {
    const { dateFrom, dateTo, staffId, status = 'ALL', search } = params;

    let whereClause = `WHERE usbt.order_id IS NULL AND (usbt.normal_count > 0 OR usbt.retain_count > 0)`;

    if (dateFrom) {
      whereClause += ` AND usbt.date_created >= '${dateFrom} 00:00:00'`;
    }
    if (dateTo) {
      whereClause += ` AND usbt.date_created <= '${dateTo} 23:59:59'`;
    }
    if (staffId) {
      whereClause += ` AND usbt.created_staff_id = ${Number(staffId)}`;
    }
    if (search) {
      const cleanSearch = search.replace(/'/g, "''");
      whereClause += ` AND (up_cust.full_name LIKE '%${cleanSearch}%' OR uc.phone_number LIKE '%${cleanSearch}%' OR usbt.note LIKE '%${cleanSearch}%')`;
    }

    const rows: any[] = await this.fastify.prisma.legacy.$queryRawUnsafe(`
      SELECT 
        MIN(usbt.id) as id,
        usbt.user_service_balance_id as balanceId,
        usbt.user_id as userId,
        usbt.created_staff_id as staffId,
        SUM(usbt.normal_count) as normalCountAdded,
        SUM(usbt.retain_count) as retainCountAdded,
        usbt.note,
        usbt.cancel_note as cancelNote,
        usbt.cancelled_staff_id as cancelledStaffId,
        MIN(usbt.date_created) as dateCreated,
        MAX(usbt.date_cancelled) as dateCancelled,
        up_staff.full_name as staffName,
        up_reviewer.full_name as reviewerStaffName,
        up_cust.full_name as customerName,
        up_cust.avatar as customerAvatar,
        uc.phone_number as customerPhone,
        sl.service_name as serviceName
      FROM user_service_balance_transaction usbt
      LEFT JOIN user_profile up_staff ON up_staff.user_id = usbt.created_staff_id
      LEFT JOIN user_profile up_reviewer ON up_reviewer.user_id = usbt.cancelled_staff_id
      LEFT JOIN user_profile up_cust ON up_cust.user_id = usbt.user_id
      LEFT JOIN (
        SELECT user_id, MAX(phone_number) as phone_number 
        FROM user_contact 
        WHERE is_disabled = 0 
        GROUP BY user_id
      ) uc ON uc.user_id = usbt.user_id
      LEFT JOIN user_service_balance usb ON usb.id = usbt.user_service_balance_id
      LEFT JOIN service_language sl ON sl.service_id = usb.service_id AND sl.language_id = 1
      ${whereClause}
      GROUP BY usbt.user_service_balance_id, usbt.user_id, usbt.created_staff_id, usbt.date_created, usbt.note, usbt.cancel_note, usbt.cancelled_staff_id, up_staff.full_name, up_reviewer.full_name, up_cust.full_name, up_cust.avatar, uc.phone_number, sl.service_name
      ORDER BY id DESC
      LIMIT 500
    `);

    const allRecords: PackageAuditRecord[] = rows.map((r) => {
      let reviewStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REVOKED' = 'PENDING_REVIEW';
      let reviewNote: string | undefined = undefined;

      if (r.dateCancelled || (r.cancelNote && r.cancelNote.startsWith('AUDIT_REVOKED:'))) {
        reviewStatus = 'REVOKED';
        reviewNote = r.cancelNote ? r.cancelNote.replace('AUDIT_REVOKED:', '').trim() : undefined;
      } else if (r.cancelNote && r.cancelNote.startsWith('AUDIT_APPROVED:')) {
        reviewStatus = 'APPROVED';
        reviewNote = r.cancelNote.replace('AUDIT_APPROVED:', '').trim();
      }

      return {
        id: Number(r.id),
        balanceId: Number(r.balanceId),
        userId: Number(r.userId),
        customerName: r.customerName || `KH #${r.userId}`,
        customerPhone: r.customerPhone || '',
        customerAvatar: r.customerAvatar || undefined,
        serviceName: r.serviceName || 'Gói Dịch Vụ',
        normalCountAdded: Number(r.normalCountAdded || 0),
        retainCountAdded: Number(r.retainCountAdded || 0),
        note: r.note || '',
        staffId: Number(r.staffId || 0),
        staffName: r.staffName || `Staff #${r.staffId}`,
        dateCreated: r.dateCreated ? new Date(r.dateCreated).toISOString() : '',
        reviewStatus,
        reviewedByStaffId: r.cancelledStaffId ? Number(r.cancelledStaffId) : undefined,
        reviewedByStaffName: r.reviewerStaffName || undefined,
        reviewedAt: r.dateCancelled ? new Date(r.dateCancelled).toISOString() : undefined,
        reviewNote,
      };
    });

    const filtered = status === 'ALL' ? allRecords : allRecords.filter((r) => r.reviewStatus === status);

    const summary = {
      totalCount: allRecords.length,
      pendingCount: allRecords.filter((r) => r.reviewStatus === 'PENDING_REVIEW').length,
      approvedCount: allRecords.filter((r) => r.reviewStatus === 'APPROVED').length,
      revokedCount: allRecords.filter((r) => r.reviewStatus === 'REVOKED').length,
    };

    return {
      data: filtered,
      summary,
    };
  }

  async reviewAdjustment(
    reviewerStaffId: number,
    params: ReviewPackageAuditParams
  ): Promise<{ success: boolean; message: string; reviewStatus: string }> {
    const { transactionId, action, reviewNote } = params;

    const txns: any[] = await this.fastify.prisma.legacy.$queryRawUnsafe(`
      SELECT usbt.*, usb.id as balanceId
      FROM user_service_balance_transaction usbt
      LEFT JOIN user_service_balance usb ON usb.id = usbt.user_service_balance_id
      WHERE usbt.id = ${Number(transactionId)}
    `);

    if (!txns || txns.length === 0) {
      throw new Error(`Giao dịch cộng thủ công #${transactionId} không tồn tại.`);
    }

    const txn = txns[0];

    // Find all batch rows matching this exact timestamp operation
    const batchTxns: any[] = await this.fastify.prisma.legacy.$queryRawUnsafe(`
      SELECT SUM(normal_count) as totalNormal, SUM(retain_count) as totalRetain, COUNT(*) as batchSize
      FROM user_service_balance_transaction
      WHERE user_service_balance_id = ${Number(txn.user_service_balance_id)}
        AND created_staff_id = ${Number(txn.created_staff_id)}
        AND date_created = '${new Date(txn.date_created).toISOString().slice(0, 19).replace('T', ' ')}'
    `);

    const totalNormalAdded = Number(batchTxns[0]?.totalNormal || txn.normal_count);
    const totalRetainAdded = Number(batchTxns[0]?.totalRetain || txn.retain_count);

    if (action === 'REVOKE') {
      if (txn.date_cancelled || (txn.cancel_note && txn.cancel_note.startsWith('AUDIT_REVOKED:'))) {
        return { success: true, message: 'Giao dịch này đã được Thu hồi trước đó.', reviewStatus: 'REVOKED' };
      }

      const noteText = reviewNote
        ? `AUDIT_REVOKED: ${reviewNote.replace(/'/g, "''")}`
        : 'AUDIT_REVOKED: Quản lý Thu hồi lượt cộng';

      // 1. Decrement balance
      await this.fastify.prisma.legacy.$executeRawUnsafe(`
        UPDATE user_service_balance 
        SET 
          normal_count = GREATEST(0, normal_count - ${totalNormalAdded}),
          retain_count = GREATEST(0, retain_count - ${totalRetainAdded})
        WHERE id = ${Number(txn.user_service_balance_id)}
      `);

      // 2. Mark batch transactions as REVOKED
      await this.fastify.prisma.legacy.$executeRawUnsafe(`
        UPDATE user_service_balance_transaction
        SET 
          cancel_note = '${noteText}',
          cancelled_staff_id = ${Number(reviewerStaffId)},
          date_cancelled = NOW()
        WHERE user_service_balance_id = ${Number(txn.user_service_balance_id)}
          AND created_staff_id = ${Number(txn.created_staff_id)}
          AND date_created = '${new Date(txn.date_created).toISOString().slice(0, 19).replace('T', ' ')}'
      `);

      // 3. Log user note
      const userNoteText = `[AUDIT REVOKE] Lượt cộng thủ công (+${totalNormalAdded} nối, +${totalRetainAdded} dặm) đã bị Quản lý Thu hồi. Lý do: ${reviewNote || 'Thao tác thu hồi từ Báo cáo Kiểm toán'}`;
      await this.fastify.prisma.legacy.$executeRawUnsafe(`
        INSERT INTO user_note (client_id, client_business_id, client_store_id, user_id, created_staff_id, note_field_key, note, date_created)
        VALUES (1, 1, 1, ${Number(txn.user_id)}, ${Number(reviewerStaffId)}, 'note', '${userNoteText.replace(/'/g, "''")}', NOW())
      `);

      return { success: true, message: 'Thu hồi lượt cộng thủ công thành công.', reviewStatus: 'REVOKED' };
    } else {
      const noteText = reviewNote
        ? `AUDIT_APPROVED: ${reviewNote.replace(/'/g, "''")}`
        : 'AUDIT_APPROVED: Quản lý đã Phê duyệt';

      await this.fastify.prisma.legacy.$executeRawUnsafe(`
        UPDATE user_service_balance_transaction
        SET 
          cancel_note = '${noteText}',
          cancelled_staff_id = ${Number(reviewerStaffId)}
        WHERE user_service_balance_id = ${Number(txn.user_service_balance_id)}
          AND created_staff_id = ${Number(txn.created_staff_id)}
          AND date_created = '${new Date(txn.date_created).toISOString().slice(0, 19).replace('T', ' ')}'
      `);

      return { success: true, message: 'Đã Phê duyệt lượt cộng thủ công.', reviewStatus: 'APPROVED' };
    }
  }
}
