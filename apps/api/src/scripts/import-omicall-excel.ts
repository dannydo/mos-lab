import fs from 'fs';
import { PrismaClient as CrmPrisma } from '../generated/crm-client/index.js';
import { PrismaClient as LegacyPrisma } from '../generated/legacy-client/index.js';

const prismaCrm = new CrmPrisma();
const prismaLegacy = new LegacyPrisma();

function getLast9Digits(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.slice(-9);
}

// Giả sử file CSV xuất ra từ OmiCall có định dạng phân cách bằng dấu phẩy (comma) hoặc chấm phẩy (semicolon)
// Các cột dự kiến: direction, source_number, destination_number, duration, created_at, call_uuid
interface OmicallCsvRow {
  call_uuid: string;
  direction: 'inbound' | 'outbound';
  source_number: string;
  destination_number: string;
  duration: number; // số giây
  created_at: string; // định dạng YYYY-MM-DD HH:mm:ss
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Vui lòng truyền đường dẫn file CSV: npx tsx src/scripts/import-omicall-excel.ts <path-to-csv>');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`File không tồn tại: ${csvPath}`);
    process.exit(1);
  }

  console.log(`=== ĐANG ĐỌC FILE CSV: ${csvPath} ===`);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  console.log('Các cột phát hiện:', headers);

  const rows: OmicallCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV row đơn giản
    const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length < headers.length) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    rows.push({
      call_uuid: row.call_uuid || row.callUuid || '',
      direction: (row.direction || 'outbound').toLowerCase() as any,
      source_number: row.source_number || row.sourceNumber || '',
      destination_number: row.destination_number || row.destinationNumber || '',
      duration: Number(row.duration || row.bill_sec || 0),
      created_at: row.created_at || row.time_start_call || row.createdAt || '',
    });
  }

  console.log(`Đã parse thành công ${rows.length} cuộc gọi từ file CSV.`);

  // Lấy các cuộc gọi Telesales bị null duration
  const telesalesLogs = await prismaCrm.crmCallLog.findMany({
    where: {
      OR: [{ durationSec: null }, { durationSec: 0 }],
    },
  });

  console.log(`Số cuộc gọi Telesales đang bị NULL/0 duration trong hệ thống: ${telesalesLogs.length}`);

  let updatedCount = 0;

  for (const log of telesalesLogs) {
    // Lấy số điện thoại khách hàng từ legacy DB
    const contacts = await prismaLegacy.user_contact.findMany({
      where: { user_id: log.legacyUserId, is_disabled: false },
    });
    if (contacts.length === 0) continue;

    const phoneLast9s = contacts.map((c) => getLast9Digits(c.phone_number)).filter(Boolean);
    if (phoneLast9s.length === 0) continue;

    // So khớp với danh sách từ CSV
    const matchedCsvRow = rows.find((r) => {
      const destLast9 = getLast9Digits(r.destination_number);
      const srcLast9 = getLast9Digits(r.source_number);
      const isPhoneMatched = phoneLast9s.includes(destLast9) || phoneLast9s.includes(srcLast9);
      if (!isPhoneMatched) return false;

      // Khớp thời gian lệch trong vòng 10 phút
      const csvTime = new Date(r.created_at);
      const diffMs = Math.abs(csvTime.getTime() - log.createdAt.getTime());
      return diffMs <= 10 * 60 * 1000;
    });

    if (matchedCsvRow) {
      // 1. Tạo hoặc update crmOmicallLog thô
      await prismaCrm.crmOmicallLog.upsert({
        where: { callUuid: matchedCsvRow.call_uuid },
        update: {
          direction: matchedCsvRow.direction,
          sourceNumber: matchedCsvRow.source_number,
          destinationNumber: matchedCsvRow.destination_number,
          duration: matchedCsvRow.duration,
          billSec: matchedCsvRow.duration,
          timeStartCall: new Date(matchedCsvRow.created_at),
          callLogId: log.id,
          legacyUserId: log.legacyUserId,
          staffId: log.staffId,
        },
        create: {
          callUuid: matchedCsvRow.call_uuid,
          direction: matchedCsvRow.direction,
          sourceNumber: matchedCsvRow.source_number,
          destinationNumber: matchedCsvRow.destination_number,
          duration: matchedCsvRow.duration,
          billSec: matchedCsvRow.duration,
          timeStartCall: new Date(matchedCsvRow.created_at),
          callLogId: log.id,
          legacyUserId: log.legacyUserId,
          staffId: log.staffId,
          analysisStatus: 'SKIPPED',
        },
      });

      // 2. Cập nhật crmCallLog
      await prismaCrm.crmCallLog.update({
        where: { id: log.id },
        data: {
          durationSec: matchedCsvRow.duration,
          callUuid: matchedCsvRow.call_uuid,
        },
      });

      console.log(
        `[ĐỒNG BỘ THÀNH CÔNG] CallLog ID ${log.id} (Khách hàng ${log.legacyUserId}) <-> CSV Row (${matchedCsvRow.duration}s, UUID: ${matchedCsvRow.call_uuid})`
      );
      updatedCount++;
    }
  }

  console.log(`=== HOÀN TẤT IMPORT. ĐÃ CẬP NHẬT THÀNH CÔNG: ${updatedCount} BẢN GHI ===`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prismaCrm.$disconnect();
    await prismaLegacy.$disconnect();
  });
