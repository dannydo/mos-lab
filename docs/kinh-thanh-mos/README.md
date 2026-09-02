# Kinh Thánh mOS

Kinh Thánh mOS là thư viện quy chuẩn vận hành dành cho cả nhân viên và AI. Tên gọi vui, nhưng mỗi nội dung phải truy nguyên được về code, ticket, quyết định sản phẩm hoặc dữ liệu kiểm chứng.

## Ngôn ngữ của Kinh

- **Kinh Thánh mOS**: toàn bộ thư viện.
- **Quyển**: một miền nghiệp vụ như Đặt Lịch, Chuối & Thưởng hay Chăm Khách.
- **Điều răn**: một định nghĩa hoặc ràng buộc nghiệp vụ có thể kiểm chứng.
- **Chú giải**: lý do tồn tại và cách hiểu đúng Điều răn.
- **Dụ ngôn thực tế**: ví dụ đầu vào và kết quả mong đợi.
- **Ngoại lệ được ban phép**: trường hợp lệch khỏi mặc định đã được phê duyệt.
- **Công đồng sản phẩm**: lần quyết định sửa, thay thế hoặc cho một Điều răn hồi hưu.
- **Bia đá & nguồn kiểm chứng**: đường dẫn code, rule, ticket hoặc commit đang thi hành Điều răn.

## Nguồn dữ liệu chuẩn

Registry có kiểu dữ liệu nằm tại:

```text
packages/shared/src/types/mos-bible.ts
packages/shared/src/business-rules/mos-bible.ts
```

Dashboard đọc trực tiếp registry này để mở Kinh từ header và tự lọc theo `routeScopes` của trang hiện tại. Không tạo một bản sao nội dung riêng trong component frontend.

Code/service vẫn là nguồn thi hành. Registry là nguồn diễn giải cho con người và AI; một thay đổi nghiệp vụ chỉ hoàn tất khi hai lớp khớp nhau.

## Nghi thức sửa Kinh

1. Xác định service/model/helper đang sở hữu logic thi hành.
2. Sửa code và kiểm thử hành vi nghiệp vụ.
3. Tạo hoặc cập nhật Điều răn trong cùng commit.
4. Tăng `version`, ghi `effectiveFrom`, cập nhật `routeScopes`, ví dụ, ngoại lệ và nguồn.
5. Nếu quy tắc không còn hiệu lực, giữ lại bản ghi với `REVISED` hoặc `RETIRED`; không xóa lịch sử âm thầm.
6. Mở Kinh trên các trang được khai báo để kiểm tra gợi ý theo ngữ cảnh trên desktop và mobile.

## Mẫu một Điều răn

```ts
{
  id: 'BK-003',
  book: 'BOOKING',
  title: 'Tên dễ nhớ bằng tiếng Việt',
  summary: 'Một câu nói rõ định nghĩa hoặc kết quả.',
  commandments: ['Điều bắt buộc thứ nhất.', 'Điều bắt buộc thứ hai.'],
  rationale: 'Vì sao nghiệp vụ cần quy tắc này.',
  examples: ['Một tình huống cụ thể và kết quả đúng.'],
  exceptions: ['Ngoại lệ đã được phê duyệt, nếu có.'],
  tags: ['từ khóa người dùng thường tìm'],
  routeScopes: ['/dashboard/bk'],
  status: 'ACTIVE',
  version: '1.0.0',
  effectiveFrom: 'YYYY-MM-DD',
  sources: [{ label: 'Nguồn thi hành', reference: 'apps/api/src/...' }],
}
```

## Nguyên tắc biên tập

- Viết để nhân viên hiểu mà không cần đọc SQL; vẫn giữ tên field/trạng thái quan trọng để AI truy vết được.
- Một Điều răn nên trả lời một cụm câu hỏi liên quan, không gom nhiều miền nghiệp vụ rời rạc.
- Tìm kiếm phải dùng từ người thật hay nói, kể cả tiếng Việt và thuật ngữ Wings/mOS.
- Không đưa password, token, dữ liệu khách hàng hay bí mật môi trường vào registry.
- Quy tắc chỉ dành cho kỹ thuật hoặc quy trình deploy tiếp tục ở `AGENTS.md`; chỉ định nghĩa vận hành có ích cho người dùng mới vào Kinh.
