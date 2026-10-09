# Quy tắc làm việc với tài liệu dự án

- Mọi AI/agent làm việc trong repository này phải xem các file Markdown dưới `docs/` là tài liệu chỉ đọc, **ngoại trừ `docs/worklog.md`**.
- Không sửa nội dung, ghi đè, tạo lại, đổi tên, di chuyển hoặc xóa bất kỳ file `*.md` nào dưới `docs/` ngoài `docs/worklog.md`. Quy tắc này áp dụng cho cả thao tác tự động, chỉnh sửa trực tiếp và các lệnh sinh mã/tài liệu.
- Trong thư mục `docs/`, chỉ ghi tiến độ, phát hiện mới và điểm khác biệt so với đặc tả vào `docs/worklog.md`. Checklist triển khai nằm ở `plan.md` tại thư mục gốc và được đánh dấu khi có bằng chứng. Nếu một đặc tả cần thay đổi, ghi đề xuất vào worklog; không tự sửa file đặc tả.
- Trước khi triển khai, đọc `plan.md` và các quyết định mới trong `docs/worklog.md`. Khi chúng khác bộ đặc tả `docs/01`–`07`, áp dụng quyết định mới của người dùng được ghi trong `plan.md`/worklog.
- Trước khi hoàn tất công việc, kiểm tra diff để xác nhận không có file Markdown bị bảo vệ nào thay đổi.
