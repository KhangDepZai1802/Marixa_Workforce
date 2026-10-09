# 06 — Triển khai Vercel và Supabase Free cho Marixa

## 1. Mục tiêu và điều kiện

Theo quyết định của Marixa, bản chính thức dự kiến dùng **Vercel Hobby (Free)** và **Supabase Free**. Tài liệu này mô tả cách triển khai, giới hạn kỹ thuật và các điểm phải theo dõi; nó **không xác nhận việc dùng Vercel Hobby cho công ty là phù hợp điều kiện dịch vụ**. [Vercel ghi Hobby chỉ dành cho mục đích cá nhân phi thương mại](https://vercel.com/docs/plans/hobby) và [định nghĩa sử dụng thương mại trong Fair Use](https://vercel.com/docs/limits/fair-use-guidelines) bao gồm dự án do nhân viên được trả lương phát triển. Đây là rủi ro vận hành/điều kiện sử dụng còn mở; không nên che giấu trong checklist bàn giao.

Các con số gói Free có thể thay đổi; kiểm tra lại trang nhà cung cấp trước khi tạo tài khoản và trước mỗi lần đưa bản mới vào sử dụng. Theo [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), Free hiện có 500 MB database mỗi project và 1 GB file Storage. Supabase [có thể tạm dừng project Free ít hoạt động trong 7 ngày](https://supabase.com/docs/guides/deployment/going-into-prod). Khi database Free vượt 500 MB, project [có thể chuyển sang chỉ đọc](https://supabase.com/docs/guides/platform/database-size).

## 2. Sơ đồ môi trường và biến cấu hình

Mã nguồn Next.js được build trên Vercel; dữ liệu/Auth/ảnh ở một Supabase project. Nếu dùng project thứ hai cho thử nghiệm, tách hoàn toàn URL, key và dữ liệu thật. Không dùng dữ liệu nhân viên thật ở preview. Các bí mật chỉ nhập trong Vercel Environment Variables và máy quản trị an toàn, không commit `.env.local`.

**Quy trình không dùng Docker:** cài Node.js và PostgreSQL client (`psql`, `pg_dump`, `pg_restore`) trực tiếp trên máy phát triển. Chạy Next.js bằng Node.js và dùng một Supabase project thử nghiệm hosted; không cài Docker Desktop, không có Dockerfile/docker-compose, không dùng `supabase start`. [Next.js trên Vercel không cần Docker](https://vercel.com/i/do-you-need-docker-to-deploy). Dùng kết nối Postgres từ mục **Connect** của Supabase cho tác vụ quản trị; [direct connection được khuyến nghị cho migration và backup, session pooler là lựa chọn nếu mạng chỉ có IPv4](https://supabase.com/docs/guides/database/connecting-to-postgres).

| Biến | Nơi dùng | Lưu ý |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client/server | URL project, không phải bí mật. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client/server | Key publishable, kết hợp RLS; không cấp quyền admin bằng key này. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Chỉ tác vụ cấp tài khoản/cleanup cần thiết; tuyệt đối không có tiền tố `NEXT_PUBLIC_`. |
| `CRON_SECRET` | Server only | Bảo vệ endpoint dọn ảnh hằng ngày. |
| `NEXT_PUBLIC_APP_URL` | Client/server | Domain thật để tạo link trong Excel/PDF và Auth redirect. |

Tên key cần đối chiếu với SDK hiện hành khi code. Không đưa vị trí văn phòng, giờ làm, số phép hoặc hạn lưu ảnh vào biến môi trường: chúng là cấu hình nghiệp vụ có version/audit do admin quản lý.

## 3. Trình tự thiết lập

1. Tạo Supabase project ở region phù hợp, bật Auth email/mật khẩu và tắt đăng ký công khai. Tạo bucket `attendance-photos` loại **private**; giới hạn MIME ảnh và kích thước upload theo chính sách ứng dụng. Kiểm tra policy RLS cho bảng và Storage trước khi nhập dữ liệu thật. [Supabase private bucket](https://supabase.com/docs/guides/storage/buckets/fundamentals) kiểm soát lượt tải qua Auth/RLS.
2. Lưu migration SQL có version trong repository và áp dụng bằng `psql` cài trực tiếp: chạy trên Supabase project thử nghiệm trước, kiểm tra schema/RLS, sau đó mới áp dụng production; ghi version đã áp dụng trong bảng lịch sử migration. Không sửa schema production bằng SQL Editor ngoài quy trình này để tránh lệch lịch sử. Tạo admin đầu tiên bằng quy trình bootstrap chạy phía server, chỉ một lần; không commit mật khẩu mặc định. Kiểm tra không có admin thứ hai.
3. Admin mở chức năng quản lý **ca làm chung**, kiểm tra hoặc chỉnh ngày làm trong tuần, giờ vào/ra, nghỉ trưa, phút miễn trừ đi trễ và ngày hiệu lực. Thứ 2–thứ 7 08:00–17:00, nghỉ 12:00–13:00, miễn trừ 0 phút là giá trị khởi tạo có thể đổi. Admin cũng cấu hình tọa độ/bán kính văn phòng, lịch ngày nghỉ/làm bù, các loại nghỉ, số phép được cấp và **thời hạn giữ ảnh**. Ca và lịch có hiệu lực phải được kiểm tra trước khi mở chấm công; cấu hình mới không sửa snapshot kỳ đã khóa.
4. Kết nối repository Next.js với Vercel, cấu hình biến môi trường cho production và preview, domain/HTTPS, Supabase Auth redirect URL tương ứng. Deploy, chạy smoke test đăng nhập, chấm vào/ra, ảnh private, tạo đơn, duyệt, Excel/PDF.
5. Cấp tài khoản nhân viên/HR qua admin và kiểm tra quyền từng role. V1 không phụ thuộc email mặc định của Supabase cho luồng cấp/khôi phục tài khoản: admin đặt mật khẩu tạm an toàn, buộc đổi ở lần đăng nhập đầu và hỗ trợ đặt lại khi cần. Nếu Marixa có SMTP riêng được cấu hình và kiểm thử, có thể bật luồng khôi phục qua email; [Supabase coi dịch vụ email mặc định là best-effort cho mục đích không phải production](https://supabase.com/docs/guides/auth/auth-smtp).
6. Chạy thử ít nhất một kỳ với dữ liệu giả và một vòng sao lưu/khôi phục. Sau đó mới nhập dữ liệu nhân viên thật.

## 4. Ảnh, dung lượng và retention

Ảnh chấm công được nén trên thiết bị trước upload, định hướng lại để không xoay, lưu WebP/JPEG; đặt mục tiêu khoảng **100 KB/ảnh**, giới hạn cứng đề xuất **200 KB/ảnh** nếu chất lượng vẫn đủ để HR xác nhận khuôn mặt. Giới hạn phải được thử trên điện thoại thực tế trước vận hành. Postgres chỉ lưu đường dẫn, kích thước, trạng thái và thời điểm; không lưu blob/base64. Trang danh sách HR không tải ảnh đầy đủ hàng loạt.

Phép tính gần đúng ở quy mô tối đa 15 người, 2 ảnh/ngày, 26 ngày/tháng:

| Kích thước bình quân | Ảnh/tháng | Dung lượng ảnh/tháng | 6 tháng | 12 tháng |
| --- | ---: | ---: | ---: | ---: |
| 100 KB | 780 | 78 MB | 468 MB | 936 MB |
| 200 KB | 780 | 156 MB | 936 MB | 1.872 MB |

Con số chưa tính ảnh lỗi lặp, tài liệu khác và phần dung lượng dự phòng. Vì vậy admin phải chọn thời hạn lưu ảnh trước khi vận hành; **6 tháng là gợi ý khởi đầu nếu ảnh trung bình gần 100 KB**, không phải chính sách tự động áp đặt. Dashboard admin hiển thị tổng Storage/DB và ước tính tháng còn lại; cảnh báo ở 70%, 85% và 95% hạn mức. Khi gần đầy, ưu tiên kiểm tra ảnh chưa dọn, giảm kích thước sau khi kiểm thử chất lượng, hoặc rút ngắn retention cho ảnh mới theo quyết định admin; không xóa event công/sổ phép/audit để lấy chỗ.

Dọn ảnh hết hạn hằng ngày bằng endpoint server có `CRON_SECRET`, xóa object Storage trước rồi đánh dấu metadata; xử lý lặp an toàn. Vercel Hobby [hỗ trợ cron tối đa một lần mỗi ngày, với độ chính xác theo giờ](https://vercel.com/docs/cron-jobs/usage-and-pricing), đủ cho retention nhưng không dùng nó để quyết định phút chấm công. Nếu cron lỗi, admin thấy cảnh báo và có thao tác chạy lại; event công vẫn tồn tại khi ảnh đã hết hạn.

## 5. Sao lưu và giám sát Free

[Supabase Free không có backup tự động](https://supabase.com/docs/guides/platform/backups). Dùng `pg_dump`/`pg_restore` của PostgreSQL cài trực tiếp để sao lưu **schema và dữ liệu nghiệp vụ do ứng dụng sở hữu** ít nhất hằng tuần và trước migration; lưu bản mã hóa ngoài Supabase. Không dùng `supabase db dump` vì [CLI chạy `pg_dump` trong container và yêu cầu Docker](https://supabase.com/docs/guides/self-hosting/restore-from-platform). Không dump rồi restore bừa toàn bộ schema Supabase managed (`auth`, `storage`): backup nghiệp vụ không tự chứa mật khẩu/tài khoản Auth hay file ảnh. Ảnh Storage cần sao lưu riêng; danh sách tài khoản và quy trình tái cấp tài khoản/ghép lại với hồ sơ cũng phải được ghi trong runbook khôi phục. Thử restore trên project thử nghiệm trước khi dùng thật và theo quý; chỉ đánh dấu backup đạt yêu cầu nếu khôi phục được công, phép, ảnh cần giữ và quyền tài khoản. Ghi người thực hiện, thời điểm và kết quả.

Theo dõi hằng tuần: dung lượng DB/Storage, lượt chấm lỗi, queue ảnh chờ, cron dọn ảnh, Auth email, hiệu năng API và trạng thái project. Nếu hạn mức tới ngưỡng chặn, admin nhận cảnh báo trước khi nhân viên mất khả năng ghi công; giao diện chấm công vẫn có hàng đợi local nhưng không coi đó là bản ghi server. Cần có quy trình đối soát bằng yêu cầu sửa công khi service tạm ngừng.

## 6. Checklist nghiệm thu triển khai

- [ ] Migration, RLS và policy Storage đã qua test quyền employee/HR/admin.
- [ ] Chỉ một admin hoạt động; tài khoản không thể tự đăng ký hoặc tự nâng role.
- [ ] Cấu hình giờ, văn phòng, lịch nghỉ, phép và retention đã có hiệu lực.
- [ ] Ảnh private, không có service-role key trong client, link Excel kiểm tra session.
- [ ] Chấm công offline/retry, ảnh lỗi, yêu cầu sửa và khóa kỳ chạy đúng trong smoke test.
- [ ] Có bản sao lưu DB, kế hoạch sao lưu ảnh và bài thử restore.
- [ ] Không có bước Docker, `supabase start` hay `supabase db dump` trong quy trình phát triển/vận hành; migration và backup đã thử bằng PostgreSQL client cài trực tiếp.
- [ ] Hạn mức Free và rủi ro điều kiện Vercel Hobby đã được ghi nhận trong bàn giao.

Xem kiểm thử chi tiết tại [05-testing-strategy.md](05-testing-strategy.md).
