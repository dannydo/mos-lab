# Night Shift Report — 2026-08-12

## Kết quả

Mục tiêu `giảm warning xuống 0` đã hoàn thành trên branch `night-shift/2026-08-12`.

| Kiểm tra                                       | Kết quả                                   |
| ---------------------------------------------- | ----------------------------------------- |
| `pnpm lint`                                    | Pass — 0 warnings, 0 errors               |
| `pnpm --filter @mos-lab/api exec tsc --noEmit` | Pass                                      |
| `pnpm build`                                   | Pass — production build của shared và web |

## Những thay đổi chính

- Customers: giảm query trùng lặp và lookup mảng lặp trong response booking.
- KPI/CV: bỏ query và imports không dùng, giữ nguyên công thức CC/FAL.
- Dashboard: ổn định React keys và tránh tính thời gian lặp lại trong từng row.
- API: chuẩn hóa kiểu dữ liệu ở ranh giới Fastify/Prisma, dọn dead code trên catalog, campaigns, CS, allocation, QA, SMS và staff.
- Shared: thay payload `any` bằng `unknown` và sửa serialize giờ Việt Nam sang UTC+7 đúng nghĩa.

## Commits

- `d68004e` — `refactor(customers): remove repeated query and array scans`
- `5660a1f` — `refactor(kpi): remove unused work from speed reports`
- `b8e6074` — `perf(dashboard): stabilize rendering identities`
- `cf792d4` — `fix(shared): type payloads and format Vietnam time`
- `c17ce18` — `chore(api): eliminate workspace lint warnings`

## Merge

```bash
git checkout main
git merge night-shift/2026-08-12
```
