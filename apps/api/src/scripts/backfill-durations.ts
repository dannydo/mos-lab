import { PrismaClient as CrmPrisma } from '../generated/crm-client/index.js';
import { PrismaClient as LegacyPrisma } from '../generated/legacy-client/index.js';

const prismaCrm = new CrmPrisma();
const prismaLegacy = new LegacyPrisma();

// Lấy 9 chữ số cuối của số điện thoại để so khớp
function getLast9Digits(phone: string): string {
  const cleaned = phone.replace(/\D/g, ''); // Chỉ giữ số
  return cleaned.slice(-9);
}

async function backfill() {
  console.log('=== STARTING SMART DURATION BACKFILL ===');

  // Lấy các cuộc gọi Telesales (crmCallLog) đang bị null durationSec hoặc bằng 0
  const logsToBackfill = await prismaCrm.crmCallLog.findMany({
    where: {
      OR: [{ durationSec: null }, { durationSec: 0 }],
    },
  });

  console.log(`Found ${logsToBackfill.length} Telesales logs to backfill.`);

  let matchedCount = 0;

  for (const log of logsToBackfill) {
    try {
      // 1. Tìm các số điện thoại liên kết với legacyUserId của khách hàng này
      const userContacts = await prismaLegacy.user_contact.findMany({
        where: {
          user_id: log.legacyUserId,
          is_disabled: false,
        },
      });

      if (userContacts.length === 0) {
        // console.log(`No contacts found for customer ID ${log.legacyUserId}`);
        continue;
      }

      // Lấy danh sách 9 chữ số cuối của các số điện thoại khách hàng
      const phoneLast9s = userContacts.map((c) => getLast9Digits(c.phone_number)).filter(Boolean);
      if (phoneLast9s.length === 0) continue;

      // 2. Tìm trong crmOmicallLog (bảng webhook lưu log tổng đài)
      // Mốc thời gian chênh lệch +/- 10 phút
      const startRange = new Date(log.createdAt.getTime() - 10 * 60 * 1000);
      const endRange = new Date(log.createdAt.getTime() + 10 * 60 * 1000);

      const omicallLogs = await prismaCrm.crmOmicallLog.findMany({
        where: {
          createdAt: {
            gte: startRange,
            lte: endRange,
          },
          duration: { gt: 0 },
        },
      });

      // Lọc các omicall logs có destinationNumber hoặc sourceNumber khớp 9 chữ số cuối
      const match = omicallLogs.find((o) => {
        const destLast9 = getLast9Digits(o.destinationNumber);
        const srcLast9 = getLast9Digits(o.sourceNumber);
        return phoneLast9s.includes(destLast9) || phoneLast9s.includes(srcLast9);
      });

      if (match) {
        // Cập nhật CrmCallLog
        await prismaCrm.crmCallLog.update({
          where: { id: log.id },
          data: {
            callUuid: match.callUuid,
            durationSec: match.duration,
          },
        });

        // Cập nhật ngược lại CrmOmicallLog để tạo mối liên kết
        await prismaCrm.crmOmicallLog.update({
          where: { id: match.id },
          data: {
            callLogId: log.id,
            legacyUserId: log.legacyUserId,
            staffId: log.staffId,
          },
        });

        console.log(
          `[MATCHED] CallLog ID ${log.id} (user ${log.legacyUserId}) <-> OmiCall Log ID ${match.id} (${match.duration}s, UUID: ${match.callUuid})`
        );
        matchedCount++;
      }
    } catch (err: unknown) {
      console.error(`Error processing CallLog ID ${log.id}:`, (err as Error).message);
    }
  }

  console.log(`=== BACKFILL COMPLETED. TOTAL MATCHED & UPDATED: ${matchedCount} ===`);
}

backfill()
  .catch(console.error)
  .finally(async () => {
    await prismaCrm.$disconnect();
    await prismaLegacy.$disconnect();
  });
