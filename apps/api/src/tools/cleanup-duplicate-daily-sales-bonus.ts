/* eslint-disable no-console -- This is an interactive maintenance CLI whose primary output is its terminal report. */
/**
 * Cleanup Duplicate "Daily Sales Bonus (Combo)" Records
 * ======================================================
 *
 * Script phát hiện và xóa các bản ghi trùng lặp "Daily Sales Bonus (Combo)"
 * trong bảng staff_bonus. Khi có 2+ records cùng ngày cho cùng 1 CC,
 * giữ lại record có ID nhỏ nhất (bản gốc) và xóa các bản còn lại.
 *
 * Usage:
 *   # Dry-run (chỉ kiểm tra, không xóa):
 *   pnpm --filter @mos-lab/api tsx src/tools/cleanup-duplicate-daily-sales-bonus.ts
 *
 *   # Thực thi xóa:
 *   pnpm --filter @mos-lab/api tsx src/tools/cleanup-duplicate-daily-sales-bonus.ts --execute
 *
 *   # Chỉ định tháng cụ thể (mặc định: tháng trước):
 *   pnpm --filter @mos-lab/api tsx src/tools/cleanup-duplicate-daily-sales-bonus.ts --month=2026-07
 *   pnpm --filter @mos-lab/api tsx src/tools/cleanup-duplicate-daily-sales-bonus.ts --month=2026-07 --execute
 */

import { PrismaClient as LegacyClient } from '../generated/legacy-client/index.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const legacy = new LegacyClient();

// ─── CLI Args ────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const monthArg = args.find((a) => a.startsWith('--month='))?.split('=')[1];

function getDateRange(monthStr?: string): { dateFrom: string; dateTo: string; label: string } {
  if (monthStr) {
    // Format: YYYY-MM
    const [year, month] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {
      dateFrom: `${monthStr}-01 00:00:00`,
      dateTo: `${monthStr}-${String(lastDay).padStart(2, '0')} 23:59:59`,
      label: monthStr,
    };
  }
  // Default: previous month
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prev.getFullYear();
  const month = String(prev.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, prev.getMonth() + 1, 0).getDate();
  return {
    dateFrom: `${year}-${month}-01 00:00:00`,
    dateTo: `${year}-${month}-${String(lastDay).padStart(2, '0')} 23:59:59`,
    label: `${year}-${month}`,
  };
}

// ─── Types ───────────────────────────────────────────────────
interface DuplicateGroup {
  user_id: number;
  staff_name: string;
  user_group_id: number;
  bonus_date: Date | string;
  row_count: number;
  bonus_ids: string;
  amounts: string;
}

interface CountRow {
  cnt: number | bigint | string;
}

// ─── Main ────────────────────────────────────────────────────
async function run() {
  const { dateFrom, dateTo, label } = getDateRange(monthArg);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Cleanup Duplicate Daily Sales Bonus (Combo)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Tháng:     ${label}`);
  console.log(`  Khoảng:    ${dateFrom}  →  ${dateTo}`);
  console.log(`  Chế độ:    ${isDryRun ? '🔍 DRY-RUN (chỉ kiểm tra)' : '🗑️  EXECUTE (xóa thật)'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Detect duplicates
  const duplicates = await legacy.$queryRawUnsafe<DuplicateGroup[]>(
    `
    SELECT 
      sb.user_id,
      up.full_name AS staff_name,
      up.user_group_id,
      DATE(sb.date_created) AS bonus_date,
      COUNT(*) AS row_count,
      GROUP_CONCAT(sb.id ORDER BY sb.id) AS bonus_ids,
      GROUP_CONCAT(sb.bonus_amount ORDER BY sb.id) AS amounts
    FROM staff_bonus sb
    JOIN user_profile up ON up.user_id = sb.user_id AND up.client_business_id = sb.client_business_id
    WHERE sb.description = 'Daily Sales Bonus (Combo)'
      AND sb.date_created >= ?
      AND sb.date_created <= ?
      AND sb.bonus_type = 'Cash'
    GROUP BY sb.user_id, DATE(sb.date_created)
    HAVING COUNT(*) > 1
    ORDER BY up.full_name, bonus_date
  `,
    dateFrom,
    dateTo
  );

  if (duplicates.length === 0) {
    console.log('✅ Không tìm thấy bản ghi trùng lặp nào. Tháng này sạch!\n');
    await legacy.$disconnect();
    return;
  }

  // 2. Display duplicates grouped by staff
  const byStaff: Record<string, DuplicateGroup[]> = {};
  const idsToDelete: number[] = [];
  let totalExtraAmount = 0;

  for (const d of duplicates) {
    const key = `${d.staff_name} (ID: ${d.user_id}, group: ${d.user_group_id})`;
    if (!byStaff[key]) byStaff[key] = [];
    byStaff[key].push(d);

    // Collect IDs to delete: keep the first (smallest ID), delete the rest
    const ids = String(d.bonus_ids).split(',').map(Number);
    const amounts = String(d.amounts).split(',').map(Number);
    for (let i = 1; i < ids.length; i++) {
      idsToDelete.push(ids[i]);
      totalExtraAmount += amounts[i];
    }
  }

  for (const [staff, records] of Object.entries(byStaff)) {
    console.log(`👤 ${staff} — ${records.length} ngày bị trùng:`);
    for (const r of records) {
      const ids = String(r.bonus_ids).split(',');
      const amounts = String(r.amounts).split(',').map(Number);
      const dateStr =
        r.bonus_date instanceof Date ? r.bonus_date.toISOString().slice(0, 10) : String(r.bonus_date).slice(0, 10);

      console.log(`  📅 ${dateStr} (${r.row_count} records):`);
      for (let i = 0; i < ids.length; i++) {
        const marker = i === 0 ? '  ✅ GIỮ ' : '  ⚠️ XÓA ';
        console.log(`   ${marker} ID ${ids[i]}: ${amounts[i].toLocaleString('vi-VN')}đ`);
      }
    }
    console.log('');
  }

  console.log('───────────────────────────────────────────────────────────');
  console.log(`  Số nhân viên bị trùng:  ${Object.keys(byStaff).length}`);
  console.log(`  Số ngày bị trùng:       ${duplicates.length}`);
  console.log(`  Số rows cần xóa:        ${idsToDelete.length}`);
  console.log(`  Tổng tiền thừa:         ${totalExtraAmount.toLocaleString('vi-VN')}đ`);
  console.log(`  IDs cần xóa:            [${idsToDelete.join(', ')}]`);
  console.log('───────────────────────────────────────────────────────────\n');

  // 3. Execute deletion if not dry-run
  if (isDryRun) {
    console.log('🔍 DRY-RUN hoàn tất. Để thực thi xóa, chạy lại với flag --execute:\n');
    console.log(
      `   pnpm --filter @mos-lab/api tsx src/tools/cleanup-duplicate-daily-sales-bonus.ts --month=${label} --execute\n`
    );
  } else {
    console.log('🗑️  Đang xóa các bản ghi trùng...\n');

    const placeholders = idsToDelete.map(() => '?').join(',');
    const result = await legacy.$executeRawUnsafe(
      `DELETE FROM staff_bonus WHERE id IN (${placeholders})`,
      ...idsToDelete
    );

    console.log(`✅ Đã xóa ${result} bản ghi trùng lặp thành công!`);
    console.log(`   IDs đã xóa: [${idsToDelete.join(', ')}]\n`);

    // 4. Verify
    const verify = await legacy.$queryRawUnsafe<CountRow[]>(
      `
      SELECT COUNT(*) as cnt
      FROM staff_bonus
      WHERE id IN (${placeholders})
    `,
      ...idsToDelete
    );

    const remaining = Number(verify[0]?.cnt ?? 0);
    if (remaining === 0) {
      console.log('✅ Xác nhận: Tất cả bản ghi trùng đã được xóa sạch.\n');
    } else {
      console.log(`⚠️ Cảnh báo: Còn ${remaining} bản ghi chưa xóa được!\n`);
    }
  }

  await legacy.$disconnect();
}

run().catch((err) => {
  console.error('❌ Lỗi:', err);
  legacy.$disconnect();
  process.exit(1);
});
