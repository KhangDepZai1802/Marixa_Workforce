# Marixa Chấm Công — Backend V1

Phần đang triển khai là Next.js App Router trong `web/`, với Supabase Auth, Postgres/RLS và Storage private. Hiện chưa có giao diện nghiệp vụ; trang gốc vẫn là landing cho backend. Khi cấu hình Vercel, đặt Root Directory là `Marixa-ChamCong/web`.

## Môi trường phát triển

- Node.js trực tiếp, PostgreSQL client `psql` trực tiếp.
- Không dùng Docker, Dockerfile, docker-compose hoặc Supabase local stack.
- Kết nối một Supabase project hosted riêng cho dev; không dùng dữ liệu nhân viên thật ở preview.
- Migration ở `supabase/migrations/`, chạy theo thứ tự tên file. Migration `202610090012` bổ sung GPS/ảnh tùy chọn, cấp phép tháng idempotent và điều chỉnh cho chấm offline đến sau khi kỳ gốc khóa.
- Đặt `MARIXA_DATABASE_URL` trong shell hiện tại rồi chạy `./scripts/apply-migrations.ps1`. Script áp dụng từng migration trong transaction, ghi checksum và từ chối sửa migration đã chạy.
- Tạo Auth user và hồ sơ nhân viên admin, sau đó chạy `supabase/bootstrap-admin.sql` bằng `psql -v auth_user_id=... -v employee_id=...`.
- App secrets nằm trong `web/.env.local` hoặc Vercel server environment. Dùng `SUPABASE_SECRET_KEY` chỉ ở server; tuyệt đối không đưa secret key vào bundle client.

## API hiện có

- Hồ sơ/công/đơn cá nhân: `GET /api/v1/me`, `GET /api/v1/me/attendance`, `GET /api/v1/me/requests`.
- Chấm công: `POST /api/v1/attendance/events` nhận GPS tùy chọn và trạng thái ảnh dự kiến; upload/đọc signed ảnh WebP/JPEG/PNG qua `/api/v1/attendance/events/:id/photo`.
- Đơn: `POST /api/v1/leave-requests`, `/api/v1/overtime-requests`, `/api/v1/attendance/corrections`; quyết định/hủy qua `/api/v1/requests/:type/:id/{decision|cancel}`.
- Quản lý tài khoản, cấu hình, nhân viên, HR dashboard, bảng công, export và cron có route riêng dưới `/api/v1/admin/`, `/api/v1/hr/`, `/api/v1/reports/` và `/api/cron/`.
- HR: dashboard, danh sách nhân viên và chấm công, hàng đợi duyệt; `GET/POST /api/v1/hr/timesheet-adjustments` để đối soát đồng bộ muộn sau kỳ khóa.
- Admin: cấp/khóa/reset tài khoản, vị trí, giờ làm, lịch nghỉ, loại nghỉ và sổ phép.
- Kỳ công: tạo/tính snapshot, ghi chú ngoại lệ, HR đối soát, admin khóa/mở lại.
- Báo cáo: Excel từ snapshot và PDF đơn nghỉ theo phiên bản hiện tại.
- Cron hằng ngày: dọn ảnh hết retention và cấp bù phép năm theo tháng theo cách idempotent; admin có thể chạy lại thủ công.

## Đã kiểm tra

- `npm run typecheck`: đạt.
- `npm run build`: đạt với Next.js 16.4.0.
- `npm test`: 6 kiểm thử đơn vị tính công đạt.
- `npm audit --audit-level=moderate`: 0 lỗ hổng đã biết sau override dependency.
- Chưa áp dụng migration lên Supabase, chưa có credential/project dev, chưa chạy smoke test RLS/API hoặc restore; không có production deployment.

## Chưa sẵn sàng dùng dữ liệu thật

Chưa có UI đăng nhập/đổi mật khẩu, trải nghiệm chấm công và hàng đợi IndexedDB offline; chưa thử trên điện thoại. Migration mới chưa áp dụng hoặc kiểm chứng trên PostgreSQL/Supabase test. Cần cấu hình đầy đủ office, policy, lịch nghỉ, retention; hoàn tất smoke test quyền/RLS, upload ảnh, duyệt, điều chỉnh kỳ sau, export, retention và backup/restore. Rủi ro điều kiện thương mại của Vercel Hobby đã ghi trong tài liệu triển khai và cần được xem lại nếu mục đích sử dụng chuyển sang thương mại.

Backend .NET cũ, dữ liệu mẫu và ảnh cũ vẫn được giữ để đối chiếu/chuyển đổi; không thuộc đường chạy mới. Không xóa cho tới khi xác nhận dữ liệu cần di chuyển hoặc lưu trữ.
