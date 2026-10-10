# Vận hành, backup và restore Marixa

Cập nhật 10/10/2026. Nguồn nghiệp vụ là `plan.md` cùng quyết định mới trong worklog. Mọi script chạy từ `react/`; không dùng Docker. Người vận hành: chủ dự án/admin; HR đối soát công và queue cùng nhân viên.

## 1. Theo dõi mỗi ngày/tuần

- Admin mở `/admin`: dung lượng PostgreSQL, Storage, ảnh pending/failed, đồng bộ cần HR xem, ảnh hết hạn và 10 lần bảo trì gần nhất. Ngưỡng cảnh báo 70%, 85%, 95%; đối chiếu **Supabase Dashboard → Usage**, vì số Storage của ứng dụng là tổng metadata object trong project, không gồm egress hay mọi chỉ tiêu thanh toán. Hạn mức đối chiếu hiện hành: Free 500 MB DB, 1 GB Storage. [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase).
- Queue chưa gửi chỉ tồn tại trên thiết bị: nhân viên xem `/today`, giữ dữ liệu trình duyệt, báo HR nếu “cần xử lý”. Server không thể đếm những event chưa từng nhận. Không coi việc server thiếu queue là bằng chứng thiết bị đã đồng bộ.
- Vercel Logs: lọc mã yêu cầu và mã lỗi HTTP; tác vụ bảo trì ghi `request_id`, `status`, số ảnh/số phép. Không log mật khẩu, ảnh hoặc GPS. Log Hobby có thời gian lưu ngắn nên lưu bằng chứng sự cố đã loại dữ liệu nhạy cảm ngay khi xử lý.
- Job quá 48 giờ chưa có lần thành công, status failed hoặc running kéo dài: xem log, kiểm tra Auth/Storage/DB, dùng nút chạy lại. Event/snapshot không bị xóa khi ảnh hết hạn. Metadata ảnh và audit vẫn giữ.
- Ảnh mới hết hạn sau **3 tháng lịch từ lúc đăng ký upload**. Ảnh cũ giữ expires_at đã ghi; không âm thầm đổi lịch sử. Cột legacy `photo_retention_days=90` còn để tương thích schema, giao diện mới không cho đặt thời hạn khác quyết định 3 tháng.
- Trước vận hành thật: admin nhập lịch nghỉ/làm bù, ngày vào làm để cộng phép tháng, tọa độ/bán kính nếu muốn nhãn GPS, số dư phép lịch sử có lý do. Không đặt dữ liệu thật thay bằng fixture.

## 2. Khi Supabase Free bị tạm dừng hoặc chạm hạn mức

Kiểm tra Dashboard của đúng project. Nếu trạng thái Paused và còn nút khôi phục, chọn Restore/Resume, đợi project Active rồi kiểm tra login, DB, Storage và đồng bộ lại queue. Nếu hết cửa sổ khôi phục của nhà cung cấp, tải backup khả dụng và dùng quy trình phục hồi được kiểm chứng; không giả định project luôn phục hồi vô thời hạn. Đối chiếu thông báo cụ thể trong Dashboard và [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

Khi gần đầy: kiểm tra ảnh hết hạn, chạy lại retention, kiểm tra object mồ côi có bằng chứng trước khi xóa. Không xóa event, ledger, snapshot hay audit để giảm dung lượng. Nếu đã chạm giới hạn ghi, giữ queue thiết bị, thông báo HR, khắc phục dịch vụ rồi đối soát; không bấm chấm thêm nhiều lần để thay cho retry cùng khóa.

## 3. Tạo backup mã hóa

Free cần bản sao do người vận hành quản lý. Database backup không chứa bytes của object Storage; script của dự án sao lưu cả phần này riêng. [Supabase Backups](https://supabase.com/docs/guides/platform/backups).

1. Cài `psql`, `pg_dump`, `pg_restore` trực tiếp; phiên bản client không thấp hơn major PostgreSQL server. Đã thử bằng PostgreSQL client 18. Không dùng `supabase db dump` vì quy trình dự án không dùng container.
2. Chọn thời điểm ít ghi dữ liệu, tránh chạy retention cùng lúc sao lưu ảnh. Chạy ít nhất hằng tuần, trước migration và trước khóa/chuyển môi trường quan trọng. Ghi thời điểm bắt đầu/kết thúc.
3. Tạo `.env.backup.local` được Git ignore trên máy quản trị. Sao chép URL/secret key của đúng project, thêm `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_HOST` nếu host khác, và `BACKUP_PASSPHRASE` ngẫu nhiên ít nhất 20 ký tự. Với test có thể dùng `SUPABASE_TEST_DB_PASSWORD` sẵn có. Password manager giữ passphrase riêng khỏi file backup; không đặt chung hai thứ trên nơi lưu ngoài.
4. Chạy (đổi tên file theo ngày thực tế, script từ chối ghi đè):

   ```powershell
   node supabase/backup.mjs .env.backup.local .backups/marixa-2026-10-10.marixa-backup
   ```

5. Script dùng `pg_dump --format=custom --schema=public --no-owner` với exported snapshot PostgreSQL, cùng transaction read-only để đếm/hash dữ liệu. Nó tải ảnh còn hạn chưa deleted, lưu MIME/path/SHA-256; lưu ánh xạ app account ↔ Auth UUID/email, không lưu mật khẩu Auth. Đóng gói được mã hóa **AES-256-GCM**, khóa từ passphrase bằng scrypt, salt/IV ngẫu nhiên. Nếu thiếu ảnh đang còn hạn, toàn bộ backup thất bại để người vận hành kiểm tra; không báo thành công giả.
6. Sau “PASS encrypted backup”, chép file `.marixa-backup` tới ổ/đích sao lưu riêng được quản lý ngoài Supabase. Bản trong `.backups/` chỉ là bản local; không được coi việc tạo local là đã lưu ngoài máy. Ghi SHA-256 bằng `Get-FileHash -Algorithm SHA256 <file>` và đối chiếu sau khi chép. Không chép file env có passphrase cùng backup.
7. Giữ lịch lưu bản sao theo chính sách dữ liệu được chủ dự án phê duyệt; ảnh đã hết hạn không được phục hồi lại thành ảnh đang còn hạn. Không kéo dài retention bằng cách restore.

Giới hạn: DB snapshot nhất quán, nhưng Storage không có cùng transaction với PostgreSQL. Cần khung bảo trì ít ghi/xóa ảnh. Script hiện gom package trong RAM và giới hạn stdout dump 256 MB, phù hợp quy mô nhỏ hiện tại; khi lớn hơn phải chuyển sang archive/stream theo file, không tắt giới hạn rồi coi đã an toàn.

## 4. Diễn tập phục hồi dữ liệu giả trên test

1. Dùng backup xuất từ **project test**, giữ `.env.backup.local` trỏ test và passphrase đúng. Production backup không được script diễn tập tự động này chấp nhận.
2. Chạy:

   ```powershell
   node supabase/restore-drill.mjs .env.backup.local .backups/marixa-2026-10-10.marixa-backup
   ```

3. Script chỉ kết nối `pkpwcpatuslfjyoivbuf`. Nó phục hồi `public` vào schema tạm `restore_<random>` không expose qua Data API, bucket private `restore-<random>`, không ghi đè public hoặc bucket ảnh đang chạy.
4. `pg_restore` xuất SQL; `psql -v ON_ERROR_STOP=1 --single-transaction` nhập schema tạm. Default ACL của managed roles Supabase bị bỏ qua vì postgres project không có quyền thay chúng; grants trên bảng/hàm, policy và RLS của ứng dụng được giữ. Không dùng lựa chọn bỏ toàn bộ quyền rồi nghiệm thu RLS giả.
5. Đối chiếu count + digest nội dung **mọi bảng**, bao gồm event, leave ledger, ảnh metadata, điều chỉnh, snapshot và migration history; tải lại bytes ảnh kiểm SHA-256. Kiểm tra RLS theo tài khoản nhân viên/HR/admin. Tạo một Auth user giả mới, ghép lại đúng app account ở schema tạm, kiểm tra chặn trước đổi mật khẩu và không đọc được dữ liệu người khác sau khi mở quyền.
6. Script xóa đúng schema/bucket/Auth thử trong finally. Nếu dọn lỗi, lưu ID trong thông báo/nhật ký, kiểm tra tài nguyên có đúng tiền tố và là của lượt thử này rồi dọn; không xóa bucket/schema ứng dụng để xử lý lỗi test.
7. `verify-phase7.mjs` tự dựng fixture có event, ledger, ảnh và điều chỉnh khác 0 rồi chạy cả vòng mã hóa/restore; archive của lượt test này được xóa cuối lượt và khóa thử không được giữ. Đây là bằng chứng diễn tập, không phải bản backup vận hành để lưu lâu dài.

## 5. Khôi phục khi mất Auth hoặc chuyển project

Quy trình này cần người quản trị thực hiện trên môi trường khôi phục riêng và nghiệm thu trước khi đổi domain/key. Bài diễn tập tự động hiện chứng minh restore cùng project test trong schema tạm và tái ghép một Auth account, **chưa chứng minh phục hồi production sang project mới**.

1. Chặn ghi mới trong thời gian phục hồi, giữ project cũ/bản dump nguyên vẹn. Chuẩn bị backup đã xác minh, passphrase đúng và project đích riêng; ghi rõ ref nguồn/đích để tránh nhầm.
2. Giải mã bằng hàm `decryptBackup` trong `supabase/backup.mjs` trên máy quản trị. Payload chứa `dump` (base64 của pg_dump custom), `accounts`, `objects`, `tables`, `dump_sha256`. Không in payload ra terminal/chat. Chỉ xuất dữ liệu giải mã tới nơi cục bộ được bảo vệ và xóa sau nghiệm thu.
3. Khôi phục schema/data bằng PostgreSQL client vào staging riêng. Nếu Auth UUID nguồn không tồn tại ở project mới, **không bỏ FK rồi mở ứng dụng ngay**: tái cấp Auth qua Dashboard/Admin API với email đã kiểm tra, tạo bảng đối chiếu `auth_user_id cũ → UUID mới → app_users.id → employee_id`.
4. Cập nhật chỉ `app_users.auth_user_id` theo bảng đối chiếu, giữ `app_users.id` và `employee_id` để không mất liên kết công/ledger/audit. Đặt `must_change_password=true`, mật khẩu tạm riêng cho từng người; không phục hồi mật khẩu/session cũ từ JSON. Chặn đăng ký công khai và kiểm tra đúng một admin active.
5. Khôi phục bảng theo quan hệ khóa ngoại; giữ snapshot/version/migration history. Kiểm tra grants/RLS bằng anon, A/B, HR/admin trước khi expose schema. Cấu hình Storage bucket private và policy từ đúng bộ migration; policy trên managed schema `storage` không nằm trong dump chỉ có `public`.
6. Khôi phục object đúng `storage_path`/MIME, kiểm SHA-256; với metadata đã quá `expires_at`, giữ trạng thái hết hạn, không mở link ảnh trở lại. Kiểm thử owner/HR/admin và chặn người khác.
7. Đối chiếu totals/event/ledger/adjustment/snapshot; chạy smoke bằng URL staging, cấp/đổi mật khẩu, khóa kỳ, Excel/PDF. Chỉ sau nghiệm thu mới đổi Vercel env/domain và redeploy. Lưu audit khôi phục, ref, người làm, thời gian và kết quả.

## 6. Rollback deploy

Nếu code mới lỗi, chọn deployment đã kiểm chứng trong Vercel → Promote/Rollback theo giao diện hiện hành. Không rollback SQL bằng cách drop public hoặc chạy reset seed. Migration là tăng dần; sửa schema bằng migration mới đã test. Snapshot kỳ khóa phải giữ nguyên. Nếu lỗi cấu hình key/URL, sửa đúng scope rồi redeploy; kiểm tra lại login và cron. Nếu có nghi ngờ secret bị lộ, xoay key trong Supabase/Vercel và đổi bản triển khai; việc xóa file khỏi working tree không xóa lịch sử Git cũ.
