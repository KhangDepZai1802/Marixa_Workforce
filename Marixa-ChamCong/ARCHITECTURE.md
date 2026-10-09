# Kiến trúc Marixa Workforce V1

## Nền tảng hoạt động

- Next.js App Router + TypeScript trong `web/`; route handlers cung cấp API `/api/v1` và phục vụ UI tiếng Việt sẽ được bổ sung sau.
- Supabase Auth quản lý email/mật khẩu. Hồ sơ `employees` độc lập với `app_users`; một partial unique index cùng trigger đảm bảo luôn có tối đa một và không thể vô hiệu hóa admin hoạt động cuối cùng.
- Supabase Postgres lưu dữ liệu nghiệp vụ. RLS giới hạn hồ sơ/dữ liệu theo người dùng và vai trò. Ghi công, duyệt, sổ phép và kỳ công khóa đi qua RPC giao dịch; service-role chỉ được import ở server.
- Supabase Storage dùng bucket `attendance-photos` private. Ảnh được tải theo quyền chủ sở hữu, đường dẫn không chứa tên, link xem có thời hạn 60 giây.
- Tác vụ dọn ảnh chạy hằng ngày qua Vercel Cron, được bảo vệ bằng `CRON_SECRET`.

## Dữ liệu và bảo toàn lịch sử

Migration SQL được quản lý theo thứ tự trong `supabase/migrations/` và áp dụng bằng `psql` trực tiếp đến Supabase hosted. Thời điểm lưu UTC; `work_date` và giờ nghiệp vụ tính theo `Asia/Ho_Chi_Minh`. Event chấm công gốc bất biến; ảnh và kết quả kiểm tra lưu metadata riêng. Chỉnh công và phép dùng record/giao dịch riêng. Snapshot kỳ công có phiên bản, chỉ HR đánh dấu đã kiểm tra sau khi ghi chú hết ngoại lệ; admin khóa và mở lại có lý do.

Mọi request nghiệp vụ có quyền ở cả API và database. Route không tin role từ client. RLS chặn đọc/sửa trái phép kể cả khi client dùng publishable key. Các hàm `SECURITY DEFINER` kiểm tra `auth.uid()`, vai trò, trạng thái tài khoản, quyền tự duyệt và khóa hàng liên quan trước khi thay đổi. Timestamp và lượt chấm gốc không bị sửa; metadata ảnh/trạng thái kiểm tra có thể đổi theo luồng được kiểm soát.

## Phạm vi đã dựng

- Auth server session, hồ sơ hiện tại, đổi mật khẩu tạm.
- API chấm công online/offline idempotent; GPS và ảnh riêng tư đều tùy chọn, hỗ trợ PNG/JPEG/WebP khi có ảnh.
- Tạo/yêu cầu/duyệt/hủy nghỉ, phép năm, tăng ca và sửa công.
- Nhân viên, cấp/khóa tài khoản, reset mật khẩu, cấu hình văn phòng/giờ/lịch nghỉ/loại nghỉ.
- Dashboard HR, danh sách chấm công và yêu cầu chờ.
- Tính snapshot ngày công theo giây, tăng ca tự động ngày nghỉ, ghi chú ngoại lệ, khóa/mở lại admin, Excel và PDF.
- Cấp phép năm hằng tháng idempotent; chấm offline tới sau kỳ khóa đi vào điều chỉnh riêng ở kỳ mở sau, có HR review và cột riêng trong Excel.
- Dọn ảnh hết hạn trong cùng tác vụ cron hằng ngày.

Phần UI nghiệp vụ, IndexedDB queue và kiểm thử tích hợp/e2e chưa được xây dựng; các API/backend chưa đủ để mở cho người dùng thật.

## Triển khai

Vercel phục vụ ứng dụng Next.js từ `Marixa-ChamCong/web`; Supabase cung cấp Auth, Postgres và Storage. Dùng project Supabase hosted riêng cho thử nghiệm, không dùng Docker hoặc local Supabase stack. Cấu hình `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL` và `CRON_SECRET` ở môi trường server phù hợp; secret key không bao giờ có tiền tố `NEXT_PUBLIC_`.

Chính sách giờ, văn phòng, ngày nghỉ, số phép và thời hạn lưu ảnh phải được admin nhập trước khi mở chấm công. Backup database và object Storage là quy trình riêng; cần hoàn tất và thử restore trước khi dùng dữ liệu nhân viên thật. Xem `README.md` để biết giới hạn triển khai còn lại và rủi ro gói Vercel Hobby trong tài liệu đặc tả.

## Chuyển đổi từ backend cũ

Các thư mục `M.*`, solution .NET, dữ liệu mẫu và ảnh cũ được giữ lại làm nguồn đối chiếu/chuyển đổi; chúng không thuộc đường chạy hoặc triển khai V1 mới. Không nạp dữ liệu mẫu hay ảnh cũ vào Supabase trước khi có quy tắc chuyển đổi và kiểm tra quyền riêng tư.
