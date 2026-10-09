# WORKLOG — Hệ thống chấm công Marixa

File này là điểm bắt đầu cho bất kỳ AI/người làm việc tiếp trên dự án. Cập nhật sau mỗi lượt làm việc có thay đổi thực tế. Ghi sự thật đã kiểm tra; không đánh dấu “xong” khi chưa kiểm chứng.

## Trạng thái hiện tại

- Cập nhật: 2026-10-09, múi giờ Asia/Ho_Chi_Minh.
- Giai đoạn: **đã hoàn thành bộ đặc tả V1**; chưa có mã ứng dụng, database, môi trường Supabase hay deployment.
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

## Các quyết định không được tự đổi

- Phạm vi chỉ có nhân viên văn phòng Marixa, dưới 15 người; không có công trường, công nhân hoặc điểm danh đội.
- Ba role: `employee`, `hr`, `admin`; có nhiều nhân viên/HR và đúng một admin hoạt động. HR tự chấm công, xem dữ liệu toàn khối; admin toàn quyền.
- Email + mật khẩu. Chấm vào/ra một lần mỗi ngày, thứ 2–thứ 7, 08:00–17:00, nghỉ 12:00–13:00.
- Ảnh và GPS bắt buộc mỗi lượt; ngoài văn phòng vẫn nhận và gắn cờ. Offline lưu trên thiết bị, đồng bộ sau, chống trùng.
- HR duyệt đơn và yêu cầu của nhân viên; admin duyệt hồ sơ của HR. HR kiểm tra bảng công; admin khóa kỳ.
- V1 có hồ sơ, đơn nghỉ, phép năm theo sổ giao dịch, tăng ca có duyệt, yêu cầu sửa công, Excel bảng công, PDF đơn nghỉ.
- Công nghệ: React/Next.js, Supabase, Vercel. Người dùng yêu cầu dùng gói Free kể cả bản chính thức; tài liệu phải ghi rõ rủi ro điều kiện sử dụng Hobby của Vercel, không tuyên bố là phù hợp.
- Không dùng Docker/Docker Desktop, Dockerfile, docker-compose hoặc Supabase local stack. Phát triển bằng Node.js và Supabase hosted; migration/backup bằng PostgreSQL client cài trực tiếp.
- Giao diện theo logo Marixa xanh lam/cyan, điểm nhấn vàng, dùng hướng dẫn `ui-ux-pro-max`.

## Việc tiếp theo theo thứ tự

1. Khi người dùng yêu cầu xây ứng dụng: khởi tạo Next.js/React TypeScript và cấu trúc route/API đúng `04-system-architecture.md`; chưa tự tạo code hoặc tài khoản cloud khi chưa có yêu cầu mới.
2. Tạo migration SQL, RLS, Storage private và test quyền trên Supabase project thử nghiệm hosted theo `02-database-design.md` và `05-testing-strategy.md`; không chạy local stack Docker.
3. Xây Auth/hồ sơ, chấm công online/offline, đơn từ, timesheet, báo cáo và UI theo thứ tự phụ thuộc trong bảy tài liệu.
4. Trước khi đưa vào dùng thật: nhận file logo gốc; admin nhập tọa độ văn phòng, ngày nghỉ, số phép và thời hạn lưu ảnh; kiểm thử trên thiết bị thật, backup/restore và smoke test.
5. Sau mọi thay đổi nghiệp vụ hoặc code, cập nhật tài liệu liên quan và file worklog này ngay trong cùng lượt làm việc.

## Vấn đề/bug/rủi ro đang mở

- **Chưa phát hiện bug trong tài liệu** sau kiểm tra cấu trúc và liên kết; chưa có ứng dụng nên chưa có bug runtime.
- **Tài sản thiếu:** chưa có file logo gốc trong workspace; màu ở `07-ui-design-system.md` được chọn từ ảnh xem trước và cần đối chiếu khi có asset thật.
- **Cấu hình chưa có:** tọa độ/bán kính văn phòng, lịch ngày nghỉ/làm bù, số phép từng người và thời hạn lưu ảnh phải được admin nhập trước vận hành.
- **Giới hạn Free:** Supabase có hạn mức database/Storage và Free không có backup tự động; cần theo dõi dung lượng, dọn ảnh, backup thủ công và thử restore.
- **Khôi phục không Docker chưa được thử:** `pg_dump` nghiệp vụ không chứa Auth managed schema hoặc object Storage. Trước khi dùng thật, phải hoàn thiện và chạy thử runbook tái cấp tài khoản/ghép hồ sơ, khôi phục ảnh và dữ liệu công/phép trên project thử nghiệm.
- **Điều kiện Vercel:** Hobby chỉ dành cho mục đích cá nhân phi thương mại theo tài liệu nhà cung cấp; yêu cầu dùng Hobby cho hệ thống công ty là rủi ro điều kiện sử dụng chưa giải quyết. Xem `06-deployment-vercel-supabase.md`.
- **Email Auth:** dịch vụ SMTP mặc định của Supabase không nên làm nền cho cấp/khôi phục tài khoản production; V1 đặc tả admin cấp/reset mật khẩu an toàn, chỉ bật email tự phục vụ nếu có SMTP được kiểm thử.

## Quy tắc cập nhật worklog

- Mỗi lượt: ghi ngày, thay đổi thực tế, kiểm tra đã chạy và kết quả; chuyển việc xong khỏi “Việc tiếp theo”.
- Bug ghi triệu chứng, bước tái hiện, mức ảnh hưởng, tình trạng xử lý. Khi hết lỗi thì ghi cách sửa và ngày đóng.
- Không dùng worklog thay thế bảy tài liệu đặc tả; nếu quyết định nghiệp vụ đổi, cập nhật tài liệu nguồn liên quan và ghi tóm tắt ở đây.
