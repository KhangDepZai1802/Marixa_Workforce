# Hướng dẫn tạo môi trường Supabase và Vercel cho Marixa V1

Cập nhật: 09/10/2026. Chủ dự án tự quản trị GitHub, Supabase và Vercel. Hướng dẫn này đi cùng checklist ở `plan.md`; các bước tạo tài khoản/project do chủ dự án thao tác trong Dashboard. Giao diện nhà cung cấp có thể đổi tên mục, nên dùng các liên kết tài liệu chính thức bên dưới để đối chiếu.

## 1. Việc làm ngay ở Phase 0

### Tạo tài khoản và hai project Supabase

1. Mở [Supabase Dashboard](https://supabase.com/dashboard), tạo tài khoản/đăng nhập và tạo một organization ở gói **Free**. Supabase hiện cho phép hai project Free trên phạm vi organization mà bạn là Owner/Administrator. Bật xác thực hai bước cho tài khoản quản trị nếu có thể. Không dùng email nhân viên để làm chủ project.
2. Chọn **New project**. Tạo project thử nghiệm, gợi ý tên `marixa-attendance-test`. Chọn organization vừa tạo, gói Free, region **Southeast Asia (Singapore)**; nếu có lựa chọn region cụ thể thì dùng `ap-southeast-1`. Tạo mật khẩu database mạnh, lưu trong password manager; không gửi mật khẩu qua chat, không ghi trong Git. Đợi Dashboard báo project sẵn sàng.
3. Tạo project thứ hai với tên gợi ý `marixa-attendance-prod`, cũng tại Singapore. Hai project phải có **project ref khác nhau**. Production để trống dữ liệu và chưa nhập nhân viên thật. Nếu Supabase báo đã dùng hết hai suất Free, kiểm tra các project/organization khác trước khi tiếp tục; không gộp test và production vào cùng database.
4. Ở từng project, mở **Project Settings / General** hoặc xem URL project để lấy **project reference**. Kiểm tra `https://<ref>.supabase.co` của test và production khác nhau. Ghi vào `docs/worklog.md` hoặc gửi lại cho mình đúng bốn thông tin: `test ref`, `test region`, `production ref`, `production region`. Project ref và region không phải secret; **không gửi URL kết nối database, API secret, mật khẩu hoặc token**.
5. Trong **Authentication / Settings (General configuration)**, tắt **Allow new users to sign up** ở cả hai project; giữ phương thức **Email/Password** cho luồng đăng nhập. Sau này chỉ admin của ứng dụng cấp tài khoản qua server. Chưa tạo người dùng hoặc nhập dữ liệu thật ở Phase 0. [Tài liệu Auth General Configuration](https://supabase.com/docs/guides/auth/general-configuration).

[Tài liệu tạo project](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), [region](https://supabase.com/docs/guides/platform/regions), [hạn mức Free](https://supabase.com/docs/guides/platform/billing-on-supabase). Region là nơi đặt dữ liệu chính; nếu công ty có yêu cầu lưu trữ dữ liệu tại một quốc gia cụ thể, xác nhận yêu cầu đó trước khi bấm tạo.

### Tạo tài khoản Vercel

1. Mở [Vercel Dashboard](https://vercel.com/dashboard), đăng nhập bằng tài khoản GitHub quản trị repository `KhangDepZai1802/Marixa_Workforce`. Kiểm tra GitHub account có quyền Owner của repository cá nhân để có thể import vào Vercel. [Tài liệu kết nối GitHub](https://vercel.com/docs/git/vercel-for-github).
2. **Chưa import/deploy project ở Phase 0** vì repository chưa có ứng dụng Next.js, và gói Hobby hiện bị giới hạn cho mục đích cá nhân phi thương mại. Trước Phase 9, xác nhận phương án Vercel được nhà cung cấp cho phép cho hệ thống công ty (ví dụ gói phù hợp hoặc xác nhận trực tiếp của Vercel). [Điều khoản Hobby](https://vercel.com/legal/terms), [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines).

## 2. Sau khi Phase 1 có ứng dụng Next.js

1. Lấy **Project URL** và **publishable key** của project **test** từ hộp **Connect** hoặc **Settings / API Keys**. Lưu vào `.env.local` trên máy phát triển với tên `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Nếu mã cần quyền quản trị, dùng **secret key** hiện hành ở biến server `SUPABASE_SECRET_KEY`; chỉ tạo/lấy key khi phần server cần đến. Không dùng key cũ `service_role` theo tutorial cũ nếu mã mới dùng `sb_secret_...`. [Tài liệu Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
2. Giữ `.env.local` ngoài Git; `.env.example` chỉ có tên biến. Không đặt `SUPABASE_SECRET_KEY`, mật khẩu DB hay `CRON_SECRET` dưới tiền tố `NEXT_PUBLIC_`. Không gửi các giá trị này trong chat hoặc worklog.
3. Chạy ứng dụng bằng Node/npm trên máy (`npm.cmd` trong PowerShell hiện tại). Đến Phase 2, chỉ migration và dữ liệu giả được đưa vào project test. Bật RLS, thử quyền và bucket ảnh **private** trước khi có dữ liệu thật.
4. Với `psql`/`pg_dump`, mở nút **Connect** của project để lấy đúng host, cổng và username. Ưu tiên direct connection nếu máy có IPv6; nếu mạng chỉ có IPv4, chọn **Session pooler**. Nhập mật khẩu ở prompt `-W`, không ghi connection string có mật khẩu vào shell history hay repository. [Tài liệu kết nối Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres).

### Thông số Session pooler đã được chủ dự án cung cấp

| Môi trường | Host | Port | User | Database |
| --- | --- | ---: | --- | --- |
| Test | `aws-0-ap-southeast-1.pooler.supabase.com` | `5432` | `postgres.pkpwcpatuslfjyoivbuf` | `postgres` |
| Production | `aws-0-ap-southeast-1.pooler.supabase.com` | `5432` | `postgres.vmpsfwwfgoeritayfnvv` | `postgres` |

Đây là metadata kết nối, không chứa mật khẩu. Host của hai project có thể giống nhau vì user có project ref riêng. **Không lưu URI đầy đủ hay mật khẩu trong Git.** Lưu mật khẩu database của từng project trong password manager cá nhân; khi dùng client, nhập tại prompt `-W`. Nếu host hoặc user thay đổi, sao chép lại từ nút **Connect** của đúng project, không suy ra host từ region.

Ví dụ kiểm tra **test** bằng truy vấn chỉ đọc trong PowerShell, sau khi đến Phase 2 và có mật khẩu:

```powershell
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 5432 -U postgres.pkpwcpatuslfjyoivbuf -d postgres -W -c 'select current_database(), current_user;'
```

`-W` hỏi mật khẩu khi chạy; không gõ mật khẩu vào lệnh. Chưa cần chạy lệnh này ở Phase 0 và chưa thao tác database production. [Tài liệu `psql -W`](https://www.postgresql.org/docs/18/app-psql.html).

## 3. Khi ứng dụng đã qua Phase 8 và chuẩn bị Phase 9

1. Kiểm tra lại điều khoản Vercel và chọn phương án được phép dùng cho công ty. Chỉ sau đó mở **Vercel Dashboard → Add New → Project**, cấp quyền truy cập đúng repository GitHub, chọn **Import**. Chọn Framework **Next.js**, Root Directory là thư mục chứa `package.json` (theo kế hoạch là root repository), và production branch đã kiểm thử, thường là `main`. [Tài liệu import Git](https://vercel.com/docs/git).
2. Vào **Project Settings → Environment Variables**. Cấu hình **Production** với URL/publishable/secret key của Supabase **production**; cấu hình **Preview** với bộ key của **test**. Thêm `CRON_SECRET` riêng cho mỗi môi trường nếu đã có job dọn ảnh. `NEXT_PUBLIC_APP_URL` phải trỏ tới domain tương ứng. Kiểm tra từng scope trước khi deploy; đổi biến môi trường cần deployment mới để có hiệu lực. [Tài liệu Vercel Environment Variables](https://vercel.com/docs/environment-variables).
3. Trên project Supabase production, áp migration đã thử ở test bằng `psql`, kiểm tra RLS, bucket ảnh private, Auth và bootstrap đúng một admin. Không đưa seed giả vào production. Trong **Authentication → URL Configuration**, đặt Site URL và các Redirect URLs theo domain Vercel thực tế, kiểm tra cả luồng đăng nhập/đổi mật khẩu. [Tài liệu URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls).
4. Deploy commit đã qua kiểm thử; trong Vercel kiểm tra trạng thái **Ready**, build log và URL HTTPS. Chạy smoke test đầy đủ của Phase 9.5 trong `plan.md`, đặc biệt: quyền ba role, ảnh private, chấm không ảnh/GPS, offline, công ngày nghỉ, phép tháng, khóa kỳ và điều chỉnh kỳ sau. Sau đó kiểm tra backup/restore trên project test, ghi commit hash/deployment ID và kết quả vào worklog.
5. Job xóa ảnh 3 tháng có thể chạy tối đa một lần mỗi ngày trên Hobby và thời điểm chạy không chính xác tới từng phút; không dùng cron để xác định giờ công. Nếu kế hoạch hosting thay đổi, kiểm tra giới hạn cron của gói đã chọn. [Tài liệu Vercel Cron](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## 4. Cấu hình nghiệp vụ trước khi cho nhân viên dùng

- Admin nhập lịch nghỉ/làm bù, tọa độ/bán kính tham khảo, loại nghỉ và chính sách ảnh **giữ 3 tháng**. Không có tọa độ hoặc người dùng từ chối GPS thì chấm công vẫn được; chỉ không có nhãn vị trí.
- Phép năm được quyết định là **12 ngày/năm, cộng 1 ngày vào ngày 1 mỗi tháng từ tháng nhân viên vào làm**; không tự cấp sẵn 12 ngày. Admin nhập số dư lịch sử khi chuyển hệ thống nếu có, kèm lý do. Giao dịch cộng tháng phải chống cộng lặp.
- Theo dõi dung lượng database/Storage, tình trạng project Free bị tạm dừng và backup. Supabase Free không có backup hằng ngày tự động; `pg_dump` dữ liệu nghiệp vụ không chứa object ảnh Storage hoặc đầy đủ Auth. Sao lưu ảnh riêng, lưu bản mã hóa ngoài Supabase và thử restore ở test. [Backup](https://supabase.com/docs/guides/platform/backups), [tạm dừng Free](https://supabase.com/docs/guides/platform/free-project-pausing).

## 5. Trạng thái sau Phase 0

| Môi trường | Supabase project | Region do chủ dự án xác nhận |
| --- | --- | --- |
| Thử nghiệm | `marixa-attendance-test` — `pkpwcpatuslfjyoivbuf` | Singapore |
| Production | `marixa-attendance-prod` — `vmpsfwwfgoeritayfnvv` | Singapore |

Phase 0 đã đủ đầu vào và được đánh dấu hoàn tất trong `plan.md`. Project ref có thể ghi trong tài liệu; publishable key, secret key và connection string không ghi vào worklog. Các lệnh `supabase login`, `supabase init`, `supabase link` **không cần chạy để hoàn tất Phase 0**. Dự án sẽ dùng PostgreSQL client cài trực tiếp cho migration và backup, không dùng Docker/local stack.

Tiếp theo là Phase 1 tạo ứng dụng. Khi đến Phase 2, kiểm tra Auth không cho đăng ký công khai, cấu hình key cho **test**, migration, RLS và bucket ảnh private; chỉ kết nối production khi Phase 9 được phép triển khai. Admin sẽ nhập tọa độ/bán kính văn phòng và lịch nghỉ/làm bù trước vận hành; nếu có số dư phép lịch sử, nhập giao dịch mở đầu có lý do.
