# Deploy Marixa lên Vercel — từng bước

Cập nhật 10/10/2026. Ứng dụng ở `react/`; API là Next.js Route Handlers. Chủ dự án xác nhận chưa tạo project Vercel và hiện tiếp tục dùng Supabase **test**. Hướng dẫn này không có nghĩa Phase 9 đã được nghiệm thu.

## 1. Chọn đúng môi trường

| Mục đích | Vercel project gợi ý | Supabase |
| --- | --- | --- |
| Lần đầu đưa lên HTTPS để thử trên điện thoại | `marixa-attendance-test` | `pkpwcpatuslfjyoivbuf` |
| Bản production của đồ án, sau khi hoàn tất test | `marixa-attendance` | `vmpsfwwfgoeritayfnvv` |

Làm mục 2–6 với **test trước**, phù hợp yêu cầu hiện tại. Một deployment mang nhãn Production trong project Vercel `marixa-attendance-test` vẫn chỉ là môi trường thử nghiệm; không đánh dấu Phase 9.1–9.6 vì việc đó. Sau này tạo project Vercel riêng cho production theo mục 7. Preview của project production vẫn dùng Supabase test.

Chủ dự án đã xác nhận đây là đồ án cá nhân trong worklog. Hobby dành cho cá nhân phi thương mại; nếu chuyển sang chấm công vận hành công ty, phải chọn phương án phù hợp trước khi dùng thật. Không cần nâng gói để làm bản thử đồ án hiện tại. [Vercel Hobby](https://vercel.com/docs/plans/hobby).

## 2. Chuẩn bị bản code trên GitHub

1. Trong terminal VS Code, vào thư mục `react`.
2. Chạy `npm.cmd ci`, `npm.cmd run check`, `npm.cmd run build`.
3. Xem Source Control/Git diff. `.env.local`, `.env.phase2.local`, `.env.production.local`, `.env.backup.local`, `.backups/`, `.artifacts/`, `node_modules/` và `.next/` không được nằm trong commit. `.env.example` chỉ có tên biến, giá trị trống.
4. Commit phần code/tài liệu đã kiểm thử rồi push lên repository `KhangDepZai1802/Marixa_Workforce`. Dùng branch thực tế của bạn; lưu commit hash bằng `git rev-parse HEAD`. Nếu chưa muốn commit các thay đổi có từ trước, review/chọn file trong Source Control trước khi commit.
5. Không chạy `react/supabase/run-migrations.mjs` hoặc dán `apply-all.sql` cũ. Các script đó không phải quy trình deploy có version/checksum hiện hành.

Các kiểm thử cloud trong `verify-release.mjs` chỉ nhận project test và server local 3001. Không thay URL chúng sang production để chạy thử.

## 3. Tạo project Vercel lần đầu

1. Mở [Vercel Dashboard](https://vercel.com/dashboard), đăng nhập bằng GitHub quản trị repository.
2. Chọn **Add New → Project**.
3. Ở **Import Git Repository**, chọn `Marixa_Workforce` → **Import**. Nếu không thấy: chọn cấu hình GitHub App, cấp quyền cho đúng repository rồi quay lại.
4. Đặt **Project Name**: `marixa-attendance-test` (nếu trùng, thêm hậu tố của bạn).
5. **Framework Preset**: `Next.js`.
6. **Root Directory → Edit**: chọn **`react`**, lưu. Đây là bước quan trọng: không chọn root repository, không chọn `Marixa-ChamCong/web`.
7. Trong Build/Output Settings: Build Command `npm run build`, Install Command `npm ci`; **Output Directory để mặc định Next.js**, không đặt `dist` hay `out`.
8. Chọn **Node.js 22.x** trong Project Settings → Build and Deployment nếu chưa có ở trang import. Đây là dòng Node đã chạy local.
9. Mở phần **Environment Variables**, nhập theo mục 4 trước khi bấm Deploy. [Cấu hình build và Root Directory](https://vercel.com/docs/builds/configure-a-build).

## 4. Nhập biến môi trường

Lấy giá trị từ `react/.env.local` của **test** và Supabase Dashboard → Project Settings → API Keys. Không gửi secret/mật khẩu qua chat. Mỗi biến là một hàng, không nhập dấu nháy quanh giá trị.

| Tên chính xác | Giá trị cho Vercel test | Scope |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project `pkpwcpatuslfjyoivbuf` | Production + Preview |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key của cùng project test | Production + Preview |
| `SUPABASE_SECRET_KEY` | Secret key của cùng project test | Production + Preview; đánh dấu Sensitive nếu giao diện cho phép |
| `NEXT_PUBLIC_APP_URL` | `https://<tên-project-thực-tế>.vercel.app`, không có đường dẫn cuối | Chỉ Production |
| `CRON_SECRET` | Chuỗi ngẫu nhiên tối thiểu 32 ký tự, giữ riêng trong password manager | Production; Preview có thể dùng secret khác |

Preview có domain riêng từng deployment: **không gán `NEXT_PUBLIC_APP_URL` của production cho Preview**. Để biến này không tồn tại ở scope Preview; API sẽ kiểm tra Origin theo chính URL request. Nếu dùng domain preview cố định, có thể đặt đúng domain đó cho branch tương ứng.

Tạo CRON_SECRET bằng password manager, hoặc chạy trên terminal cá nhân:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Sao chép vào Vercel và lưu riêng; không commit kết quả. Không đưa `SUPABASE_TEST_DB_PASSWORD`, `SUPABASE_DB_PASSWORD`, `BOOTSTRAP_PASSWORD` hoặc `BACKUP_PASSPHRASE` lên Vercel. Runtime web không cần mật khẩu database. [Vercel Environment Variables](https://vercel.com/docs/environment-variables).

## 5. Deploy và chốt domain

1. Bấm **Deploy**. Đợi trạng thái **Ready**; nếu Failed, xem lỗi đầu tiên ở **Build Logs**.
2. Mở domain được cấp từ deployment. Nếu domain khác dự kiến, vào **Settings → Environment Variables**, sửa `NEXT_PUBLIC_APP_URL` ở Production cho đúng.
3. Sau mọi lần sửa biến môi trường: **Deployments → deployment mới nhất → … → Redeploy**. Biến mới không tự áp lên deployment cũ.
4. Kiểm tra **Settings → Git → Production Branch** đúng branch bạn vừa push. Chỉ push vào branch này khi muốn cập nhật domain chính của project test.
5. Trong **Supabase test → Authentication → URL Configuration**: đặt **Site URL** bằng domain Vercel test; thêm Redirect URL cho domain đó và `http://localhost:3000/**`, `http://localhost:3001/**` phục vụ phát triển. Chỉ whitelist wildcard preview thuộc project của bạn, không wildcard toàn bộ `vercel.app`. [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
6. Giữ **Allow new users to sign up** tắt. Tài khoản do admin cấp; đăng nhập hiện dùng **số điện thoại + mật khẩu**, liên kết tới Supabase email/password theo quyết định đã ghi trong worklog.
7. Mở `/login`, đăng nhập tài khoản test trong `.env.phase2.local`; không copy file này lên GitHub. Mở trực tiếp `/today`, `/my-attendance`, `/hr/dashboard` rồi refresh để kiểm tra route.
8. Dùng điện thoại truy cập **HTTPS** domain chính để kiểm tra camera/GPS. `http://192.168...` trên LAN không thay cho bài kiểm tra HTTPS quyền thiết bị.

## 6. Cron, log và bài kiểm tra cần bạn thực hiện

`react/vercel.json` đã khai báo `/api/cron/cleanup-photos` với `0 3 * * *`: khoảng **10:00–10:59 giờ Việt Nam** trên Hobby. Cron dọn ảnh và bắt kịp phép tháng; không xác định giờ chấm. Hobby hiện cho chạy tối đa một lần/ngày cho mỗi cron, độ chính xác theo giờ. [Giới hạn cron](https://vercel.com/docs/cron-jobs/usage-and-pricing).

1. Mở **Vercel Project → Settings → Cron Jobs**, xác nhận endpoint xuất hiện sau deploy. Cron chỉ chạy ở deployment Production của project.
2. Kiểm tra `CRON_SECRET` đã đặt đúng scope; Vercel gửi `Authorization: Bearer ...` khi gọi cron. Trong **Logs**, lọc endpoint và tìm `status: succeeded`. Không mở URL cron trần rồi xem 401 là lỗi: 401 là kết quả đúng khi thiếu secret. [Quản lý cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
3. Trong web, admin mở **Quản trị hệ thống → Vận hành và dung lượng → Dọn ảnh hết hạn và cập nhật phép tháng**. Kiểm tra lần chạy thành công; chạy lần nữa không cộng phép hoặc xóa ảnh trùng. Mỗi lượt xử lý tối đa 500 ảnh; chạy tiếp nếu số ảnh hết hạn còn chờ lớn hơn 0.
4. Trên điện thoại thật, thử ảnh lớn/ảnh xoay qua chức năng chọn/chụp ảnh; xác nhận ảnh nén ≤200.000 byte và HR vẫn đọc rõ. Đây là đầu vào còn thiếu của ô **2.6**.
5. Dùng các tài khoản giả khác nhau hoặc ngày khác nhau để thử đủ bốn tổ hợp: có ảnh+GPS, chỉ ảnh, chỉ GPS, không có cả hai. Từ chối quyền vẫn chấm được; ra ngoài văn phòng vẫn tính công.
6. Tắt mạng, chấm, xác nhận thông báo đã lưu trên thiết bị; có mạng lại, refresh và thử đồng bộ. Chỉ được một event cho mỗi loại/ngày; không đăng xuất/xóa dữ liệu trình duyệt khi queue chưa hết.
7. Thử Safari iOS/Chrome Android nếu có; đọc bằng VoiceOver/TalkBack: nhãn ô nhập, nút chấm, thông báo thành công/lỗi, mở/đóng ảnh bằng bàn phím trên desktop. Chụp ảnh giao diện nếu cần đối chiếu; không đưa ảnh nhân viên thật vào Git.
8. HR/admin kiểm tra Excel có “BẢN TẠM” khi chưa khóa; PDF có dấu tiếng Việt, mã đơn, phiên bản/người duyệt; tài khoản B không xem được PDF/ảnh của A.
9. Ghi vào worklog: URL, deployment ID, commit hash, thiết bị/trình duyệt, ngày giờ, kết quả từng mục. Chỉ đánh dấu 8.3/8.5 và phần deploy liên quan sau khi thực sự đạt.

## 7. Khi sẵn sàng cho Supabase production

**Chưa thực hiện phần này trong lượt hiện tại theo yêu cầu của chủ dự án.** Chỉ làm sau khi bản test đã đạt và đã chọn thời điểm chuyển môi trường.

1. Tạo `react/.env.production.local` ở máy quản trị (đã được Git ignore), có các biến runtime trong `.env.example` với giá trị của project `vmpsfwwfgoeritayfnvv`. Thêm `SUPABASE_DB_PASSWORD` và nếu cần `SUPABASE_DB_HOST` lấy từ Connect → Session pooler của production.
2. Chạy từ `react/`:

   ```powershell
   node supabase/apply-migrations.mjs .env.production.local vmpsfwwfgoeritayfnvv
   ```

   Script chỉ áp version chưa có, đối chiếu checksum của version cũ, không reset schema. Nếu schema đã có bảng mà thiếu lịch sử migration, script dừng; không tự xóa bảng để vượt qua lỗi.
3. Trong Supabase production, kiểm tra signup tắt; bucket `attendance-photos` private, MIME JPEG/PNG/WebP, giới hạn 200.000 byte và RLS/policy Storage theo migration. Không chạy script seed test.
4. Thêm vào file local: `BOOTSTRAP_EMAIL`, `BOOTSTRAP_PHONE` (10 chữ số bắt đầu bằng 0), `BOOTSTRAP_NAME`, `BOOTSTRAP_PASSWORD` (≥12 ký tự ngẫu nhiên), tùy chọn `BOOTSTRAP_EMPLOYEE_CODE`.
5. Chạy:

   ```powershell
   node supabase/bootstrap.mjs .env.production.local vmpsfwwfgoeritayfnvv
   ```

   Script tạo một admin, hồ sơ tương ứng, ca khởi tạo và loại phép; bắt đổi mật khẩu lần đầu. Từ chối khi đã có admin hoạt động; không ghi đè tài khoản hiện có. Cấu hình lịch nghỉ, văn phòng và số dư phép lịch sử sau khi vào admin. Xóa mật khẩu bootstrap khỏi file local sau khi đổi thành công.
6. Tạo Vercel project riêng `marixa-attendance`, lặp mục 3–5. Scope **Production dùng Supabase production**; scope **Preview dùng test**. Tạo CRON_SECRET khác cho project production. Cập nhật Auth Site URL/Redirect URLs của Supabase production theo domain mới.
7. Chạy toàn bộ smoke test Phase 9.5 trong plan bằng dữ liệu giả được kiểm soát; không chạy bộ test local có thao tác cleanup lên production. Sao lưu theo [runbook](OPERATIONS_RUNBOOK.md), đối chiếu restore test, ghi deployment ID/commit/URL và dọn đúng fixture trước khi nhập dữ liệu thật.

## 8. Khi gặp lỗi

| Hiện tượng | Kiểm tra và cách xử lý |
| --- | --- |
| Build không thấy Next.js/package.json | Root Directory phải là `react`; Framework Next.js. |
| Build thiếu font/PDF | Commit cả `react/assets/fonts/BeVietnamPro-Regular.ttf`, OFL.txt và `next.config.ts`; không copy riêng thư mục src. |
| Đăng nhập báo CSRF_REJECTED | `NEXT_PUBLIC_APP_URL` phải đúng origin HTTPS đang mở; sửa scope rồi Redeploy; Preview không dùng app URL của production. |
| AUTH_UNAVAILABLE / lỗi đọc bảng | URL và cả hai key phải thuộc cùng project; kiểm tra project có bị Pause, migration đã áp và key không có dấu nháy/khoảng trắng. |
| Trang chạy nhưng tài khoản test không vào được | Domain đang trỏ test hay production; login dùng số điện thoại, không nhập mã nhân viên. |
| PDF 404 | Phải deploy code mới có folder route `[id]`; URL xuất vẫn là `/api/v1/leave-requests/<uuid>.pdf`. |
| Cron 401 | Kiểm tra CRON_SECRET, scope Production và redeploy; dùng nút admin để chạy tay. |
| Có ảnh hết hạn nhưng chưa dọn hết | Mỗi batch tối đa 500; xem lần chạy lỗi/đang dở, chạy lại; không xóa event/sổ phép/snapshot. |
| Project Supabase bị Pause | Vào Dashboard → project → Restore/Resume nếu còn khả dụng; chờ Active rồi thử login/queue; xem runbook. |

Nếu cần hỗ trợ bước Vercel, gửi **tên project, domain .vercel.app, trạng thái deployment và đoạn lỗi đã bỏ secret**. Không gửi mật khẩu, CRON_SECRET, database URI có mật khẩu hoặc server key.
