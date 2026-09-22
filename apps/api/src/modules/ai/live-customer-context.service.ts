import type { PrismaClient as LegacyPrismaClient } from '../../generated/legacy-client/index.js';
import type { PrismaClient as CrmPrismaClient } from '../../generated/crm-client/index.js';
import type { SafeAny } from '@mos-lab/shared';

interface CachedSummary {
  text: string;
  total: number;
  comboLive: number;
  comboDead: number;
  single: number;
  notComboLive: number;
  timestamp: number;
}

let cachedSummary: CachedSummary | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute cache

export class LiveCustomerContextService {
  /**
   * Query live customer statistics from the database to give AI 100% accurate data
   */
  static async getLiveCustomerSummary(
    legacyPrisma?: LegacyPrismaClient,
    crmPrisma?: CrmPrismaClient,
    staffId?: number
  ): Promise<string> {
    if (!legacyPrisma) {
      return '';
    }

    try {
      const now = Date.now();
      let stats = cachedSummary;

      if (!stats || now - stats.timestamp > CACHE_TTL_MS) {
        const [totRows, usbRows] = await Promise.all([
          legacyPrisma.$queryRawUnsafe<SafeAny[]>(
            'SELECT COUNT(*) as total FROM user u LEFT JOIN user_profile up ON u.id = up.user_id WHERE COALESCE(up.is_deleted, 0) = 0'
          ),
          legacyPrisma.$queryRawUnsafe<SafeAny[]>(`
            SELECT 
              SUM(CASE WHEN live_count > 0 THEN 1 ELSE 0 END) as comboLive,
              SUM(CASE WHEN live_count = 0 THEN 1 ELSE 0 END) as comboDead
            FROM (
              SELECT 
                usb.user_id,
                SUM(CASE WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 1 ELSE 0 END) as live_count
              FROM user_service_balance usb
              JOIN user_profile up ON up.user_id = usb.user_id AND COALESCE(up.is_deleted, 0) = 0
              GROUP BY usb.user_id
            ) t
          `),
        ]);

        const total = Number(totRows[0]?.total || 0);
        const comboLive = Number(usbRows[0]?.comboLive || 0);
        const comboDead = Number(usbRows[0]?.comboDead || 0);
        const single = Math.max(0, total - comboLive - comboDead);
        const notComboLive = Math.max(0, total - comboLive);

        stats = {
          total,
          comboLive,
          comboDead,
          single,
          notComboLive,
          timestamp: now,
          text: `[Dữ Liệu Khách Hàng Thực Tế Hệ Thống mOS]:
- Tổng số khách hàng trên hệ thống: ${total.toLocaleString('vi-VN')}
- Nhóm COMBO_LIVE (Gói combo còn hạn / còn lượt dặm): ${comboLive.toLocaleString('vi-VN')} khách
- Nhóm NOT_COMBO_LIVE (Khách lẻ còn hạn dặm 21 ngày, chưa có combo): ${notComboLive.toLocaleString('vi-VN')} khách
- Nhóm COMBO_DEAD (Từng có combo nhưng đã hết hạn hoặc hết lượt): ${comboDead.toLocaleString('vi-VN')} khách
- Nhóm SINGLE (Khách lẻ độc lập, không dùng gói): ${single.toLocaleString('vi-VN')} khách`,
        };

        cachedSummary = stats;
      }

      let assignedText = '';
      if (crmPrisma && staffId) {
        try {
          const myAssignedCount = await crmPrisma.crmCustomerAssignment.count({
            where: { staffId },
          });
          assignedText = `\n- Số khách hàng được phân bổ riêng cho nhân sự hiện tại: ${myAssignedCount.toLocaleString(
            'vi-VN'
          )} khách`;
        } catch {
          // non-blocking
        }
      }

      return `${stats.text}${assignedText}`;
    } catch {
      return '';
    }
  }
}
