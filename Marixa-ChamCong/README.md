# Marixa Chấm Công — Backend V1

Phần đang chạy theo đặc tả là Next.js App Router trong `web/`, với Supabase Auth, Postgres/RLS và Storage private. Giao diện nghiệp vụ React được để ở giai đoạn sau theo chỉ đạo mới nhất; trang hiện tại chỉ là landing cho backend.

## Môi trường phát triển

- Node.js trực tiếp, PostgreSQL client `psql` trực tiếp.
- Không dùng Docker, Dockerfile, docker-compose hoặc Supabase local stack.
- Kết nối một Supabase project hosted riêng cho dev; không dùng dữ liệu nhân viên thật ở preview.
- Migration ở `supabase/migrations/`, thứ tự từ `202610090001` đến `202610090011`.
- Đặt `MARIXA_DATABASE_URL` trong shell hiện tại rồi chạy `./scripts/apply-migrations.ps1`. Script áp dụng từng migration trong transaction, ghi checksum và từ chối sửa migration đã chạy.
- Tạo Auth user và hồ sơ nhân viên admin, sau đó chạy `supabase/bootstrap-admin.sql` bằng `psql -v auth_user_id=... -v employee_id=...`.
- App secrets nằm trong `web/.env.local` hoặc Vercel server environment. Tuyệt đối không đặt service-role key trong bundle client.

## API hiện có

- Hồ sơ/công/đơn cá nhân: `GET /api/v1/me`, `GET /api/v1/me/attendance`, `GET /api/v1/me/requests`.
- Chấm công: `POST /api/v1/attendance/events`, upload/đọc signed ảnh qua `/api/v1/attendance/events/:id/photo`.
- Đơn: `POST /api/v1/leave-requests`, `/api/v1/overtime-requests`, `/api/v1/attendance/corrections`; quyết định/hủy qua `/api/v1/requests/:type/:id/{decision|cancel}`.
- Quản lý tài khoản, cấu hình, nhân viên, HR dashboard, bảng công, export và cron có route riêng dưới `/api/v1/admin/`, `/api/v1/hr/`, `/api/v1/reports/` và `/api/cron/`.
- HR: dashboard, danh sách nhân viên và chấm công, hàng đợi duyệt.
- Admin: cấp/khóa/reset tài khoản, vị trí, giờ làm, lịch nghỉ, loại nghỉ và sổ phép.
- Kỳ công: tạo/tính snapshot, ghi chú ngoại lệ, HR đối soát, admin khóa/mở lại.
- Báo cáo: Excel từ snapshot và PDF đơn nghỉ theo phiên bản hiện tại.
- Cron: dọn ảnh hết retention, có thể admin chạy lại thủ công.

## Đã kiểm tra

- `npm run typecheck`: đạt.
- `npm run build`: đạt với Next.js 16.4.0.
- `npm audit --audit-level=moderate`: 0 lỗ hổng đã biết sau override dependency.
- Chưa áp dụng migration lên Supabase, chưa có credential/project dev, chưa chạy smoke test RLS/API hoặc restore; không có production deployment.

## Chưa sẵn sàng dùng dữ liệu thật

Chưa có UI đăng nhập/đổi mật khẩu, trải nghiệm chấm công và hàng đợi IndexedDB offline; chưa thử trên điện thoại. Chưa áp dụng hoặc kiểm chứng SQL migration bằng PostgreSQL server. Cần cấu hình đầy đủ office, policy, lịch nghỉ, số phép, retention; hoàn tất smoke test quyền, upload ảnh, duyệt, kỳ công, export, retention và backup/restore. Rủi ro điều kiện thương mại của Vercel Hobby đã ghi ở đặc tả triển khai và vẫn cần được xử lý trước khi vận hành công ty.

Backend .NET cũ, dữ liệu mẫu và ảnh cũ vẫn được giữ để đối chiếu/chuyển đổi; không thuộc đường chạy mới. Không xóa cho tới khi xác nhận dữ liệu cần di chuyển hoặc lưu trữ.
