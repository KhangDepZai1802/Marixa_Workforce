# WORKLOG — Hệ thống chấm công Marixa

File này là điểm bắt đầu cho bất kỳ AI/người làm việc tiếp trên dự án. Cập nhật sau mỗi lượt làm việc có thay đổi thực tế. Ghi sự thật đã kiểm tra; không đánh dấu “xong” khi chưa kiểm chứng.

**Quy tắc bất biến cho AI:** Mọi file `*.md` trong `docs/` là chỉ đọc, trừ `docs/worklog.md`. Không sửa, ghi đè, tạo lại, đổi tên, di chuyển hoặc xóa các file Markdown còn lại. Ghi mọi đề xuất chỉnh đặc tả vào worklog và kiểm tra diff trước khi kết thúc lượt làm việc. Quy tắc chung cho agent nằm tại [`../AGENTS.md`](../AGENTS.md).

## Trạng thái hiện tại

- Cập nhật: 2026-10-09, múi giờ Asia/Ho_Chi_Minh.
- Giai đoạn: **Phase 0 hoàn tất; Phase 1–2 đã triển khai & kiểm chứng trên project Supabase TEST** (ref `lasdnfytejntonjfkspv`, region ap-southeast-2 Sydney — khác thông tin Singapore ghi trước, do project thực tế do chủ dự án tạo ngày 09/10/2026).
- Đã có: ứng dụng Next.js (thư mục `../react`), 12 file migration SQL (đã áp + ghi version/checksum vào `app_schema_migrations`), seed 8 hồ sơ + 3 leave_types + work_policies, 8 tài khoản Auth (1 admin, 3 hr, 4 employee).
- Đã kiểm chứng end-to-end: login 3 role, `/api/v1/me`, chấm công `check_in` + retry cùng idempotency_key (không trùng bản ghi), đọc lịch sử. Chi tiết xem mục "Phase 1–2 — kiểm chứng ngày 09/10/2026 (chiều)" bên dưới.
- Đã tạo đủ: `01-business-analysis.md`, `02-database-design.md`, `03-workflow.md`, `04-system-architecture.md`, `05-testing-strategy.md`, `06-deployment-vercel-supabase.md`, `07-ui-design-system.md`.
- Kiểm tra đã chạy: đủ 7 tên file và `worklog.md`, tất cả đọc được UTF-8, không có liên kết Markdown nội bộ bị thiếu. Đã rà và thống nhất quy tắc duyệt yêu cầu cá nhân của admin.
- Nguồn tham khảo: `MOTAHETHONG.docx` thuộc công ty khác, chỉ dùng để học các nguyên tắc chấm công. Logo Marixa được người dùng gửi trong cuộc trò chuyện; hiện chưa có file logo gốc trong thư mục.

## Việc vừa hoàn thành

- Viết quy tắc công văn phòng, quyền employee/HR/admin, nghỉ phép, tăng ca, chỉnh công, bảng công và tiêu chí nghiệm thu.
- Viết ERD/bảng cốt lõi, RLS, luồng offline/ảnh, API/route, ma trận test, triển khai Free và design system theo logo Marixa.
- Ghi rõ giới hạn Supabase Free, sao lưu thủ công, retention ảnh và rủi ro điều kiện Vercel Hobby; không mô tả Hobby là đã phù hợp sử dụng công ty.
- Chốt trường hợp admin cũng có hồ sơ nhân viên: HR duyệt đơn/yêu cầu cá nhân của admin; admin không tự duyệt.
- Bổ sung luồng mật khẩu tạm và đổi mật khẩu bắt buộc để không phụ thuộc SMTP mặc định trên Free; thêm snapshot bán kính văn phòng để lịch sử vị trí ổn định.
- Chốt **không dùng Docker** theo yêu cầu mới nhất; cập nhật kiến trúc, kiểm thử và triển khai sang Node.js + Supabase hosted thử nghiệm + PostgreSQL client cài trực tiếp. Bỏ `supabase db dump` vì lệnh đó cần container.
- 2026-10-09: Lập lộ trình triển khai V1 theo phase đến khi kiểm chứng bản deploy Vercel Hobby + Supabase Free; thêm quy tắc bảo vệ các file Markdown đặc tả.
- 2026-10-09: Chủ dự án chốt ngoài văn phòng tính công bình thường; ảnh/GPS tùy chọn; offline không giới hạn ngày đồng bộ và dữ liệu đến sau khóa kỳ được điều chỉnh ở kỳ mở sau; tính từng phút; Chủ nhật/ngày nghỉ tự động tính tăng ca từ giờ chấm, không cần đơn được duyệt. Tạo `../plan.md` làm checklist triển khai chi tiết.


### 09/10/2026 (chiều) — Chạy DB + Auth + chấm công trên Supabase test
- Tạo `../react/.env.local` (URL + publishable key + secret key) và `../react/.gitignore` (bỏ qua secret).
- Viết `../react/supabase/run-migrations.mjs` (Node + `pg`): reset public schema, chạy 12 migration theo thứ tự (mỗi file 1 transaction, ghi version+checksum), seed data, tạo 8 Auth user qua GoTrue admin API, link `app_users` role.
- **Sửa bug migration 0012:** function `prevent_locked_period_mutation()` thiếu `END IF` (câu `IF ... then return new;` nhiều dòng không đóng trước `RAISE EXCEPTION`) → lỗi parse 42601 khi chạy. Đã sửa trong `202610090012_*.sql`. Không sửa file đặc tả.
- Tạo `../react/supabase/seed-demo-data.sql` (8 nhân viên, mật khẩu chung `Hovaten123@`; tên kế toán 07/08 = Vũ Minh Anh / Trần Ngọc Bảo — tên giả, chủ dự án có thể đổi). 5 role đề xuất (employee/manager/accountant/HR/admin) đã gộp về 3 role hệ thống (employee/hr/admin) vì UI + `lib/auth.ts` hiện chỉ hỗ trợ 3 role; ghi đề xuất mở rộng role vào mục "Các quyết định không được tự đổi".
- Kiểm chứng API bằng `../react/supabase/test-login-checkin.mjs`: login `0900000001`→employee (false đổi mk), `0900000003`→hr, `0900000006`→admin; `check_in` trả 201, retry cùng key trả 200 cùng event id (idempotent, không nhân đôi).
- Ghi chú vận hành: `.env.local` bị hệ thống che (redact) secret khi ghi bằng tool write; cần nhập key bằng tay hoặc lệnh CLI. Connection string DB Supabase cần `sslmode=require` (uselibpqcompat) để Node `pg` nối được.
## Các quyết định không được tự đổi

- Phạm vi chỉ có nhân viên văn phòng Marixa, dưới 15 người; không có công trường, công nhân hoặc điểm danh đội.
- Ba role: `employee`, `hr`, `admin`; có nhiều nhân viên/HR và đúng một admin hoạt động. HR tự chấm công, xem dữ liệu toàn khối; admin toàn quyền.
- Email + mật khẩu. Chấm vào/ra một lần mỗi ngày. Admin quản lý **một ca chung cho toàn bộ nhân viên** với ngày làm, giờ vào/ra, nghỉ trưa, miễn trừ đi trễ và ngày hiệu lực; thứ 2–thứ 7, 08:00–17:00, nghỉ 12:00–13:00, miễn trừ 0 phút chỉ là giá trị khởi tạo.
- Ảnh và GPS là bằng chứng **tùy chọn**; thiếu một hoặc cả hai vẫn chấm và tính công. Ngoài văn phòng tính công bình thường, cờ vị trí nếu có GPS chỉ để tham khảo. Offline không giới hạn ngày đồng bộ; chống trùng; nếu kỳ gốc đã khóa thì giữ snapshot và ghi điều chỉnh ở kỳ mở tiếp theo.
- Tính công chính xác theo phút, không làm tròn theo block. Chủ nhật/ngày nghỉ tự động tính tăng ca từ giờ chấm thực tế; ngày làm việc bình thường vẫn cần duyệt tăng ca cho giờ ngoài lịch.
- HR duyệt đơn và yêu cầu của nhân viên; admin duyệt hồ sơ của HR. HR kiểm tra bảng công; admin khóa kỳ.
- V1 có hồ sơ, đơn nghỉ, phép năm theo sổ giao dịch, yêu cầu sửa công, Excel bảng công, PDF đơn nghỉ; đơn tăng ca có duyệt áp cho ngày làm việc bình thường.
- Công nghệ: React/Next.js, Supabase, Vercel. Người dùng yêu cầu dùng gói Free kể cả bản chính thức; tài liệu phải ghi rõ rủi ro điều kiện sử dụng Hobby của Vercel, không tuyên bố là phù hợp.
- Không dùng Docker/Docker Desktop, Dockerfile, docker-compose hoặc Supabase local stack. Phát triển bằng Node.js và Supabase hosted; migration/backup bằng PostgreSQL client cài trực tiếp.
- Giao diện theo logo Marixa xanh lam/cyan, điểm nhấn vàng, dùng hướng dẫn `ui-ux-pro-max`.

## Việc tiếp theo theo thứ tự

1. Bắt đầu Phase 1 trong [`../plan.md`](../plan.md): tạo ứng dụng Next.js, route và nền giao diện; chỉ nối project **test** khi đến Phase 2. Hai project ref/region đã ghi ở Phase 0 bên dưới.
2. Khi triển khai, ưu tiên năm quyết định nghiệp vụ mới ở trên nếu đặc tả `01`–`07` mâu thuẫn; đặc biệt sửa mô hình ảnh/GPS thành tùy chọn, thiết kế điều chỉnh kỳ sau và test tăng ca ngày nghỉ tự động.
3. Sau mọi thay đổi nghiệp vụ hoặc code, chỉ cập nhật `docs/worklog.md` trong nhóm Markdown của `docs/`; ghi khác biệt cần quyết định vào worklog, không sửa các file đặc tả.

- **Role 5 → 3:** chủ dự án đưa 5 role (employee, manager, accountant, HR, admin). Hệ thống hiện chỉ có 3 role (`employee`/`hr`/`admin` ở `lib/auth.ts`, migration CHECK constraint, và UI). Đã gộp: manager→hr, accountant→employee (tạm). **Đề xuất (chưa làm):** thêm enum `manager`/`accountant` vào `app_users.role`, sửa `lib/auth.ts`, route `/admin` `/hr`, và policy RLS; cần chủ dự án xác nhận trước khi làm.
## Vấn đề/bug/rủi ro đang mở

- **Chưa phát hiện bug trong tài liệu** sau kiểm tra cấu trúc và liên kết; chưa có ứng dụng nên chưa có bug runtime.
- **Tài sản đã xác nhận:** chủ dự án xác nhận `logo.png` là logo chính thức; màu ở `07-ui-design-system.md` sẽ đối chiếu khi phát triển UI.
- **Cấu hình cần admin nhập trước vận hành:** lịch ngày nghỉ/làm bù, tọa độ/bán kính văn phòng để hiện nhãn vị trí và số dư phép lịch sử nếu có. Đã chốt lưu ảnh 3 tháng và phép năm 12 ngày, cộng 1 ngày vào ngày 1 mỗi tháng từ tháng vào làm. Thiếu ảnh/GPS hoặc tọa độ không được chặn chấm công.
- **Giới hạn Free:** Supabase có hạn mức database/Storage và Free không có backup tự động; cần theo dõi dung lượng, dọn ảnh, backup thủ công và thử restore.
- **Khôi phục không Docker chưa được thử:** `pg_dump` nghiệp vụ không chứa Auth managed schema hoặc object Storage. Trước khi dùng thật, phải hoàn thiện và chạy thử runbook tái cấp tài khoản/ghép hồ sơ, khôi phục ảnh và dữ liệu công/phép trên project thử nghiệm.
- **Điều kiện Vercel:** Hobby dành cho mục đích cá nhân phi thương mại theo tài liệu nhà cung cấp. Chủ dự án xác nhận bản triển khai này là **đồ án cá nhân**; có thể tiếp tục chuẩn bị Hobby theo phạm vi đó. Nếu sau này dùng để chấm công thật cho công ty hoặc phục vụ mục đích thương mại, cần đánh giá lại gói triển khai. Xem `06-deployment-vercel-supabase.md`.
- **Email Auth:** dịch vụ SMTP mặc định của Supabase không nên làm nền cho cấp/khôi phục tài khoản production; V1 đặc tả admin cấp/reset mật khẩu an toàn, chỉ bật email tự phục vụ nếu có SMTP được kiểm thử.
- **Tài liệu cũ khác quyết định mới:** `01`, `02`, `03`, `04`, `05`, `06`, `07` vẫn có yêu cầu ảnh/GPS bắt buộc và một số cổng kiểm thử/triển khai liên quan. AI không sửa các file này; dùng mục “Quyết định nghiệp vụ đang có hiệu lực” trong `../plan.md` làm chuẩn và ghi phát hiện khác biệt tại đây.

## Phase 0 — kiểm tra ngày 09/10/2026

**Tiến độ:** 0.1–0.6 đều đã kiểm chứng theo phạm vi Phase 0. Chủ dự án xác nhận tự quản trị Git, Vercel, Supabase và cung cấp hai project ref khác nhau, cùng region Singapore. Đã phân biệt test/production; chưa áp migration hoặc nhập dữ liệu. Hướng dẫn thao tác từ đầu đến cuối nằm ở [`../SETUP_CLOUD.md`](../SETUP_CLOUD.md). Trong `../plan.md` chỉ đánh dấu các bước đã có bằng chứng.

### 0.1. Bảng thay thế đặc tả cũ

Đã đọc đủ `01`–`07`. Khi triển khai, áp dụng mục 2 của `../plan.md` theo quyết định mới ngày 09/10/2026. Các file đặc tả dưới đây chỉ đọc, không sửa.

| Chủ đề | Nội dung cũ cần bỏ qua | Quy tắc hiện hành và kiểm chứng cần có |
| --- | --- | --- |
| Ảnh/GPS | `01` §1, §3, §6; `02` §3–4; `03` §1, §7; `04` §4–5; `05` §2, §5; `06` §3, §6; `07` §4–5 yêu cầu đủ ảnh/GPS hoặc chặn khi từ chối quyền. | Hai dữ liệu **tùy chọn, độc lập**. Test bốn tổ hợp: cả hai, chỉ ảnh, chỉ GPS, không có; từ chối camera/GPS vẫn ghi event và tính công. Ảnh có thì private; upload ảnh lỗi không xóa event; thiếu ảnh không là ngoại lệ bắt buộc. GPS và ảnh nullable trong schema/API/queue; không đặt retention ảnh làm điều kiện chấm nếu không chọn lưu ảnh. UI báo thiếu bằng chứng như thông tin. |
| Ngoài văn phòng | `01` §5, `03` §2, §7, `05` §2, `07` §4–5 đặt cờ vào luồng HR kiểm tra; `06` §3, §6 coi tọa độ là cấu hình bắt buộc. | Nếu có GPS và tọa độ tham chiếu thì gắn nhãn để xem; **vẫn tính công bình thường**, không cần HR duyệt mới được tính. Test GPS ngoài bán kính và không có cấu hình văn phòng: cả hai đều không chặn công; trường hợp sau không suy ra ngoài văn phòng. |
| Offline sau khóa kỳ | `02` §4, `03` §3, §6–7, `05` §2, `06` §6 yêu cầu mở lại kỳ gốc để áp thay đổi sau khóa. | Không giới hạn ngày retry khi queue còn trên thiết bị. Event đến muộn giữ `work_date` gốc, `received_at` thực tế, idempotency; snapshot kỳ gốc giữ nguyên. HR đối soát và ghi điều chỉnh có audit vào **kỳ mở tiếp theo**; nếu kỳ đích đóng thì chuyển sang kỳ mở sau. Test retry lặp, đến muộn nhiều ngày, kỳ gốc/đích cùng khóa và Excel hai kỳ không cộng đôi. Mở lại kỳ chỉ là thao tác có audit riêng, không là điều kiện mặc định để nhận event. |
| Tăng ca ngày nghỉ | `01` §3–4, `02` §3, `03` §5, `05` §2 chỉ tính tăng ca khi có đơn duyệt. | Chủ nhật/ngày nghỉ: phần làm thực tế đã đủ chấm vào/ra tự thành tăng ca, trừ giao với khoảng nghỉ trưa của ca chung có hiệu lực (khởi tạo 12:00–13:00); không cần đơn. Ngày làm bù do admin đánh dấu áp quy tắc ngày làm việc. Test Chủ nhật, lễ, làm bù, thiếu mốc, giao giờ trưa của ca đã đổi và ngày thường ra muộn không có đơn. |
| Độ chính xác phút | `01`–`07` chưa chốt cách quy đổi giây sang phút nguyên. | Giữ timestamp đầy đủ, không làm tròn theo block. Cộng số giây theo từng loại công rồi lấy phút nguyên một lần ở kết quả ngày theo quyết định 0.6. Test biên 59/60/61 giây và nhiều khoảng lẻ cộng lại. |
| Phép năm | `01` §4, `02` §3 và `03` §4 mô tả cấp phép bằng giao dịch admin/HR nhưng chưa có lịch cộng tự động hằng tháng. | Chủ dự án chốt 12 ngày/năm, cộng 1 ngày vào ngày 1 mỗi tháng từ tháng nhân viên vào làm. Sổ phép cần giao dịch tháng idempotent; test tháng đầu, tháng tiếp theo, retry job và giới hạn 12 ngày trong năm theo chính sách. Số dư lịch sử nếu có do admin nhập có lý do. |

### 0.2–0.3. Đầu vào và người chịu trách nhiệm

| Đầu vào | Đã kiểm tra | Người cần xác nhận/cung cấp và tác động |
| --- | --- | --- |
| Git, Vercel, Supabase | `git remote -v` cho thấy remote `origin` là repository GitHub `KhangDepZai1802/Marixa_Workforce`. | Chủ dự án xác nhận **tự quản trị cả ba dịch vụ**. Không ghi email cá nhân hoặc secret vào đây. |
| Project thử nghiệm và production | Chủ dự án cung cấp `marixa-attendance-test`: ref `pkpwcpatuslfjyoivbuf`; `marixa-attendance-prod`: ref `vmpsfwwfgoeritayfnvv`. Chủ dự án xác nhận **cả hai ở Singapore**; hai ref khác nhau. | 0.2 hoàn tất theo thông tin chủ dự án; chỉ dùng test cho dữ liệu giả. Không ghi publishable key, connection string hay mật khẩu vào worklog. Region ghi theo tên người dùng xác nhận, chưa suy ra mã AWS cụ thể. Chưa kiểm tra kết nối/RLS, thuộc Phase 2. |
| Logo | `logo.png` có sẵn (213.778 byte, SHA-256 `9D1E9D9AD57B7B5C3674E7AEF626F480C63D74A7B891AF953698D19529F7E081`); ảnh chữ M xanh lam/cyan và sao vàng khớp mô tả `07`. | Chủ dự án xác nhận đây là asset **chính thức được phép dùng**; đối chiếu màu khi làm UI. |
| Lịch nghỉ/làm bù và phép | Admin sẽ tự nhập lịch nghỉ/làm bù trước vận hành. Chủ dự án chốt **12 ngày phép/năm, cộng 1 ngày vào ngày 1 mỗi tháng từ tháng nhân viên vào làm**. | Admin nhập lịch và số dư lịch sử nếu có ở Phase 7; thiếu lịch sẽ phân loại sai ngày nghỉ/tăng ca. Giao dịch cộng tháng cần chống lặp; không cấp sẵn 12 ngày. |
| Nhãn vị trí và ảnh | Chủ dự án chọn bật lưu ảnh và nhãn vị trí, ảnh giữ **3 tháng**; admin sẽ nhập tọa độ/bán kính sau. | Thiếu tọa độ thì chưa tính được nhãn, nhưng vẫn chấm công. Ảnh có thì lưu private; thiếu ảnh/GPS không chặn. Admin kiểm tra kích thước/chất lượng ảnh trước vận hành. |

### 0.4. Môi trường local

Lệnh kiểm tra: `node --version`, `npm.cmd --version`, `git --version`, `psql --version`, `pg_dump --version`, `pg_restore --version`. Kết quả: Node.js `v22.20.0`, npm `10.9.3`, Git `2.48.1.windows.1`, ba PostgreSQL client đều `18.4`. [Next.js hiện yêu cầu Node >= 20.9](https://nextjs.org/docs/app/getting-started/installation), nên phiên bản Node đáp ứng. PowerShell chặn `npm.ps1` theo Execution Policy hiện tại; dùng `npm.cmd` được, đã lấy đúng version. Không cài/chạy Docker.

### 0.5. Kiểm tra gói Free trên trang chính thức

Kiểm tra ngày 09/10/2026: [Supabase Free](https://supabase.com/docs/guides/platform/billing-on-supabase) cho **hai project Free** trên phạm vi các organization mà tài khoản là Owner/Administrator, database **500 MB/project**, Storage **1 GB**, egress **5 GB**, Auth **50.000 MAU**. [Vượt 500 MB database có thể làm project thành read-only](https://supabase.com/docs/guides/platform/database-size). [Project Free ít hoạt động trong khoảng 7 ngày có thể bị tạm dừng](https://supabase.com/docs/guides/platform/free-project-pausing); người quản trị phải theo dõi cảnh báo và chuẩn bị tiếp tục dịch vụ. [Free không có backup hằng ngày tự động](https://supabase.com/docs/guides/platform/backups); bản dump nghiệp vụ cũng không chứa file Storage, nên cần backup ảnh riêng và thử restore.

[Vercel Hobby](https://vercel.com/docs/plans/hobby) có hạn mức tài nguyên và [cron tối đa một lần/ngày, sai số có thể tới trong cùng giờ](https://vercel.com/docs/cron-jobs/usage-and-pricing). [Điều khoản Vercel](https://vercel.com/legal/terms) và [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines) giới hạn Hobby cho mục đích cá nhân, phi thương mại; dự án công ty, đặc biệt có người được trả công phát triển/vận hành, có rủi ro không phù hợp. **Deploy kỹ thuật trên Hobby không chứng minh được quyền vận hành hệ thống công ty.** Chủ dự án phải quyết định phương án phù hợp trước sử dụng thật; Phase 0 chỉ ghi nhận rủi ro, không thay đổi yêu cầu gói Free.

[Tài liệu API keys hiện hành của Supabase](https://supabase.com/docs/guides/getting-started/api-keys) dùng `sb_publishable_...` ở client và `sb_secret_...` ở server; key legacy `anon`/`service_role` đang được loại dần vào cuối 2026. `06-deployment-vercel-supabase.md` còn tên biến `SUPABASE_SERVICE_ROLE_KEY`; khi làm Phase 1–2 nên dùng `SUPABASE_SECRET_KEY` với SDK hiện hành, chỉ ở server, và kiểm tra lại khả năng tương thích. Đây là đề xuất cập nhật đặc tả, không sửa file được bảo vệ.

### 0.6. Quy tắc đã được chủ dự án xác nhận

Chủ dự án **đồng ý cả ba**: (1) ngày nghỉ trừ phần giao với nghỉ trưa của ca chung có hiệu lực, mặc định khởi tạo là 12:00–13:00 theo quyết định làm rõ bên dưới; (2) ngày làm bù do admin đánh dấu áp giờ làm và quy tắc tăng ca của ngày làm việc; (3) cộng thời gian thực tế theo giây trong từng loại công rồi lấy số phút nguyên một lần ở kết quả ngày. Đã cập nhật mục 2 `../plan.md`; dùng quy tắc này cho service tính công và test biên.

### Bổ sung kết nối ngày 09/10/2026

Chủ dự án cung cấp Session pooler cho test và production, cùng host `aws-0-ap-southeast-1.pooler.supabase.com`, cổng `5432`, user lần lượt `postgres.pkpwcpatuslfjyoivbuf` và `postgres.vmpsfwwfgoeritayfnvv`. Đã lưu **chỉ host/port/user/database** và lệnh kiểm tra test chỉ đọc trong [`../SETUP_CLOUD.md`](../SETUP_CLOUD.md). Mật khẩu chưa được cung cấp và không ghi URI vào repository. `git check-ignore -v .env.local .env.production.local` xác nhận cả hai mẫu file bị `.gitignore` bỏ qua. Chưa thử kết nối database hoặc chạy migration; việc này thuộc Phase 2 trên test.

### Việc Supabase Dashboard chủ dự án đã xác nhận ngày 09/10/2026

- Chủ dự án xác nhận trên cả **test** và **production** đã kiểm tra Email/Password bật, tắt **Allow new users to sign up** và **Allow anonymous sign-ins**. Đây là xác nhận thao tác Dashboard của chủ dự án; chưa kiểm tra bằng API và chưa cấu hình `.env.local`, nên 2.1 vẫn mở.
- Chủ dự án xác nhận đã tạo bucket `attendance-photos` **Private** trên cả hai project, cho phép MIME `image/jpeg`, `image/png`, `image/webp`. PNG là lựa chọn thêm so với ví dụ WebP/JPEG trong `06-deployment-vercel-supabase.md`; validation/upload trong ứng dụng phải khớp cả ba MIME và test dung lượng PNG. Kích thước tối đa, policy Storage và quyền truy cập còn chờ thử/kiểm chứng; 2.6 vẫn mở. Không ghi ảnh thật vào bucket test.
- Chủ dự án giữ riêng mật khẩu DB và secret key trong password manager; không gửi qua chat, không commit. URL/redirect Auth, SMTP, admin bootstrap, migration, RLS, Storage policies và dữ liệu chỉ làm khi ứng dụng/kiểm thử tương ứng đã sẵn sàng. Đây là công việc của Phase 2/9, không phải bước đã hoàn thành.
- Phát hiện cấu trúc ngày 09/10/2026: `plan.md` và `SETUP_CLOUD.md` hiện nằm trong `docs/`, còn root không có `plan.md`, khác quy tắc ở `AGENTS.md`. Theo chỉ đạo mới nhất của chủ dự án trong cuộc trò chuyện, AI chỉ được sửa `plan.md` đang dùng làm checklist (`docs/plan.md`) và `docs/worklog.md`; các file khác, gồm `docs/SETUP_CLOUD.md`, chỉ đọc. Chỉ đạo trực tiếp này ưu tiên khi làm việc; đề xuất chủ dự án đồng bộ lại `AGENTS.md` khi thuận tiện để agent sau không nhầm vị trí checklist.

### Vercel — chuẩn bị tài khoản, chưa deploy (09/10/2026)

Đã kiểm tra `rg --files` không thấy `package.json`, `next.config.*` hoặc `vercel.json`: ứng dụng Next.js chưa được tạo. Chưa import project Marixa, cấu hình environment variables hoặc deploy. Theo [điều khoản Hobby](https://vercel.com/legal/terms) và [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines) kiểm tra ngày 09/10/2026, Hobby chỉ cho mục đích cá nhân phi thương mại; hệ thống chấm công công ty cần phương án được Vercel cho phép trước Phase 9. Để triển khai sau này: chọn Next.js/root chứa `package.json`, Production trỏ Supabase production và Preview trỏ test, secret chỉ ở server; cấu hình Auth redirect khi có URL thật. Không đánh dấu 9.0–9.3 trước khi có bằng chứng.

Chủ dự án đã vào Dashboard Vercel của tài khoản `KhangDeploy`, gói **Hobby** (ảnh chụp màn hình cung cấp ngày 09/10/2026). Dashboard có project `polymind-chinese` của repository khác; chưa có project Marixa. Chủ dự án muốn dùng Gmail/Google để đăng nhập, không dùng GitHub làm phương thức đăng nhập. Ảnh Dashboard chưa chứng minh phương thức đăng nhập đã liên kết, cần kiểm tra tại Account Settings → Authentication. Không tạo project Marixa trước khi có ứng dụng Next.js và giải quyết điều kiện sử dụng gói Hobby cho công việc công ty.

Ảnh chụp tiếp theo tại Account Settings → Authentication xác nhận phương thức **Google** và **Email** đã liên kết với tài khoản Vercel; **GitHub** hiển thị `Connect`, tức chưa liên kết làm phương thức đăng nhập. Không ghi địa chỉ email vào repository. Bước chuẩn bị tài khoản Vercel đã đủ; chỉ cần tạo project Marixa và cấu hình môi trường sau khi ứng dụng Next.js sẵn sàng.

**Quyết định mới của chủ dự án (09/10/2026):** bản triển khai Vercel là **đồ án cá nhân**, không phải hệ thống chấm công đang vận hành cho công ty. Vì vậy áp dụng hướng triển khai Vercel Hobby cho mục đích cá nhân phi thương mại. Ghi chú trước đây về rủi ro Hobby đối với hệ thống công ty chỉ còn là điều kiện cần xem lại nếu mục đích sử dụng thực tế thay đổi. Theo [Fair Use Guidelines của Vercel](https://vercel.com/docs/limits/fair-use-guidelines), tính thương mại phụ thuộc vào việc sử dụng deployment, không chỉ tên gọi dự án. Chưa tạo project hoặc deploy, nên Phase 9 vẫn chưa được đánh dấu hoàn thành.

**Kiểm tra thay đổi:** trong lượt này cập nhật `../plan.md`, `worklog.md` và tạo hướng dẫn `../SETUP_CLOUD.md`; kiểm tra `git diff` trước khi kết thúc để xác nhận không sửa Markdown được bảo vệ. Các thay đổi Git có sẵn ở cây dự án cũ được giữ nguyên.

## Quy tắc cập nhật worklog

- Mỗi lượt: ghi ngày, thay đổi thực tế, kiểm tra đã chạy và kết quả; chuyển việc xong khỏi “Việc tiếp theo”.
- Bug ghi triệu chứng, bước tái hiện, mức ảnh hưởng, tình trạng xử lý. Khi hết lỗi thì ghi cách sửa và ngày đóng.
- Bảy tài liệu đặc tả trong `docs/` là nguồn tham chiếu chỉ đọc cho AI. Nếu quyết định nghiệp vụ đổi, ghi quyết định và ảnh hưởng vào worklog để người sở hữu tài liệu xử lý; AI không sửa các file đó.

## Kế hoạch triển khai

Checklist thực thi chi tiết, cách làm và điều kiện đánh dấu từng bước nằm trong [`../plan.md`](../plan.md). File này lưu quyết định nghiệp vụ mới, tiến độ thực tế và bằng chứng kiểm chứng; hiện chưa có phase triển khai nào hoàn tất.

## Đánh giá nhanh backend Marixa-ChamCong — 09/10/2026

### Tiêu chí và phát hiện

Dùng các quyết định đang hiệu lực trong `docs/plan.md` làm chuẩn khi chúng khác các đặc tả `docs/01`–`07`. Trước khi sửa, backend bắt buộc GPS khi tạo event; function SQL cũng chặn chấm nếu chưa cấu hình văn phòng và retention ảnh. Service tính công bỏ qua ngày nghỉ, cắt giây trước khi quy đổi phút, và coi thiếu ảnh hoặc event online chưa được HR đánh dấu là ngoại lệ chặn khóa kỳ. Chưa có giao dịch phép năm cộng tự động, điều chỉnh kỳ sau cho event offline đến sau khóa kỳ, UI nghiệp vụ hoặc queue IndexedDB.

### Thay đổi đã làm

- API và migration `202610090012_optional_evidence_and_leave_accrual.sql`: GPS nullable theo nhóm đầy đủ hoặc không gửi; thiếu GPS/ảnh không chặn event; `not_provided` không bị xem là lỗi; hỗ trợ PNG cùng JPEG/WebP; thiếu văn phòng không suy ra ngoài văn phòng.
- Service tính công giữ thời gian theo giây, cho ngày nghỉ/lễ tính giờ thực tế thành tăng ca sau khi trừ giờ trưa, và không sinh ngoại lệ vắng mặt vào ngày nghỉ. Cờ ngoài văn phòng, GPS thiếu/độ chính xác thấp và ảnh hết hạn không tự chặn khóa kỳ.
- Thêm cấp 1 ngày phép theo tháng, có khóa idempotent theo nhân viên/tháng; cron hiện tại chạy cùng dọn ảnh.
- Event offline vào kỳ đã khóa được lưu mà không sửa snapshot gốc; tạo khoản điều chỉnh chờ HR ở kỳ mở. Thêm endpoint HR duyệt/từ chối, buộc tính lại snapshot sau khi duyệt và xuất riêng phần điều chỉnh kỳ trước trong Excel.
- Cập nhật server secret thành `SUPABASE_SECRET_KEY`; loại bỏ `tsconfig.tsbuildinfo` sinh tự động khỏi repository; cập nhật README/kiến trúc trong project con.

### Kiểm tra và phần còn mở

`npm test` đạt 6/6 kiểm thử đơn vị; `npm run build` đạt trên Next.js 16.4.0 (build đã chạy kiểm tra TypeScript). Migration mới chưa được áp hoặc chạy thử trên PostgreSQL/Supabase test; chưa có kiểm thử RLS, Storage, API tích hợp, luồng trên điện thoại hoặc restore. Không có `.env.local`/kết nối test được cung cấp trong repository.

Tại thời điểm đánh giá backend, checklist triển khai vẫn còn mở: UI đăng nhập/chấm công/HR/admin, queue IndexedDB, kiểm thử tích hợp/e2e, lint, cấu hình và xác nhận test Supabase, backup/restore hoặc deploy chưa được hoàn tất; các phase chưa được đánh dấu. Khi đó app nằm ở `Marixa-ChamCong/web`; sau lượt tái dựng, app mới nằm trong `react/`. Cấu hình root directory trong `docs/SETUP_CLOUD.md` vẫn cần được rà soát theo cấu trúc hiện tại.

### Tái dựng giao diện React/Next.js trong thư mục riêng — 09/10/2026

Theo yêu cầu mới nhất của chủ dự án, tạo ứng dụng Next.js App Router tại `react/` ở repository root, tách khỏi API .NET. Bản triển khai Vercel cần đặt Root Directory là `react`; hướng dẫn local/env/deploy nằm ở `react/README.md`. Đã đưa logo chính thức, font Be Vietnam Pro và giấy phép font vào `react/public/`; thêm `.env.example`, dependency lockfile, cấu hình lint, TypeScript, build và lịch cron dọn ảnh. Không thêm secret.

Đã dựng các màn hình đăng nhập/đổi mật khẩu, chấm công hôm nay, lịch sử công, hồ sơ cá nhân, đơn nghỉ/tăng ca/sửa công, dashboard HR, hồ sơ nhân viên, đối soát event và xem ảnh riêng tư, hàng đợi duyệt, sổ phép, kỳ công/snapshot/ngoại lệ/điều chỉnh kỳ trước/Excel, tài khoản, cấu hình, nhật ký admin. Giao diện gọi API Supabase hiện có; bổ sung API login/logout, danh sách loại nghỉ, duyệt event HR và audit. Hàng đợi offline giữ IndexedDB đến khi server xác nhận; sửa tên field multipart ảnh thành `photo` khớp với Route Handler. Migrations và bootstrap SQL được chép vào `react/supabase/`.

**Kiểm chứng local:** trong `react/`, `npm.cmd run check` đạt lint, TypeScript và 6/6 unit tests; `npm.cmd run build` hoàn tất trên Next.js 16.4.0. Chạy `npm.cmd run dev -- --hostname 127.0.0.1`; `/login` trả 200, `/` và `/today` không có phiên Supabase đều chuyển tới `/login`. `npm.cmd audit --omit=dev` báo 0 lỗ hổng production. `npm.cmd audit` còn 5 cảnh báo high trong cây công cụ lint (`braces` → `micromatch` → `fast-glob` → ESLint Next); `npm audit fix --force` đề xuất hạ `eslint-config-next` xuống 14.2.35 nên không áp dụng. Không có `.env.local`, do đó chưa kiểm thử đăng nhập thật, RLS, Storage, API với Supabase, trải nghiệm viewport/điện thoại, migration, deploy hoặc restore.

**Khác biệt cấu trúc và giới hạn thao tác:** checklist/đặc tả trong `docs/` không bị sửa. Bản scaffold trước ở `Marixa-ChamCong/web` vẫn còn để giữ nguyên trạng thái tracked của repository; đã xác nhận không có thay đổi chưa lưu hoặc `.env.local` tại đó, đã sao chép toàn bộ 56 file tracked cần thiết sang `react/` (font/license được chuyển sang `react/public/fonts/`). PowerShell chặn lệnh xóa đệ quy thư mục cũ theo chính sách công cụ, nên chưa dọn được bản scaffold/cache khỏi đường dẫn cũ. Ứng dụng mới có thể chạy độc lập từ `react/`; khi cần bỏ hẳn bản cũ phải dùng thao tác quản lý Git/file được phép.

Trong working tree, `Marixa-ChamCong/M.API/appsettings.json` đang có thay đổi và `Marixa-ChamCong/M.API/Seed/SampleUsers.sql`, `.agnes/uploads/` đang là dữ liệu chưa commit; lượt tái dựng React không sửa các nội dung này.

## Làm rõ ca làm chung do admin quản lý — 09/10/2026

Chủ dự án sửa cách hiểu trước đây: các mốc thứ 2–thứ 7, 08:00–17:00, nghỉ 12:00–13:00 và miễn trừ đi trễ 0 phút là **giá trị mặc định**, không phải quy tắc cố định. Chủ dự án xác nhận V1 dùng **một ca chung cho toàn bộ nhân viên**; admin có chức năng chỉnh ngày làm, giờ bắt đầu/kết thúc, nghỉ trưa, phút miễn trừ đi trễ và ngày hiệu lực. Mỗi thay đổi phải có phiên bản/audit; ngày công chọn phiên bản có hiệu lực, ngày nghỉ trừ khoảng nghỉ trưa của phiên bản đó; snapshot kỳ đã khóa giữ nguyên. Không gán ca riêng theo nhân viên trong V1.

Theo cho phép trực tiếp của chủ dự án trong lượt này, đã cập nhật các file Markdown liên quan: `docs/plan.md`, `docs/01-business-analysis.md`, `docs/02-database-design.md`, `docs/03-workflow.md`, `docs/04-system-architecture.md`, `docs/05-testing-strategy.md`, `docs/06-deployment-vercel-supabase.md`, `docs/07-ui-design-system.md` và worklog. Đây là ngoại lệ có phạm vi cho quyết định ca làm so với quy tắc chỉ đọc mặc định của `AGENTS.md`; không sửa mã ứng dụng hoặc đánh dấu checklist hoàn thành.

**Đối chiếu mã hiện tại:** bảng `work_policies` và API `POST /api/v1/admin/settings/work-policies` đã có trường giờ, ngày làm, miễn trừ và ngày hiệu lực; chưa có màn hình admin để quản lý ca. Trong `web/src/lib/domain/timesheet.ts`, nhánh ngày nghỉ vẫn dùng cứng 12:00–13:00, cần thay bằng khoảng nghỉ của policy có hiệu lực và thêm test ca đổi/ngày hiệu lực trước khi coi chức năng hoàn thành. Cần kiểm tra ràng buộc các khoảng hiệu lực không chồng lấn và lịch sử/audit trên Supabase test; chưa có bằng chứng chạy migration/test tích hợp cho ca chung.

## Chốt kiến trúc .NET API + Supabase — 09/10/2026

Chủ dự án xác nhận **.NET là API chính; Supabase cung cấp PostgreSQL, Auth và Storage**. Đây là quyết định kiến trúc mới, ưu tiên hơn các phần của `docs/plan.md` và đặc tả cũ mô tả Next.js Route Handlers là backend chính. Chưa có quyết định thay đổi công nghệ giao diện hoặc nhà cung cấp host API .NET; không mặc định rằng Vercel sẽ chạy API .NET. Hai Supabase project test/production đã được chủ dự án tạo riêng; không ghi key, mật khẩu hay connection string chứa secret vào Git.

Đối chiếu mã vừa pull (`60402a8`): `M.API` có cấu hình Npgsql/EF Core cho PostgreSQL nhưng mặc định chọn SQL Server; đăng nhập/phân quyền dùng ASP.NET Identity và JWT riêng; ảnh chấm công ghi vào `wwwroot/uploads` và phục vụ qua `/uploads`. Khi chọn PostgreSQL, `Program.cs` gọi `EnsureCreatedAsync` và `PostgresSchemaSync.EnsureColumnsAsync` lúc khởi động. Migration EF mới và 12 migration SQL Supabase/Next.js là hai thiết kế schema khác nhau; chưa có bằng chứng chúng tương thích hoặc migration nào đã chạy trên project test. `Marixa-ChamCong/web/` và ứng dụng mới tại `react/` đều có Next.js/Supabase backend riêng; chưa thấy tích hợp gọi `M.API`.

Hướng chuyển đổi cần được phản ánh vào checklist triển khai trước khi đánh dấu phase hoàn thành:

1. Chọn một schema và lịch sử migration chuẩn cho PostgreSQL Supabase; đối chiếu model EF với bảng/RLS SQL hiện có trên môi trường test. Không chạy đồng thời hai bộ migration hoặc tự đồng bộ schema trên project production khi chưa có thiết kế và kiểm thử.
2. Chuyển nguồn danh tính sang Supabase Auth: API .NET xác minh access token Supabase, liên kết `auth.users.id` với hồ sơ/role nghiệp vụ, rồi kiểm tra quyền cho từng endpoint và truy vấn. Không coi JWT do .NET tự phát hành hay bảng Identity hiện có là tài khoản Supabase Auth. Kiểm thử quyền employee A/B, HR, admin ở API và DB/RLS.
3. Chuyển ảnh chấm công sang Supabase Storage bucket private, kiểm tra MIME/kích thước, quyền đọc/ghi và dọn ảnh sau 3 tháng; không phục vụ ảnh nhân viên công khai từ `/uploads`.
4. Giữ các quyết định nghiệp vụ đã chốt: một ca chung do admin chỉnh với ngày hiệu lực, ảnh/GPS tùy chọn, ngày nghỉ tự tính tăng ca sau khi trừ giờ nghỉ của ca có hiệu lực, phép cộng theo tháng, offline và điều chỉnh kỳ đã khóa. Rà soát API/service .NET theo từng quy tắc trước khi coi là hoàn thành.
5. Xác định frontend gọi API .NET và nơi host API; cập nhật sơ đồ triển khai, biến môi trường, quy trình test/backup/deploy cho hai Supabase project. Chỉ áp schema lên test và thử nghiệm tích hợp trước production.

Trong lượt ghi nhận quyết định kiến trúc trước đó, chỉ ghi quyết định và đề xuất chuyển đổi vào `docs/worklog.md`; chưa sửa `docs/plan.md` hoặc các đặc tả được bảo vệ, chưa thay đổi mã, chưa chạy migration hay cấu hình cloud. Trạng thái checklist Phase 1–9 vẫn cần đối chiếu lại theo kiến trúc mới và bằng chứng thực tế.

## Đổi đăng nhập React sang số điện thoại — 09/10/2026

Form đăng nhập trong `react/` nhận số điện thoại. Route Handler chuẩn hóa dấu phân cách và tiền tố `+84`/`0084`, tìm hồ sơ nhân viên đang hoạt động theo `employees.phone`, rồi dùng `work_email` ở phía server để đăng nhập Supabase Auth bằng mật khẩu hiện có. Email không trả về client; số không khớp hoặc bị trùng nhận cùng lỗi thông tin đăng nhập. Không dùng SMS/OTP.

Điều kiện sử dụng: số điện thoại phải có trong hồ sơ nhân viên Supabase và hồ sơ đó cần khớp với tài khoản Auth cùng `app_users` đang hoạt động. Dữ liệu chỉ có trong SQL Server chưa đủ để đăng nhập ứng dụng React. Thay đổi này tiếp tục dùng Route Handler/Supabase hiện tại; chưa chuyển frontend sang xác thực qua `M.API` .NET và chưa kiểm chứng trên Supabase thật. `react/.env.local` hiện chưa có; cần cấu hình `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` và `SUPABASE_SECRET_KEY` phía server để chạy luồng này.
