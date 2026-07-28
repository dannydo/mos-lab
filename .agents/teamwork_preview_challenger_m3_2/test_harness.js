const path = require('path');
const sharedPath = path.resolve(__dirname, '../../../packages/shared/dist/index.js');
let removeVietnameseTones, vietnameseSearchFilter;

try {
  const shared = require(sharedPath);
  removeVietnameseTones = shared.removeVietnameseTones;
  vietnameseSearchFilter = shared.vietnameseSearchFilter;
} catch (e) {
  // Inline implementation matching packages/shared/src/utils/search.ts if dist not built
  removeVietnameseTones = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  };
  vietnameseSearchFilter = (input, option) => {
    if (!input) return true;
    const normalizedInput = removeVietnameseTones(input);
    if (!option) return false;
    const opt = option;
    const label =
      typeof opt.label === 'string' || typeof opt.label === 'number'
        ? String(opt.label)
        : typeof opt.children === 'string' || typeof opt.children === 'number'
          ? String(opt.children)
          : typeof opt.value === 'string' || typeof opt.value === 'number'
            ? String(opt.value)
            : '';
    return removeVietnameseTones(label).includes(normalizedInput);
  };
}

console.log('=== EMPIRICAL TONE NORMALIZATION TEST HARNESS ===\n');

const testCases = [
  { query: 'diep', target: 'Ngọc Điệp', entity: 'Staff / Booker / Customer' },
  { query: 'hang', target: 'Hằng Ni', entity: 'Staff / Booker / Customer' },
  { query: 'thuy', target: 'Thuỳ Trang 🌸', entity: 'Staff / Booker / Customer' },
];

console.log('--- 1. Testing @mos-lab/shared removeVietnameseTones & vietnameseSearchFilter ---');
let passCount = 0;
testCases.forEach(({ query, target, entity }) => {
  const normQuery = removeVietnameseTones(query);
  const normTarget = removeVietnameseTones(target);
  const matched = normTarget.includes(normQuery);
  const selectFilterMatched = vietnameseSearchFilter(query, { label: target });

  console.log(`Query: "${query}" | Target: "${target}" (${entity})`);
  console.log(`  - removeVietnameseTones(query): "${normQuery}"`);
  console.log(`  - removeVietnameseTones(target): "${normTarget}"`);
  console.log(`  - Includes match: ${matched}`);
  console.log(`  - Select vietnameseSearchFilter: ${selectFilterMatched}`);

  if (matched && selectFilterMatched) {
    console.log('  -> RESULT: PASS ✅\n');
    passCount++;
  } else {
    console.log('  -> RESULT: FAIL ❌\n');
  }
});

console.log(`Summary: ${passCount}/${testCases.length} core utility tests passed.\n`);

console.log('--- 2. Testing Unnormalized vs Normalized search in specific UI controls ---');

// Simulated AppointmentsAuditDrawer.tsx line 97 (unnormalized)
function unnormalizedSearch(itemClientName, drillSearchText) {
  const query = drillSearchText.toLowerCase();
  return (itemClientName || '').toLowerCase().includes(query);
}

// Simulated AppointmentsAuditDrawer.tsx fixed (normalized)
function normalizedSearch(itemClientName, drillSearchText) {
  const query = removeVietnameseTones(drillSearchText);
  return removeVietnameseTones(itemClientName).includes(query);
}

console.log('Testing AppointmentsAuditDrawer.tsx / referrals page behavior:');
testCases.forEach(({ query, target }) => {
  const unnormRes = unnormalizedSearch(target, query);
  const normRes = normalizedSearch(target, query);
  console.log(`Query: "${query}" vs "${target}":`);
  console.log(`  - Raw .toLowerCase().includes(): ${unnormRes} (${unnormRes ? 'MATCH' : 'MISSED ❌'})`);
  console.log(`  - With removeVietnameseTones(): ${normRes} (${normRes ? 'MATCH ✅' : 'MISSED'})`);
});
