import { removeVietnameseTones, vietnameseSearchFilter } from '../../packages/shared/src/utils/search';

function assert(description: string, actual: any, expected: any) {
  if (actual === expected) {
    console.log(`✅ [PASS] ${description}`);
  } else {
    console.error(`❌ [FAIL] ${description}\n   Expected: ${expected}\n   Actual:   ${actual}`);
    process.exitCode = 1;
  }
}

console.log('--- Testing vietnameseSearchFilter Array & React Node Extraction ---');

// Case 1: Standard string label
assert('Filter label string matching', vietnameseSearchFilter('diep', { label: 'Ngọc Điệp' }), true);

// Case 2: Standard children string
assert('Filter children string matching', vietnameseSearchFilter('hang', { children: 'Hằng Ni' }), true);

// Case 3: Array children
assert('Filter array children matching', vietnameseSearchFilter('thuy', { children: ['Thuỳ Trang ', '🌸'] }), true);

// Case 4: Array label
assert('Filter array label matching', vietnameseSearchFilter('dong', { label: ['Đồng ', 'Bằng'] }), true);

// Case 5: Nested React element children (mock node)
const mockReactElement = {
  props: {
    children: ['Thuỳ Trang ', '🌸'],
  },
};
assert('Filter nested React props children', vietnameseSearchFilter('thuy', { children: mockReactElement }), true);

// Case 6: Option with value and label
assert('Filter value and label', vietnameseSearchFilter('106', { value: 106, label: 'Hotline 106' }), true);

// Case 7: Null / undefined option
assert('Null option handling', vietnameseSearchFilter('test', null), false);
assert('Undefined option handling', vietnameseSearchFilter('test', undefined), false);

// Case 8: Empty input handling
assert('Empty input handling', vietnameseSearchFilter('', { label: 'Ngọc Điệp' }), true);

console.log('--- All search filter verification checks completed ---');
