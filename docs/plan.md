# Kế hoạch triển khai hệ thống chấm công Marixa V1

Ngày lập: 09/10/2026 (Asia/Ho_Chi_Minh). Trạng thái: **chưa triển khai ứng dụng**. Đây là checklist thực thi từ mã nguồn trống đến bản deploy kỹ thuật hoạt động trên Vercel Hobby và Supabase Free.

## 1. Cách dùng kế hoạch

1. Đọc `AGENTS.md`, `docs/worklog.md`, rồi đọc các file `docs/01`–`07` để lấy chi tiết nghiệp vụ/kiến trúc. **Không sửa bất kỳ file `*.md` nào trong `docs/` ngoài `docs/worklog.md`.** Khi đặc tả cũ khác quyết định mới, áp dụng mục 2 của file này và ghi khác biệt vào worklog.
2. Làm các phase theo thứ tự. Trong mỗi phase, làm checklist từ trên xuống. Chỉ đổi `[ ]` thành `[x]` sau khi đã làm **và kiểm chứng**; ghi ngày, commit/file thay đổi, lệnh hoặc thao tác kiểm tra và kết quả vào worklog. Một phase hoàn thành khi mọi ô của phase và tiêu chí nghiệm thu của phase đều đạt.
3. Mọi secret nằm trong máy quản trị/Vercel Environment Variables, không commit `.env.local`, mật khẩu, connection string hoặc service-role key. Dữ liệu thử nghiệm là dữ liệu giả; không chạy test phá dữ liệu trên production.
4. Không dùng Docker, Docker Desktop, `supabase start`, `supabase db dump`, Dockerfile hoặc docker-compose. Dùng Node.js để chạy web và PostgreSQL client cài trực tiếp (`psql`, `pg_dump`, `pg_restore`) để quản lý database hosted.
5. Nếu một bước gặp thiếu đầu vào, ghi rõ người cần cung cấp, tác động và việc có thể làm tiếp vào worklog. Không đánh dấu hoàn thành thay cho kết quả thật.

## 2. Quyết định nghiệp vụ đang có hiệu lực

Các dòng dưới đây **ưu tiên hơn nội dung cũ mâu thuẫn trong `docs/01`–`07`**, theo trả lời mới nhất của chủ dự án ngày 09/10/2026. Không sửa các file đặc tả được bảo vệ.

| Chủ đề | Quy tắc phải triển khai |
| --- | --- |
| Ngoài văn phòng | Vẫn ghi nhận và **tính công bình thường**. Nếu có GPS thì có thể gắn nhãn vị trí để tham khảo; nhãn này không chặn công, không đòi HR duyệt mới được tính. |
| Ảnh và GPS | **Tùy chọn, độc lập nhau.** Có cả hai, một trong hai hoặc không có đều chấm công được. Không yêu cầu sửa công chỉ vì thiếu ảnh/GPS. Ảnh có thì lưu private; GPS có thì tính khoảng cách/cờ vị trí. |
| Offline | Không giới hạn số ngày đồng bộ muộn. Giữ event local và retry đến khi server xác nhận, trừ khi người dùng tự xóa dữ liệu trình duyệt/thiết bị hỏng. Nếu ngày gốc thuộc kỳ đã khóa, giữ snapshot kỳ cũ; xử lý chênh lệch bằng **điều chỉnh ở kỳ đang mở tiếp theo**, có liên kết ngày/kỳ gốc và audit, không ghi đè kỳ cũ. |
| Cách tính | Tính theo **từng phút thực tế**, không làm tròn lên/xuống theo block 5/15/30 phút. Giữ timestamp đầy đủ; tính khoảng thời gian bằng giây rồi quy đổi thành số phút nguyên ở kết quả ngày theo một quy tắc duy nhất, có test biên. |
| Ca làm chung | Admin quản lý **một ca chung áp dụng cho toàn bộ nhân viên**: ngày làm việc trong tuần, giờ bắt đầu/kết thúc, giờ bắt đầu/kết thúc nghỉ trưa, số phút miễn trừ đi trễ và ngày hiệu lực. Thứ 2–thứ 7, 08:00–17:00, nghỉ 12:00–13:00, miễn trừ 0 phút chỉ là **giá trị khởi tạo**, không phải giờ cố định trong phép tính. Thay đổi tạo phiên bản cấu hình mới có audit; ngày công dùng phiên bản có hiệu lực vào ngày đó, kỳ đã khóa giữ nguyên snapshot. V1 không gán ca riêng theo nhân viên. |
| Chủ nhật/ngày nghỉ | Cho chấm công. Giờ làm thực tế của ngày nghỉ được **tự động tính tăng ca**, không cần đơn tăng ca được duyệt. Trừ phần giao với **khoảng nghỉ trưa của ca chung có hiệu lực trong ngày**; không tính giờ chưa có đủ chấm vào/ra. Ngày làm bù do admin đánh dấu là ngày làm việc thì áp quy tắc ca chung. |
| Ngày làm việc bình thường | Dùng các khoảng làm việc của **ca chung có hiệu lực** thay cho mốc giờ cố định. Phần ngoài giờ chỉ tính tăng ca trong khoảng đã được duyệt; chấm ra muộn riêng lẻ không tự tạo tăng ca. Đi trễ/về sớm so với ca có hiệu lực, có xét số phút miễn trừ đi trễ do admin đặt. |
| Phép năm | Mức phép năm là **12 ngày/năm, cộng 1 ngày vào ngày 1 mỗi tháng**, bắt đầu từ tháng nhân viên vào làm; không cấp sẵn cả 12 ngày. Giao dịch cộng tháng phải idempotent. Số dư lịch sử khi chuyển hệ thống, nếu có, do admin nhập có lý do. |
| Cấu hình bằng chứng | Dùng `logo.png` chính thức; lưu ảnh chấm công private với thời hạn **3 tháng**; dùng GPS nếu có để gắn nhãn vị trí tham khảo. Admin nhập lịch nghỉ/làm bù và tọa độ/bán kính văn phòng trước vận hành. Thiếu ảnh/GPS hoặc chưa có tọa độ vẫn chấm công được. |

**Quyết định triển khai đã được chủ dự án xác nhận ở Phase 0 và làm rõ ngày 09/10/2026:** ngày nghỉ trừ khoảng nghỉ trưa của ca chung có hiệu lực (mặc định ban đầu 12:00–13:00); ngày làm bù do admin đánh dấu được xem là ngày làm việc; số phút nguyên được lấy sau khi cộng khoảng thời gian thực tế theo giây trong từng loại công. Admin có chức năng chỉnh ca chung và ngày hiệu lực; không cố định mốc 08:00/12:00/13:00/17:00 trong logic.

**Quy tắc dữ liệu cho kỳ khóa:** event đến muộn vẫn được lưu với `work_date` gốc và `received_at` thực tế. Lần nhận đầu tiên tạo hoặc cập nhật một đề xuất điều chỉnh; các lần retry cùng `idempotency_key` trả cùng event, không tạo thêm điều chỉnh. HR đối soát chênh lệch giữa dữ liệu gốc đã khóa và dữ liệu mới, ghi nhận lý do, rồi đưa khoản tăng/giảm công hoặc tăng ca vào kỳ đang mở tiếp theo. Báo cáo kỳ gốc giữ nguyên snapshot; báo cáo kỳ nhận điều chỉnh hiển thị riêng cột “Điều chỉnh kỳ trước”, ngày/kỳ nguồn và người duyệt. Nếu kỳ hiện tại cũng đã khóa, chuyển đề xuất đến kỳ mở tiếp theo. Không tự động cộng vào kỳ trước hoặc hai kỳ cùng lúc.

## Phase 0 — Chuẩn bị đầu vào và môi trường

**Mục tiêu:** xác nhận phạm vi, dữ liệu cấu hình, tài khoản và cách kiểm chứng trước khi viết mã.

- [x] 0.1. Đọc đặc tả `01`–`07`, lập bảng những điểm bị mục 2 thay thế trong `docs/worklog.md` (ảnh/GPS bắt buộc, ngoài văn phòng, offline kỳ khóa, tăng ca ngày nghỉ và các test tương ứng). Khi code, lấy mục 2 làm chuẩn.
- [x] 0.2. Xác nhận người quản trị tài khoản Git, Vercel, Supabase; chọn một Supabase project thử nghiệm và một project production riêng, kèm region phù hợp. Ghi project reference (không ghi secret) vào worklog.
- [x] 0.3. Xác nhận `logo.png` chính thức; admin chịu trách nhiệm nhập lịch nghỉ/làm bù và địa điểm/bán kính tham khảo trước vận hành; chốt phép năm cộng 1 ngày vào ngày 1 mỗi tháng từ tháng vào làm và ảnh lưu 3 tháng. Dữ liệu lịch, tọa độ và số dư lịch sử (nếu có) sẽ được admin nhập ở Phase 7; thiếu địa điểm không được chặn chấm công.
- [x] 0.4. Cài Node.js phiên bản được Next.js hiện hành hỗ trợ, package manager, Git và `psql`/`pg_dump`/`pg_restore` trực tiếp; ghi phiên bản đã cài. Không cài Docker.
- [x] 0.5. Kiểm tra lại gói Free, hạn mức, cơ chế tạm dừng/backup và điều khoản Vercel Hobby trên trang chính thức. Ghi rủi ro Hobby cho hệ thống công ty vào worklog; deploy kỹ thuật không đồng nghĩa được phép vận hành thương mại.
- [x] 0.6. Xác nhận ba giả định triển khai ở mục 2 (nghỉ trưa ngày nghỉ, ngày làm bù và quy đổi giây ra phút nguyên). Ghi lựa chọn cuối cùng vào worklog và sửa `plan.md` nếu cần.

**Đạt khi:** có danh sách đầu vào và người chịu trách nhiệm, hai môi trường được phân biệt, điều kiện Free đã ghi rõ; chưa cần code hoặc triển khai cloud ở phase này.

## Phase 1 — Tạo ứng dụng Next.js và nền giao diện

**Mục tiêu:** repository build được, có route rõ và cấu trúc để các module dùng chung.

- [ ] 1.1. Khởi tạo Next.js App Router + React + TypeScript tại root repository; thêm script `dev`, `build`, `lint`, `test` và khóa dependency trong lockfile. Chạy `npm run dev` và `npm run build`.
- [ ] 1.2. Tạo các nhóm route `/login`, `/change-password`, `/today`, `/my-attendance`, `/my-requests`, `/my-profile`, `/hr/*`, `/admin/*`; route chưa có tính năng phải hiển thị trạng thái rõ ràng, không giả dữ liệu thật.
- [ ] 1.3. Tạo `src/lib` hoặc thư mục tương đương cho Supabase client, auth, phân quyền, tính công, thời gian `Asia/Ho_Chi_Minh`, validation, lỗi API và audit. Tạo Route Handlers dưới `/api/v1`; không đặt logic tính công riêng trong các trang.
- [ ] 1.4. Dựng token màu/chữ/khoảng cách và layout mobile/desktop theo `docs/07-ui-design-system.md`; thêm loading, empty, error, trạng thái offline và điều hướng bàn phím.
- [ ] 1.5. Tạo `.env.example` chỉ có tên biến (`NEXT_PUBLIC_SUPABASE_URL`, publishable key, server secret, app URL, `CRON_SECRET`) và kiểm tra `.gitignore` bỏ qua file chứa giá trị thật. Không đọc server secret trong Client Component.

**Đạt khi:** trang khung hiển thị ở 375px và desktop, refresh route đúng, lint/build sạch, không có secret trong Git hoặc bundle.

## Phase 2 — Supabase thử nghiệm, migration và RLS

**Mục tiêu:** dữ liệu và quyền đủ an toàn để các phase sau nối vào.

- [ ] 2.1. Tạo Supabase Free project thử nghiệm hosted; bật Auth email/mật khẩu, tắt đăng ký công khai, lưu URL/publishable key trong `.env.local`, secret quản trị chỉ ở server/máy quản trị.
- [ ] 2.2. Viết migration SQL có version trong `supabase/migrations/`. Tạo bảng hồ sơ/tài khoản, chính sách, lịch nghỉ, event công, ảnh tùy chọn, yêu cầu sửa, nghỉ phép/sổ phép, tăng ca, kỳ/snapshot, **điều chỉnh kỳ trước** và audit. Tạo bảng lịch sử migration để biết file nào đã áp.
- [ ] 2.3. Thiết kế `attendance_events` với `work_date`, `kind`, `occurred_at`, `device_occurred_at`, `received_at`, `source`, `idempotency_key` và GPS **nullable**. Cho phép không có record `attendance_photos`; nếu có ảnh thì ảnh gắn duy nhất với event. Thêm trạng thái `not_provided`/`ready`/`upload_failed`/`expired` hoặc giá trị tương đương, không coi `not_provided` là lỗi công.
- [ ] 2.4. Tạo unique constraint cho một chấm vào và một chấm ra hợp lệ mỗi người/ngày, khóa idempotency, một admin active, một giao dịch sổ phép/đơn/phiên bản, một giao dịch cộng phép mỗi nhân viên/tháng và một điều chỉnh cho cùng event + kỳ đích. Ghi audit cho việc áp/mở lại điều chỉnh.
- [ ] 2.5. Bật RLS trên mọi bảng nghiệp vụ, thu hồi grant không cần thiết và viết policy cho `anon`, employee A/B, HR, admin. Client không được sửa trực tiếp event gốc, ledger, snapshot, audit hay điều chỉnh. Các mutation đi qua API/service có kiểm tra session và role.
- [ ] 2.6. Tạo bucket `attendance-photos` **private** cho người muốn gửi ảnh; MIME đã chọn trên test/production là `image/jpeg`, `image/png`, `image/webp` theo xác nhận của chủ dự án. Chốt và cấu hình kích thước tối đa sau khi thử ảnh trên điện thoại; kiểm tra policy Storage theo quyền. Không tạo file rỗng giả làm bằng chứng; không bắt người dùng cấp quyền camera/GPS để truy cập nút chấm.
- [ ] 2.7. Chạy migration bằng `psql -v ON_ERROR_STOP=1` trên project thử nghiệm; tạo seed giả và một admin bằng bootstrap phía server. Kiểm tra schema, ràng buộc, RLS và quyền Storage bằng các tài khoản thử nghiệm.

**Đạt khi:** project thử nghiệm tạo được dữ liệu giả, chặn truy cập chéo và ghi trái quyền, nullable evidence hoạt động, migration áp theo version và có cách tái tạo môi trường thử nghiệm.

## Phase 3 — Tài khoản, phiên đăng nhập và hồ sơ

**Mục tiêu:** người dùng vào đúng màn hình và API theo quyền.

- [ ] 3.1. Tích hợp Supabase Auth SSR/cookie theo SDK hiện hành; xác thực lại user phía server cho route riêng tư và mọi API. Route có dữ liệu cá nhân không được cache dùng chung giữa người dùng.
- [ ] 3.2. Làm đăng nhập/đăng xuất, tài khoản bị khóa, hết phiên, lỗi mạng và buộc đổi mật khẩu tạm ở lần đầu. Admin cấp/reset tài khoản qua server, không để service-role key đến client.
- [ ] 3.3. Làm hồ sơ cá nhân, danh sách/tạo/sửa hồ sơ cơ bản cho HR, cấp role/trạng thái cho admin. Hồ sơ còn khi tài khoản bị khóa; chặn admin thứ hai và chặn khóa admin active cuối cùng.
- [ ] 3.4. Kiểm tra quyền ở cả UI, API và RLS; ẩn menu chỉ là hỗ trợ, không thay bảo vệ server. Ghi audit khi cấp tài khoản, reset mật khẩu, đổi role hoặc khóa tài khoản.

**Đạt khi:** tài khoản thử của employee, HR, admin xem đúng dữ liệu; gọi API trái quyền bị từ chối; người dùng không thể tự nâng role hoặc tự bỏ qua đổi mật khẩu tạm.

## Phase 4 — Chấm công online và bằng chứng tùy chọn

**Mục tiêu:** chấm vào/ra ổn định khi có mạng, kể cả không có ảnh và GPS.

- [ ] 4.1. Dựng trang `/today` với một nút chính theo trạng thái: chưa vào → chấm vào; đã vào → chấm ra; đã đủ → xem lịch sử/yêu cầu sửa. Dùng ngày nghiệp vụ `Asia/Ho_Chi_Minh`; V1 không có ca qua đêm.
- [ ] 4.2. Cho người dùng chọn chụp ảnh và lấy GPS nhưng có thể tiếp tục ngay khi một hoặc cả hai quyền bị từ chối hoặc thiết bị không hỗ trợ. UI báo “Không có ảnh/vị trí” như thông tin, không gọi là chấm công thất bại.
- [ ] 4.3. Khi nhấn chấm, client tạo `idempotency_key`, thời điểm thiết bị và payload tùy chọn. Server lấy employee từ session, xác nhận active, xác định online time bằng giờ server, `work_date` theo múi giờ công ty và kiểm tra một event/người/ngày/loại.
- [ ] 4.4. Trả cùng event khi retry cùng khóa; nếu thiết bị khác đã tạo loại event đó, trả xung đột và chỉ đường yêu cầu sửa. Không ghi đè event gốc.
- [ ] 4.5. Nếu có GPS và có tọa độ văn phòng, tính khoảng cách/cờ trong/ngoài; **cờ ngoài văn phòng không ảnh hưởng số công**. Nếu thiếu GPS hoặc địa điểm chưa cấu hình, để trạng thái `không có vị trí`, không suy ra ở ngoài.
- [ ] 4.6. Nếu có ảnh, nén/định hướng ảnh, upload private, kiểm tra chủ sở hữu/MIME/kích thước, rồi gắn metadata. Upload lỗi giữ nguyên event hợp lệ và cho retry ảnh; nếu không chụp ảnh thì không tạo lỗi upload.
- [ ] 4.7. Làm lịch sử cá nhân và HR đối soát. HR xem cờ vị trí/ảnh khi có; thiếu bằng chứng tự nó không phải ngoại lệ bắt buộc xử lý. Chỉ chủ sở hữu, HR và admin có quyền xem ảnh private.

**Đạt khi:** bốn trường hợp có cả ảnh+GPS, chỉ ảnh, chỉ GPS, không có cả hai đều chấm được và tính công giống nhau; chấm ngoài văn phòng vẫn tính; hai lần bấm/retry không tạo bản ghi trùng.

## Phase 5 — Offline không thời hạn và điều chỉnh kỳ sau

**Mục tiêu:** không mất event khi mất mạng và không làm sai kỳ đã khóa.

- [ ] 5.1. Tạo IndexedDB queue lưu event, `idempotency_key`, thời điểm thiết bị, ảnh/GPS nếu có, trạng thái và số lần thử. Chỉ báo “đã lưu trên thiết bị” sau khi transaction IndexedDB thành công; không báo “đã đồng bộ” khi chưa có xác nhận server.
- [ ] 5.2. Khi mở ứng dụng, trở lại online hoặc người dùng bấm thử lại, gửi queue theo thứ tự, backoff khi lỗi tạm; luôn dùng lại khóa cũ. Không đặt TTL/ngày hết hạn cho queue hoặc từ chối chỉ vì event cũ. Cảnh báo rủi ro nếu xóa dữ liệu trình duyệt hay đăng xuất khi còn queue.
- [ ] 5.3. Server nhận event offline với thời điểm thiết bị và `received_at` riêng, xác định ngày gốc theo `Asia/Ho_Chi_Minh`, đánh dấu cần HR đối soát đồng hồ thiết bị. Nếu ảnh tùy chọn chưa upload xong, event vẫn được lưu.
- [ ] 5.4. Nếu kỳ gốc **chưa khóa**, tính lại ngày/kỳ đó như bình thường sau khi event hợp lệ. Nếu **đã khóa**, không cập nhật snapshot cũ: tạo đề xuất điều chỉnh ở kỳ mở tại thời điểm nhận hoặc kỳ mở đầu tiên sau đó, tham chiếu employee/ngày/kỳ gốc/event, số phút chênh lệch và lý do “đồng bộ muộn”.
- [ ] 5.5. HR xem đề xuất, so sánh với snapshot cũ và mọi đơn sửa công/điều chỉnh đã có; chỉ xác nhận phần chênh lệch thực tế. Một event không được cộng hai lần; trường hợp đã được bù bằng yêu cầu sửa công phải ra chênh lệch 0 hoặc đánh dấu đã xử lý.
- [ ] 5.6. Khi HR xác nhận, ghi điều chỉnh vào kỳ mở và audit; nếu kỳ đó đóng trước khi xác nhận, chuyển sang kỳ mở kế tiếp. Báo cáo hiển thị điều chỉnh kỳ trước riêng, không sửa bảng công/Excel kỳ gốc đã khóa.

**Đạt khi:** thử sync muộn sau nhiều ngày/tháng, retry lặp, mất mạng giữa upload, đồng hồ thiết bị lệch, kỳ gốc đang mở/đã khóa, kỳ kế cũng khóa và trường hợp đã sửa công; không mất dữ liệu, không nhân đôi công và snapshot cũ bất biến.

## Phase 6 — Tính công, nghỉ phép, tăng ca và chốt kỳ

**Mục tiêu:** một nguồn tính số phút nhất quán cho UI, dashboard và Excel.

- [ ] 6.1. Viết service tính theo khoảng thời gian với timestamp đầy đủ; chọn phiên bản **ca chung có hiệu lực tại ngày công**, lấy giao khoảng chấm vào–ra với hai khoảng làm việc trước/sau nghỉ trưa do admin cấu hình. Trừ phần nghỉ được duyệt/điều chỉnh theo đúng ngày. Quy đổi kết quả cuối sang phút nguyên, không làm tròn theo block.
- [ ] 6.2. Ngày làm việc: ngoài giờ của ca chung chỉ cộng tăng ca trong phần giao giữa giờ chấm thực tế và đơn tăng ca đã duyệt; đi trễ/về sớm so với ca có hiệu lực và áp số phút miễn trừ đi trễ. Ngày Chủ nhật/ngày nghỉ theo lịch: giờ thực tế sau khi loại giao với khoảng nghỉ trưa của ca chung có hiệu lực tự động là tăng ca, không cần đơn. Ngày làm bù được đánh dấu là ngày làm việc áp ca chung.
- [ ] 6.3. Thiếu chấm vào/ra: đánh dấu chưa hoàn chỉnh, không tự suy ra đủ giờ/tăng ca. Cho tạo yêu cầu sửa công; khi duyệt tạo record điều chỉnh và audit, giữ event gốc. Với event offline đến sau khóa kỳ, **luôn** áp quy trình điều chỉnh kỳ sau; các sai sót khác chỉ được mở lại kỳ bởi admin có lý do và audit theo quy trình đặc tả.
- [ ] 6.4. Làm đơn nghỉ theo cả ngày/nửa ngày, loại nghỉ, người duyệt; sổ phép cộng 1 ngày vào ngày 1 mỗi tháng từ tháng nhân viên vào làm (tối đa 12 ngày/năm), hỗ trợ nhập số dư lịch sử có lý do và giao dịch chuyển/điều chỉnh/trừ/hoàn. Giao dịch cộng tháng, duyệt và hủy phải nguyên tử, idempotent; không duyệt vượt số dư nếu chưa điều chỉnh có lý do.
- [ ] 6.5. Làm đơn tăng ca cho ngày làm việc, luồng duyệt employee → HR, HR → admin, admin có hồ sơ → HR; không ai tự duyệt. Ngày nghỉ tự tính OT nên đơn tăng ca ngày nghỉ, nếu có, chỉ là thông tin/lý do và không cộng thêm lần nữa.
- [ ] 6.6. Làm kỳ tháng `open → hr_reviewed → locked`; HR xử lý thiếu mốc, đồng bộ trễ, xung đột, đơn và điều chỉnh kỳ trước. Admin khóa tạo snapshot có version; mở lại cần lý do/audit. Thiếu ảnh/GPS hoặc cờ ngoài văn phòng **không tự chặn khóa kỳ**.
- [ ] 6.7. Unit test ca mặc định: 08:00–17:00 nghỉ 12:00–13:00 = 480 phút công thường; ngày nghỉ cùng khoảng = 480 phút tăng ca. Test ca admin đổi, ví dụ 09:00–18:00 nghỉ 12:30–13:30, miễn trừ trễ 10 phút: mốc biên, ngày trước/sau hiệu lực, ngày nghỉ/làm bù, kỳ đã khóa. Kiểm tra nửa ngày, cộng phép tháng không lặp, giới hạn 12 ngày/năm theo chính sách và chấm thiếu.

**Đạt khi:** mọi màn hình và export dùng cùng kết quả; ngày nghỉ tự OT, ngày thường OT cần duyệt; không trừ/cộng phép hoặc điều chỉnh hai lần; kỳ khóa không đổi nếu dữ liệu đến muộn.

## Phase 7 — Báo cáo, cấu hình, ảnh và sao lưu

**Mục tiêu:** hệ thống đủ chức năng quản lý và có cách phục hồi trên gói Free.

- [ ] 7.1. Làm dashboard HR/admin, lọc/phân trang event và ngoại lệ, lịch sử cá nhân; thể hiện riêng công thường, tăng ca tự động ngày nghỉ, tăng ca đã duyệt ngày thường và điều chỉnh kỳ trước.
- [ ] 7.2. Xuất Excel kỳ mở với nhãn “bản tạm”, kỳ khóa từ snapshot; cột điều chỉnh kỳ trước có ngày/kỳ nguồn. Xuất PDF đơn nghỉ với mã, trạng thái, phiên bản, người duyệt. Kiểm tra quyền trước mỗi lần xuất.
- [ ] 7.3. Làm **màn hình admin quản lý ca làm chung**: xem ca hiện tại/lịch sử, chỉnh ngày làm việc, giờ vào/ra, giờ nghỉ trưa, phút miễn trừ đi trễ và ngày hiệu lực; kiểm tra thứ tự giờ, xem trước tác động rồi lưu phiên bản mới có audit. Khi phiên bản mới bắt đầu, đóng phiên bản cũ vào ngày liền trước trong cùng giao dịch; từ chối khoảng hiệu lực chồng lấn để mỗi ngày có đúng một ca. Cùng khu cấu hình cho lịch nghỉ/làm bù, loại nghỉ/phép, địa điểm/bán kính tham khảo và retention ảnh 3 tháng. Admin nhập lịch, tọa độ/bán kính và số dư phép lịch sử nếu có trước vận hành; thiếu tọa độ không chặn chấm công. Cấu hình mới không tính lại snapshot đã khóa.
- [ ] 7.4. Nếu có ảnh, chạy job dọn object hết hạn và giữ metadata/event/audit; endpoint có `CRON_SECRET`, idempotent, có log kết quả và cách chạy lại. Nếu không có ảnh, job không được báo lỗi giả.
- [ ] 7.5. Theo dõi DB/Storage, lỗi chấm, queue chờ, ảnh upload lỗi và job retention; cảnh báo trước khi chạm hạn mức Free. Kiểm tra cơ chế project Free tạm dừng khi ít hoạt động và cách khôi phục.
- [ ] 7.6. Viết runbook backup: `pg_dump` các schema/bảng nghiệp vụ bằng client cài trực tiếp, mã hóa bản sao ngoài Supabase; backup object Storage riêng; ghi cách tái cấp Auth/ghép hồ sơ. Restore vào project **thử nghiệm** và đối chiếu số event, sổ phép, ảnh, điều chỉnh và quyền.

**Đạt khi:** Excel/PDF đúng số liệu và quyền, cấu hình/audit hoạt động, ảnh optional không cản chấm, bản backup thử restore được.

## Phase 8 — Kiểm thử tổng thể và chặn phát hành

**Mục tiêu:** chứng minh luồng nghiệp vụ mới và bảo mật trước deploy.

- [ ] 8.1. Chạy lint, build, unit/integration/E2E trên project thử nghiệm; cập nhật ma trận test ở **mã nguồn hoặc worklog** theo quyết định mới, không sửa `docs/05-testing-strategy.md`.
- [ ] 8.2. Test quyền employee A/B, HR, admin ở UI/API/RLS/Storage; không lộ dữ liệu chéo, `service_role` không có trong client bundle/log, không có secret trong Git.
- [ ] 8.3. Test trên điện thoại thật và desktop: bốn trạng thái ảnh/GPS, ngoài văn phòng, offline không thời hạn, queue sau refresh, retry cùng khóa, hai thiết bị, server nhận event nhưng ảnh lỗi, ngày nghỉ tự OT.
- [ ] 8.4. Test kỳ tháng: late sync vào kỳ đã khóa, điều chỉnh ở kỳ mở sau, kỳ sau cũng bị khóa, đã có sửa công, mở lại kỳ có audit, export snapshot gốc bất biến.
- [ ] 8.5. Test responsive 375/768/1024/1440px, bàn phím, screen reader cơ bản, Safari iOS/Chrome Android nếu có thiết bị; test mạng chậm và ngắt giữa upload.
- [ ] 8.6. Sửa toàn bộ lỗi chặn phát hành: mất/nhân đôi công, sai số phút, sai OT, sai quyền, sai kỳ/điều chỉnh, lộ secret, lỗi restore. Ghi bằng chứng test và lỗi còn lại vào worklog.

**Đạt khi:** không còn lỗi chặn phát hành; ma trận test và restore đều đạt bằng dữ liệu giả, có bản build xác định bằng commit hash.

## Phase 9 — Deploy kỹ thuật lên Vercel Hobby + Supabase Free

**Mục tiêu:** URL HTTPS hoạt động với Supabase production Free và đã smoke test end-to-end.

- [ ] 9.0. Kiểm tra lại điều khoản Vercel Hobby và xác nhận phương án triển khai được nhà cung cấp cho phép. Nếu mục đích công ty chưa phù hợp điều khoản Hobby, ghi Phase 9 bị chặn về điều kiện sử dụng; chỉ chuyển sang phương án hợp lệ khi chủ dự án quyết định.
- [ ] 9.1. Tạo Supabase Free project production riêng. Áp đúng migration version đã test bằng `psql`, kiểm tra RLS, bucket private và cấu hình Auth; bootstrap một admin bằng quy trình an toàn. Không đưa seed/dữ liệu giả vào production.
- [ ] 9.2. Kết nối Git repository với Vercel Hobby, chọn đúng Root Directory/Framework Next.js/branch production. Cấu hình URL + publishable key và server secret ở **đúng scope Production/Preview**; preview dùng project thử nghiệm, không dùng production.
- [ ] 9.3. Deploy commit đã qua Phase 8, theo dõi build/log đến trạng thái Ready; mở URL `https://...vercel.app` hoặc domain được cấp, kiểm tra HTTPS, refresh route và lỗi server. Cập nhật Supabase Auth Site URL/Redirect URLs theo domain thật.
- [ ] 9.4. Thiết lập cron dọn ảnh theo khả năng Hobby hiện hành nếu có dùng ảnh; kiểm tra `CRON_SECRET`, một lần chạy và log. Không dùng cron để quyết định phút công.
- [ ] 9.5. Smoke test qua URL deploy bằng tài khoản thử được tạo có kiểm soát: login/đổi mật khẩu, role, chấm không ảnh/GPS, chấm có bằng chứng, chấm ngoài văn phòng, offline→sync, Chủ nhật/ngày nghỉ→OT, đơn nghỉ/sửa công, khóa kỳ, điều chỉnh kỳ sau, Excel/PDF và ảnh private.
- [ ] 9.6. Kiểm tra backup production đầu tiên và diễn tập restore trên môi trường thử nghiệm; ghi URL, project reference, commit hash, deployment ID, ngày/giờ, người kiểm tra, kết quả smoke test, hạn mức và rủi ro còn mở vào worklog. Xóa tài khoản/dữ liệu smoke test khỏi production trước khi nhập dữ liệu nhân viên thật.

**Deploy kỹ thuật thành công khi:** deployment ở trạng thái Ready, URL HTTPS truy cập được, server kết nối đúng Supabase production, smoke test nghiệp vụ và quyền đạt, migration/backup/restore có bằng chứng. Chưa đánh dấu phase này chỉ vì build thành công.

**Điều kiện dùng chính thức cho công ty:** Vercel hiện giới hạn Hobby cho mục đích cá nhân hoặc phi thương mại. Phase 9 chỉ được triển khai theo phương án phù hợp điều khoản hiện hành. Trước khi vận hành còn cần cấu hình thật, người vận hành, quy trình backup/khôi phục và xác nhận hạn mức Free.

## 3. Tài liệu nhà cung cấp để kiểm tra khi thực hiện

- [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side) và [RLS/grants](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Vercel Environment Variables](https://vercel.com/docs/environment-variables) và [Vercel Cron](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- [Supabase Free và hạn mức](https://supabase.com/docs/guides/platform/billing-on-supabase), [project Free tạm dừng](https://supabase.com/docs/guides/platform/free-project-pausing) và [backup](https://supabase.com/docs/guides/platform/backups).

Hạn mức, API và điều khoản có thể đổi; kiểm tra lại trang chính thức tại thời điểm làm Phase 0 và Phase 9. Ghi thay đổi thực tế vào worklog, không sửa file đặc tả trong `docs/`.
