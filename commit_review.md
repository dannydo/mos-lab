---
request_feedback: true
---

# Commit review — Academy quiz template for small salon owners

## Danh sách file thay đổi

- `apps/api/src/scripts/data-migrations/20260825142119_seed_academy_small_salon_owner_quiz_template.ts`
- `commit_review.md`

## Tóm tắt thay đổi

- Thêm migration dữ liệu production, tạo một mẫu câu hỏi Academy dùng chung: **Nỗi khổ cô chủ tiệm mi nhỏ**.
- Mẫu gồm 5 câu một đáp án, viết bằng ngôn ngữ đời thường cho nhóm chủ salon nhỏ: tiệm rối khi chủ nghỉ, không rõ lời/lỗ, mất khách cũ, nhân viên thiếu động lực và lo không thể mở thêm tiệm.
- Mỗi câu có 4 lựa chọn; phương án đầu tiên là đáp án đúng. Mẫu ở trạng thái `DRAFT`, không có thưởng và không gắn vào workshop đang chạy.
- Preflight sẽ dừng deployment nếu production đã có template cùng tên, tránh ghi đè nội dung do người khác tạo.

## Commit message đề xuất

```text
feat(academy): seed small salon owner quiz template

- Add a reusable five-question Academy workshop template
- Use plain Vietnamese that surfaces small salon owners' core pains
- Stop safely if the production template already exists

AI-assisted. Reviewed and verified.
```

## Production migration plan

- CRM schema: **None**.
- Production data migration: `20260825142119_seed_academy_small_salon_owner_quiz_template`.
  - Tạo 1 template Academy dùng chung, chưa gắn workshop.
  - Tạo 5 câu hỏi và 20 lựa chọn đáp án; không sửa/xóa dữ liệu hiện có.
  - Preflight kiểm tra template cùng tên. Nếu đã tồn tại, migration fail an toàn trước khi ghi dữ liệu.
- Các migration đã có vẫn chạy qua checksum và được bỏ qua nếu đã áp dụng.

## Verification

- `pnpm --filter @mos-lab/api data-migrations:validate`: passed (2 migrations hợp lệ).
- `pnpm --filter @mos-lab/api lint`: passed.
- `bash scripts/deploy/migration-plan.sh origin/main`: chỉ liệt kê migration dữ liệu mới; không có thay đổi CRM schema.
