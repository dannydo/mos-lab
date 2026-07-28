## 2026-07-28T02:20:28Z

Empirically test and stress-verify `removeVietnameseTones` and `vietnameseSearchFilter` against all user acceptance criteria and edge cases.

Tasks:

1. Write a standalone test script/harness in node/ts-node to execute unit verification of `removeVietnameseTones`:
   - "diep" -> matches "Ngọc Điệp"
   - "hang" -> matches "Hằng Ni"
   - "thuy" -> matches "Thuỳ Trang 🌸"
   - "nhat" -> matches "Nhật"
   - "DONG" -> matches "Đồng Bằng"
   - null, undefined, 0, numbers, strings with emojis, uppercase, leading/trailing whitespace.
2. Test `vietnameseSearchFilter` with option objects:
   - `{ label: 'Ngọc Điệp' }`
   - `{ children: 'Hằng Ni' }`
   - `{ children: ['Thuỳ Trang ', '🌸'] }`
   - `{ value: 123, label: 'Đồng Bằng' }`
3. Document test results and exact assertions in your handoff report.
