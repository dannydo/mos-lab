import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: "mysql://root:chickisslove@127.0.0.1:3306/management"
    }
  }
});

function getCarrier(phone: string): string {
  // Normalize: remove non-digits
  let clean = phone.replace(/\D/g, '');
  
  // Handle leading 0084 -> 0
  if (clean.startsWith('0084')) {
    clean = '0' + clean.slice(4);
  }
  
  // Replace 84 prefix with 0
  if (clean.startsWith('84')) {
    clean = '0' + clean.slice(2);
  }
  
  // If it doesn't start with 0, but starts with a mobile prefix digit (3, 5, 7, 8, 9) and has length 9, prepend 0
  if (!clean.startsWith('0') && /^[35789]/.test(clean) && clean.length === 9) {
    clean = '0' + clean;
  }

  // If it doesn't start with 0, but starts with 9/8/7/5/3 and has length 10, it might be missing a 0. Prepend 0 and it becomes 11 digits.
  if (!clean.startsWith('0') && /^[35789]/.test(clean) && clean.length === 10) {
    clean = '0' + clean;
  }

  // Now check if it starts with 0
  if (clean.startsWith('0')) {
    // 1. If it is 11 digits, first check old 11-digit prefixes
    if (clean.length === 11) {
      if (clean.startsWith('016')) return 'Viettel';
      if (/^012[01268]/.test(clean)) return 'Mobifone';
      if (/^012[34579]/.test(clean)) return 'Vinaphone';
      if (/^018[68]/.test(clean)) return 'Vietnamobile';
      if (clean.startsWith('0199')) return 'Gmobile';
      
      // If it doesn't match old 11-digit prefixes, it might be a 10-digit number with a trailing typo (e.g. 09035479790)
      // Check the first 10 digits
      const first10 = clean.slice(0, 10);
      if (/^0(86|96|97|98|3[2-9])/.test(first10)) return 'Viettel';
      if (/^0(88|91|94|8[1-5])/.test(first10)) return 'Vinaphone';
      if (/^0(89|90|93|7[06789])/.test(first10)) return 'Mobifone';
      if (/^0(92|5[268])/.test(first10)) return 'Vietnamobile';
      if (/^0(99|59)/.test(first10)) return 'Gmobile';
      if (/^087/.test(first10)) return 'Itelecom (Itel)';
      if (/^055/.test(first10)) return 'Wintel';
    }

    // 2. If it is 10 digits, check standard mobile prefixes
    if (clean.length === 10) {
      if (/^0(86|96|97|98|3[2-9])/.test(clean)) return 'Viettel';
      if (/^0(88|91|94|8[1-5])/.test(clean)) return 'Vinaphone';
      if (/^0(89|90|93|7[06789])/.test(clean)) return 'Mobifone';
      if (/^0(92|5[268])/.test(clean)) return 'Vietnamobile';
      if (/^0(99|59)/.test(clean)) return 'Gmobile';
      if (/^087/.test(clean)) return 'Itelecom (Itel)';
      if (/^055/.test(clean)) return 'Wintel';
    }
  }

  return 'Khác / Không rõ';
}

async function main() {
  try {
    await legacy.$connect();
    
    // Fetch all active user contacts
    console.log("Đang truy vấn dữ liệu số điện thoại khách hàng...");
    const contacts = await legacy.$queryRaw<any[]>`
      SELECT uc.phone_number
      FROM \`user_contact\` uc
      JOIN \`user_profile\` up ON uc.user_id = up.user_id
      WHERE up.is_deleted = 0
        AND up.is_disabled = 0
        AND uc.is_disabled = 0
    `;
    
    console.log(`Tìm thấy ${contacts.length} số điện thoại của khách hàng đang hoạt động.`);
    
    const stats: Record<string, number> = {
      'Viettel': 0,
      'Mobifone': 0,
      'Vinaphone': 0,
      'Vietnamobile': 0,
      'Gmobile': 0,
      'Itelecom (Itel)': 0,
      'Wintel': 0,
      'Khác / Không rõ': 0
    };
    
    const unknownSamples: string[] = [];
    
    for (const c of contacts) {
      const carrier = getCarrier(c.phone_number);
      stats[carrier] = (stats[carrier] || 0) + 1;
      if (carrier === 'Khác / Không rõ') {
        unknownSamples.push(c.phone_number);
      }
    }
    
    const total = contacts.length;
    const validMobileTotal = total - stats['Khác / Không rõ'];

    console.log("\n================ KẾT QUẢ PHÂN TÍCH NHÀ MẠNG =================\n");
    console.log(`Tổng số điện thoại khách hàng đang hoạt động: ${total}`);
    console.log(`Số điện thoại di động hợp lệ: ${validMobileTotal}`);
    console.log(`Số điện thoại không hợp lệ/không rõ/khác (landline, fake, test...): ${stats['Khác / Không rõ']} (${(stats['Khác / Không rõ'] / total * 100).toFixed(2)}%)\n`);

    console.log("1. THỐNG KÊ TRÊN TẤT CẢ DỮ LIỆU SỐ ĐIỆN THOẠI (Bao gồm cả Số khác/Không rõ):");
    console.log("-------------------------------------------------------------");
    console.log("  Nhà mạng             | Số lượng   | Tỷ lệ (%)");
    console.log("-------------------------------------------------------------");
    for (const [carrier, count] of Object.entries(stats)) {
      const percentage = total > 0 ? (count / total * 100).toFixed(2) : '0.00';
      console.log(`  ${carrier.padEnd(20)} | ${count.toString().padStart(10)} | ${percentage}%`);
    }
    console.log("-------------------------------------------------------------");

    console.log("\n2. THỐNG KÊ CHỈ TRÊN CÁC SỐ DI ĐỘNG HỢP LỆ (Loại trừ nhóm Số khác/Không rõ):");
    console.log("-------------------------------------------------------------");
    console.log("  Nhà mạng             | Số lượng   | Tỷ lệ (%)");
    console.log("-------------------------------------------------------------");
    for (const [carrier, count] of Object.entries(stats)) {
      if (carrier === 'Khác / Không rõ') continue;
      const percentage = validMobileTotal > 0 ? (count / validMobileTotal * 100).toFixed(2) : '0.00';
      console.log(`  ${carrier.padEnd(20)} | ${count.toString().padStart(10)} | ${percentage}%`);
    }
    console.log("-------------------------------------------------------------");
    console.log("\n=============================================================");

  } catch (err) {
    console.error("Lỗi khi chạy thống kê:", err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
