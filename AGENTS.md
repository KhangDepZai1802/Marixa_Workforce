# Quy tắc làm việc với tài liệu dự án

- **Riêng Codex được toàn quyền tạo, chỉnh sửa, ghi đè, đổi tên, di chuyển và xóa mọi file `*.md` trong repository**, kể cả các file dưới `docs/`. Đây là ngoại lệ do chủ dự án cấp ngày 10/10/2026 và ưu tiên hơn các quy tắc bảo vệ Markdown bên dưới.
- Các AI/agent khác Codex phải xem file Markdown dưới `docs/` là tài liệu chỉ đọc, **ngoại trừ `docs/worklog.md`**. Không sửa nội dung, ghi đè, tạo lại, đổi tên, di chuyển hoặc xóa file `*.md` được bảo vệ bằng bất kỳ cách nào, kể cả lệnh sinh mã/tài liệu.
- Checklist triển khai nằm ở `docs/plan.md`; Codex đánh dấu khi có bằng chứng đã làm và kiểm chứng. Tiến độ, phát hiện mới và điểm khác biệt so với đặc tả được ghi vào `docs/worklog.md`. Agent khác Codex không tự sửa file đặc tả hoặc checklist được bảo vệ; ghi đề xuất vào worklog.
- Trước khi triển khai, đọc `docs/plan.md` và các quyết định mới trong `docs/worklog.md`. Khi chúng khác bộ đặc tả `docs/01`–`07`, áp dụng quyết định mới của người dùng được ghi trong plan/worklog.
- Trước khi hoàn tất công việc, kiểm tra diff: agent khác Codex xác nhận không có file Markdown được bảo vệ nào thay đổi; Codex xác nhận mọi thay đổi Markdown là có chủ đích và có bằng chứng phù hợp.
