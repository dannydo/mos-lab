import { FastifyInstance } from 'fastify';
import { ReportComparisonMode, SafeAny } from '@mos-lab/shared';
import { getPreviousReportPeriod } from '../services/report-period-comparison.js';

/**
 * Công thức Thưởng Kim Cương lũy tiến (VND):
 * Khách 1: 5,000đ
 * Khách 2: 10,000đ
 * Khách 3: 20,000đ
 * Khách 4: 30,000đ
 * Khách 5: 40,000đ
 * Khách 6+: 50,000đ / khách
 */
export function calculateDiamondBonus(referralCount: number): number {
  if (referralCount <= 0) return 0;
  let bonus = 0;
  const rates = [5000, 10000, 20000, 30000, 40000];
  for (let i = 1; i <= referralCount; i++) {
    if (i <= 5) {
      bonus += rates[i - 1];
    } else {
      bonus += 50000;
    }
  }
  return bonus;
}

export async function fetchDiamondData(
  fastify: FastifyInstance,
  dateFromDay: string,
  dateToDay: string,
  endAt?: string
) {
  const dateFromDt = `${dateFromDay} 00:00:00`;
  const dateToDt = endAt || `${dateToDay} 23:59:59`;

  // Fetch ACTIVE_CC_STAFF_CONFIG if present
  let activeCcIds: number[] | null = null;
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'ACTIVE_CC_STAFF_CONFIG' },
    });
    if (configRecord && configRecord.value) {
      activeCcIds = JSON.parse(configRecord.value);
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching ACTIVE_CC_STAFF_CONFIG');
  }

  const sql = `
    SELECT
        up_cc.user_id                                            AS cc_id,
        up_cc.full_name                                          AS TEN_CC,
        up_cc.avatar                                             AS AVATAR,
        ROUND(SUM(rscc.total_check_in + rscc.total_check_out) / 2) AS TONG_KHACH,
        COALESCE(ref.cnt, 0)                                     AS SO_KH_DIAMOND
    FROM report_staff_client_consultant rscc
    JOIN user_profile up_cc
        ON rscc.user_id              = up_cc.user_id
       AND up_cc.client_business_id  = 1
       AND up_cc.is_disabled         = 0
    LEFT JOIN (
        SELECT
            referrer_check_out_staff_id AS cc_id,
            COUNT(*)                    AS cnt
        FROM user_profile
        WHERE client_business_id    = 1
          AND referrer_date_created BETWEEN ? AND ?
        GROUP BY referrer_check_out_staff_id
    ) ref ON ref.cc_id = rscc.user_id
    WHERE rscc.client_business_id = 1
      AND rscc.date BETWEEN ? AND ?
    GROUP BY rscc.user_id, up_cc.user_id, up_cc.full_name, up_cc.avatar
    HAVING TONG_KHACH > 0
    ORDER BY SO_KH_DIAMOND DESC, up_cc.full_name ASC
  `;

  const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    sql,
    dateFromDt,
    dateToDt,
    dateFromDay,
    dateToDay
  );

  let filteredRows = rows;
  if (activeCcIds && activeCcIds.length > 0) {
    filteredRows = rows.filter((r) => activeCcIds!.includes(Number(r.cc_id)));
  }

  let rank = 1;
  let totalReferralGuests = 0;
  let totalDiamondBonus = 0;

  const data = filteredRows.map((r) => {
    const ccId = Number(r.cc_id);
    const tenCc = String(r.TEN_CC || '');
    const tongKhach = Number(r.TONG_KHACH || 0);
    const soKhachDiamond = Number(r.SO_KH_DIAMOND || 0);
    const potentialThuong = calculateDiamondBonus(soKhachDiamond);
    const tyLeGioiThieu = tongKhach > 0 ? Number(((soKhachDiamond / tongKhach) * 100).toFixed(1)) : 0;
    const datDieuKien = tyLeGioiThieu >= 3.0;
    const thuongDiamond = datDieuKien ? potentialThuong : 0;

    totalReferralGuests += soKhachDiamond;
    totalDiamondBonus += thuongDiamond;

    return {
      rank: rank++,
      ccId,
      tenCc,
      avatar: r.AVATAR ? String(r.AVATAR) : null,
      tongKhach,
      soKhachDiamond,
      thuongDiamond,
      potentialThuong,
      tyLeGioiThieu,
      datDieuKien,
    };
  });

  return {
    totalReferralGuests,
    totalDiamondBonus,
    data,
  };
}

export async function registerExportRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/export-diamond (CSV Export for Google Sheets & JSON for Next.js Web App)
  fastify.get('/kpi/export-diamond', async (request, reply) => {
    const { key, month, date_from, date_to, format, comparisonMode } = request.query as {
      key?: string;
      month?: string;
      date_from?: string;
      date_to?: string;
      format?: string;
      comparisonMode?: ReportComparisonMode;
    };

    // Verify key when provided or external integration
    if (key && key !== 'FDC0D0A177694777A') {
      return reply.status(401).send({ error: 'Unauthorized', message: 'API key không hợp lệ.' });
    }

    let dateFromDay: string;
    let dateToDay: string;

    if (date_from && date_to) {
      dateFromDay = date_from.includes('T') ? date_from.split('T')[0] : date_from;
      dateToDay = date_to.includes('T') ? date_to.split('T')[0] : date_to;
    } else {
      const monthParam = month || new Date().toISOString().substring(0, 7);
      if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(monthParam)) {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'Định dạng tháng không hợp lệ. Sử dụng YYYY-MM.' });
      }
      dateFromDay = `${monthParam}-01`;
      const [y, m] = monthParam.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      dateToDay = `${monthParam}-${String(lastDay).padStart(2, '0')}`;
    }

    try {
      const comparisonWindow = comparisonMode ? getPreviousReportPeriod(dateFromDay, dateToDay, comparisonMode) : null;
      const [result, comparisonResult] = await Promise.all([
        fetchDiamondData(fastify, dateFromDay, dateToDay),
        comparisonWindow
          ? fetchDiamondData(fastify, comparisonWindow.dateFrom, comparisonWindow.dateTo, comparisonWindow.endAt).catch(
              (error: unknown) => {
                fastify.log.warn(error, 'Unable to load Kim Cương comparison period');
                return null;
              }
            )
          : null,
      ]);

      // Return CSV if format=csv or key is provided or Accept is text/csv
      if (format === 'csv' || request.headers.accept?.includes('text/csv') || (key && format !== 'json')) {
        const lines: string[] = ['TEN_CC,TONG_KHACH,SO_KH_DIAMOND,THUONG_DIAMOND,TY_LE_GIOI_THIEU,DAT_DIEU_KIEN'];
        for (const row of result.data) {
          const escapedName = `"${row.tenCc.replace(/"/g, '""')}"`;
          const datStr = row.datDieuKien ? 'DAT' : 'CHUA_DAT';
          lines.push(
            `${escapedName},${row.tongKhach},${row.soKhachDiamond},${row.thuongDiamond},${row.tyLeGioiThieu}%,${datStr}`
          );
        }
        reply.header('Content-Type', 'text/plain; charset=utf-8');
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
        return lines.join('\n');
      }

      return {
        dateFrom: dateFromDay,
        dateTo: dateToDay,
        month: month || dateFromDay.substring(0, 7),
        ...result,
        comparison:
          comparisonResult && comparisonWindow && comparisonMode
            ? {
                mode: comparisonMode,
                dateFrom: comparisonWindow.dateFrom,
                dateTo: comparisonWindow.dateTo,
                totalReferralGuests: comparisonResult.totalReferralGuests,
                totalDiamondBonus: comparisonResult.totalDiamondBonus,
              }
            : undefined,
      };
    } catch (err) {
      fastify.log.error(err as Error, 'Export diamond error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi xuất dữ liệu Kim Cương.' });
    }
  });

  // GET /api/kpi/export-diamond/details (Drill-down referral details for a specific CC)
  fastify.get('/kpi/export-diamond/details', async (request, reply) => {
    const { ccId, month, date_from, date_to } = request.query as {
      ccId?: string;
      month?: string;
      date_from?: string;
      date_to?: string;
    };

    if (!ccId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu ccId.' });
    }

    const ccIdNum = Number(ccId);
    let dateFromDay: string;
    let dateToDay: string;

    if (date_from && date_to) {
      dateFromDay = date_from.includes('T') ? date_from.split('T')[0] : date_from;
      dateToDay = date_to.includes('T') ? date_to.split('T')[0] : date_to;
    } else {
      const monthParam = month || new Date().toISOString().substring(0, 7);
      dateFromDay = `${monthParam}-01`;
      const [y, m] = monthParam.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      dateToDay = `${monthParam}-${String(lastDay).padStart(2, '0')}`;
    }

    const dateFromDt = `${dateFromDay} 00:00:00`;
    const dateToDt = `${dateToDay} 23:59:59`;

    try {
      // Get CC Name
      const ccProfile = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT full_name FROM user_profile WHERE user_id = ? LIMIT 1`,
        ccIdNum
      );
      const tenCc = ccProfile && ccProfile.length > 0 ? ccProfile[0].full_name : `CC #${ccIdNum}`;

      const sql = `
        SELECT
          up_new.user_id                                          AS newUserId,
          up_new.full_name                                        AS newName,
          COALESCE(MAX(uc_new.phone_number), '')                  AS newPhone,
          up_new.referrer_date_created                            AS referralDate,
          up_ref.user_id                                          AS referrerUserId,
          COALESCE(up_ref.full_name, 'Khách hàng')               AS referrerName,
          COALESCE(MAX(uc_ref.phone_number), '')                  AS referrerPhone
        FROM user_profile up_new
        LEFT JOIN user_contact uc_new ON up_new.user_id = uc_new.user_id AND uc_new.is_disabled = 0
        LEFT JOIN user_profile up_ref ON up_new.referrer_user_id = up_ref.user_id
        LEFT JOIN user_contact uc_ref ON up_ref.user_id = uc_ref.user_id AND uc_ref.is_disabled = 0
        WHERE up_new.client_business_id = 1
          AND up_new.referrer_check_out_staff_id = ?
          AND up_new.referrer_date_created BETWEEN ? AND ?
        GROUP BY up_new.user_id, up_new.full_name, up_new.referrer_date_created, up_ref.user_id, up_ref.full_name
        ORDER BY up_new.referrer_date_created DESC
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql, ccIdNum, dateFromDt, dateToDt);

      const data = rows.map((r, idx) => ({
        referralId: idx + 1,
        referralDate: r.referralDate ? new Date(r.referralDate).toISOString() : '',
        referrerUserId: r.referrerUserId ? Number(r.referrerUserId) : undefined,
        referrerName: String(r.referrerName || 'Khách hàng'),
        referrerPhone: String(r.referrerPhone || ''),
        newUserId: Number(r.newUserId),
        newName: String(r.newName || ''),
        newPhone: String(r.newPhone || ''),
      }));

      return {
        ccId: ccIdNum,
        tenCc,
        totalCount: data.length,
        data,
      };
    } catch (err) {
      fastify.log.error(err as Error, 'Export diamond details error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi xuất chi tiết Kim Cương.' });
    }
  });
}
