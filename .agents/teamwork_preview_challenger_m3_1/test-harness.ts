import { removeVietnameseTones, vietnameseSearchFilter } from '../../packages/shared/src/utils/search';

interface TestCaseResult {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  expected: any;
  actual: any;
  details?: string;
}

const results: TestCaseResult[] = [];
let idCounter = 1;

function assertEqual(category: string, name: string, actual: any, expected: any, details?: string) {
  const passed = actual === expected;
  results.push({
    id: idCounter++,
    category,
    name,
    passed,
    expected,
    actual,
    details,
  });
}

console.log('====================================================');
console.log('   EMPIRICAL VERIFICATION HARNESS - SEARCH UTILS    ');
console.log('====================================================\n');

// ----------------------------------------------------
// TASK 1: removeVietnameseTones Unit & Edge Tests
// ----------------------------------------------------

console.log('--- TASK 1: removeVietnameseTones ---');

// AC 1.1: "diep" -> matches "Ngọc Điệp"
const res1_1_str = removeVietnameseTones('Ngọc Điệp');
const res1_1_query = removeVietnameseTones('diep');
assertEqual(
  'Task 1 - Matching',
  '"diep" matching "Ngọc Điệp"',
  res1_1_str.includes(res1_1_query),
  true,
  `str: "${res1_1_str}", query: "${res1_1_query}"`
);

// AC 1.2: "hang" -> matches "Hằng Ni"
const res1_2_str = removeVietnameseTones('Hằng Ni');
const res1_2_query = removeVietnameseTones('hang');
assertEqual(
  'Task 1 - Matching',
  '"hang" matching "Hằng Ni"',
  res1_2_str.includes(res1_2_query),
  true,
  `str: "${res1_2_str}", query: "${res1_2_query}"`
);

// AC 1.3: "thuy" -> matches "Thuỳ Trang 🌸"
const res1_3_str = removeVietnameseTones('Thuỳ Trang 🌸');
const res1_3_query = removeVietnameseTones('thuy');
assertEqual(
  'Task 1 - Matching',
  '"thuy" matching "Thuỳ Trang 🌸"',
  res1_3_str.includes(res1_3_query),
  true,
  `str: "${res1_3_str}", query: "${res1_3_query}"`
);

// AC 1.4: "nhat" -> matches "Nhật"
const res1_4_str = removeVietnameseTones('Nhật');
const res1_4_query = removeVietnameseTones('nhat');
assertEqual(
  'Task 1 - Matching',
  '"nhat" matching "Nhật"',
  res1_4_str.includes(res1_4_query),
  true,
  `str: "${res1_4_str}", query: "${res1_4_query}"`
);

// AC 1.5: "DONG" -> matches "Đồng Bằng"
const res1_5_str = removeVietnameseTones('Đồng Bằng');
const res1_5_query = removeVietnameseTones('DONG');
assertEqual(
  'Task 1 - Matching',
  '"DONG" matching "Đồng Bằng"',
  res1_5_str.includes(res1_5_query),
  true,
  `str: "${res1_5_str}", query: "${res1_5_query}"`
);

// Edge Cases: null, undefined, 0, numbers, strings with emojis, uppercase, leading/trailing whitespace
assertEqual('Task 1 - Edge', 'null input', removeVietnameseTones(null as any), '');
assertEqual('Task 1 - Edge', 'undefined input', removeVietnameseTones(undefined as any), '');
assertEqual('Task 1 - Edge', '0 (number)', removeVietnameseTones(0 as any), '0');
assertEqual('Task 1 - Edge', '12345 (number)', removeVietnameseTones(12345 as any), '12345');
assertEqual(
  'Task 1 - Edge',
  'strings with emojis ("Thuỳ Trang 🌸")',
  removeVietnameseTones('Thuỳ Trang 🌸'),
  'thuy trang 🌸'
);
assertEqual('Task 1 - Edge', 'uppercase ("ĐỒNG BẰNG")', removeVietnameseTones('ĐỒNG BẰNG'), 'dong bang');
assertEqual(
  'Task 1 - Edge',
  'leading/trailing whitespace ("  Hằng Ni  ")',
  removeVietnameseTones('  Hằng Ni  '),
  'hang ni'
);

// ----------------------------------------------------
// TASK 2: vietnameseSearchFilter Option Objects Tests
// ----------------------------------------------------

console.log('\n--- TASK 2: vietnameseSearchFilter Option Objects ---');

// AC 2.1: { label: 'Ngọc Điệp' } with input "diep"
const filterOpt1 = { label: 'Ngọc Điệp' };
assertEqual(
  'Task 2 - Filter',
  'Filter { label: "Ngọc Điệp" } with "diep"',
  vietnameseSearchFilter('diep', filterOpt1),
  true
);

// AC 2.2: { children: 'Hằng Ni' } with input "hang"
const filterOpt2 = { children: 'Hằng Ni' };
assertEqual(
  'Task 2 - Filter',
  'Filter { children: "Hằng Ni" } with "hang"',
  vietnameseSearchFilter('hang', filterOpt2),
  true
);

// AC 2.3: { children: ['Thuỳ Trang ', '🌸'] } with input "thuy"
const filterOpt3 = { children: ['Thuỳ Trang ', '🌸'] };
assertEqual(
  'Task 2 - Filter',
  'Filter { children: ["Thuỳ Trang ", "🌸"] } with "thuy"',
  vietnameseSearchFilter('thuy', filterOpt3),
  true,
  'Array children fail string type check'
);

// AC 2.4: { value: 123, label: 'Đồng Bằng' } with input "DONG"
const filterOpt4 = { value: 123, label: 'Đồng Bằng' };
assertEqual(
  'Task 2 - Filter',
  'Filter { value: 123, label: "Đồng Bằng" } with "DONG"',
  vietnameseSearchFilter('DONG', filterOpt4),
  true
);

// Extended Option Tests
assertEqual('Task 2 - Extended', 'Filter with null option', vietnameseSearchFilter('test', null), false);
assertEqual('Task 2 - Extended', 'Filter with undefined option', vietnameseSearchFilter('test', undefined), false);
assertEqual('Task 2 - Extended', 'Filter with empty string input', vietnameseSearchFilter('', filterOpt1), true);
assertEqual(
  'Task 2 - Extended',
  'Filter { value: 123 } without label/children with input "123"',
  vietnameseSearchFilter('123', { value: 123 }),
  true
);

// Array Label / Children Stress Tests
const filterOptArrayLabel = { label: ['Đồng ', 'Bằng'] };
assertEqual(
  'Task 2 - Stress',
  'Filter { label: ["Đồng ", "Bằng"] } with "dong"',
  vietnameseSearchFilter('dong', filterOptArrayLabel),
  true,
  'Array label fails string type check'
);

const filterOptNestedReact = { children: [{ props: { children: 'Thuỳ Trang' } }] };
assertEqual(
  'Task 2 - Stress',
  'Filter React Node children',
  vietnameseSearchFilter('thuy', filterOptNestedReact),
  true,
  'React element children fail type check'
);

// Summary Output
console.log('\n====================================================');
console.log('                 SUMMARY RESULTS                    ');
console.log('====================================================');

let passedCount = 0;
let failedCount = 0;

results.forEach((r) => {
  const status = r.passed ? '✅ PASS' : '❌ FAIL';
  if (r.passed) passedCount++;
  else failedCount++;
  console.log(`[${r.id}] [${r.category}] ${r.name}`);
  console.log(`    Status:   ${status}`);
  console.log(`    Expected: ${JSON.stringify(r.expected)}`);
  console.log(`    Actual:   ${JSON.stringify(r.actual)}`);
  if (r.details) {
    console.log(`    Details:  ${r.details}`);
  }
  console.log('');
});

console.log('----------------------------------------------------');
console.log(`TOTAL TESTS RUN: ${results.length}`);
console.log(`PASSED:          ${passedCount}`);
console.log(`FAILED:          ${failedCount}`);
console.log('----------------------------------------------------');
