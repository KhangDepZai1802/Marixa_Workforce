# Marixa — kiểm kê và thiết kế lại giao diện

Ngày: 12/10/2026. Phạm vi: ứng dụng Next.js trong `react/`, ba vai trò employee/HR/admin. Đây là hồ sơ làm việc; các mục chưa kiểm chứng không được coi là nghiệm thu.

## Quyết định của chủ dự án

- Làm cả ba nhóm màn hình; Codex tự đánh giá các điểm khó dùng.
- Giữ logo chính thức. Xanh lam đậm là màu chính; cyan/vàng nhấn nhẹ, nền sáng trung tính.
- Trang chủ ưu tiên việc cần làm theo vai trò: công hôm nay, đơn chờ, công cần đối soát.
- PC/laptop dùng bảng và công cụ lọc; điện thoại dùng danh sách ngắn, chi tiết và thao tác đủ lớn.
- Áp dụng master UI/UX được chuyển sang Marixa, không nhập nghiệp vụ của repository tham khảo.

## Kiểm kê trước thay đổi

`react/src` có 104 file trước lượt sửa. Đã đọc các trang, component, features, API, auth/proxy, tính công, điều chỉnh và 19 migration. CSS tham khảo có nhiều block trùng nhau; đối chiếu toàn bộ rule riêng của desktop/mobile và các adapter. Script kiểm thử/vận hành cần được đọc trước khi chạy; không chạy runner reset schema để kiểm tra giao diện.

| Phân loại | Thành phần | Kết luận |
| --- | --- | --- |
| CURRENT | `src/app/(auth)`, `(private)`, `api`, `lib`, `server`, `features` | Đường chạy hiện tại là Next.js/Supabase; giữ API và quyền server. |
| CURRENT / DUPLICATE | 8 stylesheet import từ `src/app/layout.tsx` | Base, hai bản CSS tham khảo và nhiều adapter cùng chi phối màu, font, khoảng cách, breakpoint. Cần thay bằng một hệ style có chủ đích và kiểm tra mọi route. |
| DUPLICATE | Hai cây trình bày desktop/mobile trong `today-page.tsx`, history và leave | Cùng nguồn dữ liệu; khi hợp nhất phải giữ queue, ảnh, trạng thái và thao tác. |
| UNREACHABLE | `components/photo-dialog.tsx` | Tìm kiếm source chỉ có định nghĩa; màn ảnh hiện dùng `Dialog`. Không suy ra API ảnh không dùng. |
| CURRENT | `/admin/leave-balances` và `/hr/leave-balances` | Hai đường vào dùng chung `LeaveLedgerPage`; giữ deep-link cũ. |
| LEGACY | Tên thư mục `Marixa-ChamCong` | Không có source ứng dụng được `rg --files` liệt kê trong working tree hiện tại. Không triển khai .NET. |
| NOT_APPLICABLE | Công trường, điểm danh nhóm, kho, shipment, lương, trình dựng dashboard | Không thuộc nghiệp vụ V1; không xây thêm do xuất hiện trong master tham khảo. |

## Business Preservation Matrix

Trạng thái dưới đây mô tả bằng chứng source trước sửa, không thay thế kiểm thử tích hợp của lượt redesign.

| Yêu cầu | Hiện trạng | Trạng thái | File / API / DB | Cách bảo toàn |
| --- | --- | --- | --- | --- |
| Đăng nhập số điện thoại, mật khẩu tạm, quyền server | Đã có guard đăng nhập, đổi mật khẩu, account active và RLS | COMPLETE ở source | `lib/auth.ts`, `proxy.ts`, `api/v1/auth`, migrations 013 | Giữ guard, cookie refresh, không dựa vào ẩn menu để phân quyền. |
| Ảnh/GPS tùy chọn, chấm ngoài văn phòng | Có cả bốn tổ hợp; không dùng vị trí làm điều kiện tính công | COMPLETE ở source | `features/attendance/today-page.tsx`, `api/v1/attendance`, migration 012 | Chỉ làm rõ lựa chọn và preview; không bắt buộc camera/GPS. |
| Offline, owner, retry cùng khóa, ảnh lỗi | Ghi IndexedDB trước mạng; giữ event/photo chờ; có backoff và đối soát | COMPLETE ở source | `features/attendance/offline-queue.ts`, `TodayPage.submitAttendance` | Giữ toàn bộ save/sync/logout ownership; phân biệt đã lưu thiết bị và đã đồng bộ. |
| Công từng phút, ca có hiệu lực, nghỉ/làm bù, OT | 17 unit test nền đạt | COMPLETE trong phạm vi unit | `lib/domain/timesheet.ts`, migrations 014/018 | Không sửa thuật toán tính công để đổi bố cục. |
| Lịch sử công đủ tháng | UI yêu cầu 62, endpoint giới hạn 31; UI không tải trang tiếp | PARTIAL / lỗi hiển thị | `history-page.tsx:37`, `api/v1/attendance/events/route.ts:33` | Tải đủ trang theo contract, giữ kiểm tra owner server. |
| Nghỉ phép, tăng ca, sửa công | Có tạo/hủy/duyệt, ba loại đơn; thiếu lối PDF ở UI | PARTIAL ở UI | `my-requests/page.tsx`, `components/leave-history.tsx`, `api/v1/leave-requests/[id]` | Hiển thị đủ ba loại, giữ nội dung khi lỗi, nối PDF hiện có. |
| Không tự duyệt; đơn HR do admin duyệt | RPC kiểm tra đúng; API danh sách `can_decide` chỉ kiểm tra không phải chính mình | CONFLICT ở affordance | `api/v1/hr/requests/route.ts`, migrations 001/017 | Cho UI phản ánh tuyến hiện có; không nới quyền RPC. |
| Phép cộng từng tháng, pending không trừ | Ledger có cấp tháng, deduction, reversal, audit | COMPLETE ở source | migration 012/017, `features/leave/leave-ledger-page.tsx` | Số liệu thật, nhãn tiếng Việt; không cho sửa trực tiếp số dư. |
| Quyền nhập phép lịch sử | Plan nói admin; RPC/API hiện cho HR/admin thêm ledger | CONFLICT có trước | `plan.md`, migration 007, `api/v1/admin/leave-ledger` | Không âm thầm thay quyền trong redesign; ghi lại khác biệt cần chốt riêng. |
| Kỳ mở → HR đối soát → admin khóa; mở lại có lý do | Có snapshot version/audit, ngoại lệ và đơn chờ chặn đối soát | COMPLETE ở source | `hr/timesheets/page.tsx`, migrations 005/017 | Tách góc nhìn trong cùng kỳ, URL giữ kỳ/tab; confirm có bối cảnh, không bỏ bước. |
| Offline tới sau khóa kỳ | Tính phần chưa bù, duyệt vào kỳ mở, không ghi đè kỳ gốc | COMPLETE ở source | `lib/domain/late-adjustment.ts`, migrations 012/016 | Giữ preview nguồn/kết quả/đã bù/đề xuất; không nhập phút tùy ý. |
| Export Excel/PDF, ảnh private | Endpoint đầy đủ, snapshot được giữ; font PDF local | COMPLETE ở API | `api/v1/reports`, `api/v1/leave-requests/[id]`, photo route | Giữ download có quyền, không public hóa ảnh hoặc giả chữ ký. |
| Retention ảnh | DB 3 tháng lịch; mô tả UI vẫn nói 90 ngày | CONFLICT ở nội dung | migration 019, `admin/settings/page.tsx:41` | Sửa nhãn thành 3 tháng, không sửa migration đã áp. |
| Thông báo và vận hành | Chuông tóm tắt đơn, không có unread service; operations dùng số đo thật | COMPLETE trong phạm vi hiện có | `notification-bell.tsx`, `operations-panel.tsx` | Không tạo unread/backup/KPI giả. |

## UI Constraint Matrix trước sửa

Nguồn “master” là `CT_NOIBO_MASTER_UI_UX_CONSTRAINTS_CODEX.md`. P1 ảnh hưởng thao tác/dữ liệu hiển thị; P2 ảnh hưởng nhất quán.

| ID | Quy tắc / nguồn | Trạng thái | Màn / file | Mức | Kế hoạch sửa |
| --- | --- | --- | --- | --- | --- |
| UI-01 | Không hero marketing/emoji; master §1 | FAIL | home, login, admin, HR employees | P2 | Thay hero/tiles bằng việc cần xử lý, bỏ emoji trang trí. |
| UI-02 | Một primary/một bộ token; §§1–2 | FAIL | toàn bộ CSS | P2 | Token Marixa duy nhất; font Be Vietnam Pro; border nhẹ. |
| UI-03 | Menu rõ nhóm, về tổng quan từ mọi nơi; §3 | PARTIAL | AppShell/MobileNavigation | P1 | Menu đủ chức năng theo quyền, không phải về launcher để đổi nhóm. |
| UI-04 | Mobile tối đa 5 đích, safe area; §§3–4 | PARTIAL | MobileNavigation | P1 | Điều hướng ổn định theo vai trò, mục Thêm mở toàn bộ menu. |
| UI-05 | Width theo loại trang; §§2–4 | FAIL | AppShell, settings, dashboard | P2 | Table rộng, form giới hạn, dashboard cân đối ở 1920/2560. |
| UI-06 | Touch ≥44px, chữ rõ; §4 | PARTIAL | header, calendar, filters, row actions | P1 | Chuẩn hóa control; xác minh kích thước trong browser. |
| UI-07 | Filter/tab lưu URL, Back/Forward; §3.4 | PARTIAL | history, requests, employees, timesheets, settings | P1 | Query state cho tháng/tab/filter/kỳ; không vá bằng reload. |
| UI-08 | Một component cho cùng hành vi; §5 | PARTIAL | nhiều cây desktop/mobile, CSS adapter | P2 | Shared token/layout/dialog/table; presentation responsive đúng tác vụ. |
| UI-09 | Loading/empty/error/retry; §6 | PARTIAL | các page, thiếu route error/loading | P1 | State cục bộ và route boundary; lỗi tiếng Việt. |
| UI-10 | Dữ liệu 0/1/5/20/100+; §6 | PARTIAL | lists, bảng công, ledger, audit | P1 | Phân trang và thu gọn dữ liệu, không KPI giả hoặc warning đỏ khi 0. |
| UI-11 | Chấm công một nhiệm vụ, ảnh preview; §7.3 | PARTIAL | TodayPage | P1 | Trạng thái ca/vào/ra, bằng chứng tùy chọn, CTA rõ; preview ảnh. |
| UI-12 | Đủ context trước duyệt; §7.5/7.10 | PARTIAL | HR requests | P1 | Mở detail thống nhất desktop/mobile, lý do bắt buộc khi từ chối. |
| UI-13 | Bảng công/ngoại lệ/điều chỉnh tách rõ; §7.6 | PARTIAL | HR timesheets | P1 | Tabs theo kỳ và danh sách có lọc; giữ mọi chi tiết đối chiếu. |
| UI-14 | Audit người đọc hiểu; §7.10 | FAIL | admin audit | P2 | Tóm tắt hành động/đối tượng, detail field thay JSON thô. |
| UI-15 | Settings chia nhóm, giữ form khi lỗi; §7.10 | FAIL | admin settings | P1 | Tab theo URL, không reset form nếu lưu thất bại. |
| UI-16 | Dashboard trả lời việc cần làm; §7.12 | FAIL | home, HR/admin dashboard | P1 | Dữ liệu thật theo quyền, deep-link đúng danh sách cần xử lý. |
| UI-17 | Camera/GPS/geofence bắt buộc theo bản gốc | NOT_APPLICABLE | Marixa | — | Quyết định Marixa là bằng chứng tùy chọn. |
| UI-18 | Kho/công trường/XNK, builder/search đa domain | NOT_APPLICABLE | ngoài V1 | — | Không mở rộng backend theo tài liệu tham khảo. |
| UI-19 | Bàn phím/focus/dialog/contrast; §4 | PARTIAL | shared components | P1 | Giữ focus trap/Escape, tên điều khiển, kiểm tra contrast. |
| UI-20 | Kiểm tra toàn bộ viewport/browser; §9 | PARTIAL | toàn app | P1 | Chạy Chromium desktop/mobile viewport; ghi riêng giới hạn thiết bị thật. |

## Hướng triển khai

1. Chuẩn hóa token và AppShell; bỏ import các stylesheet tham khảo sau khi migrate presentation.
2. Trang chủ theo role, đăng nhập gọn, chấm công/lịch sử/đơn từ nhất quán.
3. HR: danh sách nhân viên, duyệt đơn, đối soát, bảng công/ngoại lệ/điều chỉnh, báo cáo, sổ phép.
4. Admin: tổng quan vận hành, tài khoản, cấu hình chia nhóm, nhật ký dễ đọc; giữ các endpoint và thao tác hiện hữu.
5. Chạy check/build, kiểm tra browser điều hướng/responsive/role, hồi quy offline và nguồn dữ liệu theo các thay đổi thực tế.

## Bằng chứng

- Skill `ui-ux-pro-max` đã được cập nhật từ repository người dùng chỉ định bằng installer; backup bản trước ở thư mục temp của tài khoản. Đối chiếu SHA256 mọi file tải về với bản cài đạt. Không cài thêm bản trùng tên trong repo.
- Hai truy vấn design-system trả gợi ý hero/feature showcase không phù hợp. Không áp hoặc lưu các gợi ý đó; dùng yêu cầu Marixa, logo và master làm chuẩn. Hướng dẫn Next.js lấy từ tài liệu đi kèm bản 16.4.0 đang cài.
- `logo.png` và `react/public/logo.png` có SHA256 giống nhau; không sửa hình logo.
- Trước sửa: `npm.cmd run check` đạt ESLint, TypeScript và **17/17 unit test**. Chưa coi đây là bằng chứng giao diện mới hoặc thiết bị thật.
- Kết quả sau triển khai được ghi bên dưới và trong `worklog.md`.

## Kết quả triển khai — 12/10/2026

Đã đọc toàn bộ mã nguồn ứng dụng hiện hành, các API, domain, auth, cấu hình, 19 migration và script kiểm thử/vận hành trong repository. Không coi dependency, output build hoặc ảnh nhị phân là mã nguồn nghiệp vụ. `apply-all.sql` được đối chiếu với 12 migration gốc: là bản ghép cũ, có một số chuỗi tiếng Việt lỗi encoding; không chạy file này. Không sửa schema, thuật toán tính công, quyền RPC/RLS hoặc cơ chế queue để đổi giao diện.

- Một hệ CSS responsive thay 6 stylesheet tham khảo/adapter không còn import. Be Vietnam Pro, màu chính `#1647c8`, nền trung tính; logo gốc giữ nguyên. Font, bảng, biểu mẫu, trạng thái và dialog dùng chung.
- Sidebar đủ chức năng theo vai trò, thu gọn được; điện thoại có 4 đích chính và mục Thêm. Trang chủ lấy dữ liệu thực từ API hiện hữu, ưu tiên chấm công và việc cần xử lý.
- Chấm công dùng một cây giao diện, có preview ảnh và trạng thái đang nén. Lịch sử chuyển sang API cá nhân hỗ trợ 62 lượt/tháng, phù hợp ràng buộc DB một vào/một ra mỗi ngày. Queue, owner và idempotency không đổi.
- Đơn từ có 3 tab, bộ lọc URL, phân trang và PDF qua endpoint có sẵn. Duyệt đơn có chi tiết trước quyết định. API danh sách `can_decide` được khớp với RPC: không tự duyệt, HR không duyệt đơn HR, chủ đơn phải có tài khoản active; không trả danh sách tài khoản ra client.
- Bảng công có các góc nhìn công ngày/ngoại lệ/điều chỉnh, tìm nhân viên, 25 dòng/trang và xác nhận theo bối cảnh. Cấu hình chia 4 nhóm, có preview ca và giữ dữ liệu khi lỗi. Khóa/đổi vai trò tài khoản có xác nhận. Audit trình bày người thực hiện, hành động và thay đổi trước/sau.

### UI Constraint Matrix sau sửa

`PASS LOCAL` chỉ áp dụng trong phạm vi source và Chromium dùng fixture cục bộ, không phải nghiệm thu cloud hay thiết bị thật.

| ID | Kết quả | Bằng chứng / giới hạn |
| --- | --- | --- |
| UI-01 | PASS LOCAL | Bỏ hero chọn khu vực, emoji trang trí và KPI không phục vụ tác vụ. |
| UI-02 | PASS LOCAL | `globals.css` là nguồn token; logo không đổi; chỉ còn import font và CSS chính. |
| UI-03 | PASS LOCAL | `navigation.ts` dùng chung desktop/mobile; menu Thêm truy cập được audit trên điện thoại. |
| UI-04 | PASS LOCAL | 5 đích gồm Thêm, vị trí ổn định theo vai trò; safe-area và khoảng cuối trang. |
| UI-05 | PASS LOCAL | Kiểm tra đến 2560px; giới hạn bề rộng form/dashboard và bảng theo tác vụ. |
| UI-06 | PARTIAL | Control chính cao 44px, nút chấm 52px; đo ô lịch cả công/phép tại 360px đạt ít nhất 44×44. Chưa đo mọi liên kết và thao tác trên thiết bị thật. |
| UI-07 | PASS LOCAL | Bộ lọc/tab/query; kiểm tra lịch sử qua reload và Back/Forward. |
| UI-08 | PASS LOCAL | Dùng shared shell/navigation/dialog/token; bỏ cây chấm công riêng desktop/mobile. |
| UI-09 | PARTIAL | Có loading/error route và lỗi cục bộ; thử danh sách rỗng, lỗi 503, retry, API chậm. Chưa ép mọi lỗi ở mọi route. |
| UI-10 | PARTIAL | Có phân trang; thử bảng công 84 dòng, audit 34 dòng, đơn từ và danh sách rỗng. Chưa phủ đủ 0/1/5/20/100+ cho từng màn; các API đơn giữ giới hạn 100 bản gần nhất có trước. |
| UI-11 | PASS LOCAL | Preview/nén ảnh, một thao tác chấm chính; thử queue offline/reload/ảnh lỗi/retry. |
| UI-12 | PASS LOCAL | Detail trước duyệt và không hiện nút duyệt đơn HR của chính mình; quyền thật cần chạy lại với Supabase. |
| UI-13 | PASS LOCAL | 3 tab trong cùng kỳ, filter URL, 25 dòng/trang, đầy đủ preview điều chỉnh và xác nhận có lý do. |
| UI-14 | PASS LOCAL | Nhãn hành động/người thực hiện, dialog so sánh trường, mã tham chiếu mở riêng; khóa lạ vẫn được giữ để tra cứu. |
| UI-15 | PASS LOCAL | 4 nhóm cấu hình, xác nhận ảnh hưởng ca, lỗi lưu không xóa dữ liệu đã nhập. |
| UI-16 | PASS LOCAL | Trang chủ 3 vai trò lấy API thật; số trong kiểm thử và ảnh bàn giao là fixture, không đưa vào ứng dụng. |
| UI-17 | NOT_APPLICABLE | Camera/GPS/geofence bắt buộc không thuộc quyết định Marixa. |
| UI-18 | NOT_APPLICABLE | Không thêm module công trường/kho/XNK. |
| UI-19 | PARTIAL | Tên control trong AX tree; focus dialog/Escape/trả focus; contrast màu chính 7,58:1, chữ chính 16,27:1, chữ phụ 6,36:1 trên trắng. Chưa nghiệm thu screen reader thực tế. |
| UI-20 | PARTIAL | 315 lượt role/route/viewport Chromium đạt; chưa có Safari/iOS/Android thật. |

### Kiểm chứng và cách xem

- `npm.cmd run check`: ESLint, TypeScript và **17/17 unit test** đạt. `npm.cmd run build`: đạt Next.js production build.
- `node supabase/verify-secrets.mjs`: 230 file working tree được Git chọn và 31 browser asset không chứa secret server/test hiện tại; file môi trường vẫn bị ignore. `git diff --check` đạt; không có thay đổi logo hoặc file env.
- `node scripts/verify-ui-redesign.mjs` (chạy trong `react/`): **315 lượt** gồm 33 tổ hợp vai trò/route riêng tư và 2 route auth, mỗi tổ hợp ở 360/375/390/430/768/1366/1440/1920/2560px. Không tràn ngang toàn trang, không notice lỗi hoặc control button/textbox/combobox thiếu tên trong fixture.
- Sau sửa kích thước vùng bấm, chạy lại 45 lượt auth/trang chủ/lịch sử/đơn từ, cùng toàn bộ tương tác cục bộ và kiểm tra 2 lịch ở 360px. Báo cáo đầy đủ giữ tại `react/.artifacts/ui-redesign/report.json`; lượt chọn lọc ở `report-subset.json`.
- Tương tác đạt: menu Thêm, focus/Escape, preview ca 480 phút/ngày theo fixture, lưu lỗi giữ form, URL qua reload/Back/Forward, chi tiết duyệt/không tự duyệt, phân trang bảng công, xác nhận khóa kỳ/tài khoản, empty/error/retry và API chậm.
- Queue dùng IndexedDB thật trong Chromium: lưu offline kèm owner/key/ảnh ≤200 KB, reload vẫn cùng khóa, server giả nhận event rồi lỗi ảnh, retry ảnh gắn đúng event và xóa queue khi hoàn tất. Đây không phải bằng chứng tích hợp Supabase/Storage/RLS.
- Bộ ảnh desktop/mobile: [mở gallery cục bộ](../react/.artifacts/ui-redesign/index.html). Dữ liệu/tên trong ảnh là fixture giả. Artifact bị Git ignore; script kiểm thử và generator gallery được giữ trong source để tái tạo.
- Trong lượt redesign đầu, probe với khóa hiện có gọi sang project test cũ `pkpwcpatuslfjyoivbuf` trả **401**. Đây không phải bằng chứng khóa của project đang cấu hình `lasdnfytejntonjfkspv` không hợp lệ. Sau khi chủ dự án yêu cầu dùng cấu hình hiện tại, Auth/REST của đúng project trả **200** và đã chạy smoke test thật bên dưới; giữ nguyên `.env.local`.
- Các sửa Markdown của lượt này có chủ đích: chuyển master sang Marixa, thêm audit, ghi checklist và bằng chứng worklog. Giữ nguyên phần chỉnh Vercel và worklog có sẵn trước lượt sửa. Không commit/push/deploy.

### Kiểm thử cấu hình Supabase hiện tại — bổ sung 12/10/2026

Chủ dự án yêu cầu dùng cấu hình đang có. `scripts/verify-current-supabase.mjs` yêu cầu `VERIFY_SUPABASE_REF` khớp URL trong `.env.local`, chạy production-local riêng ở 3013, tạo 2 employee và 1 HR tạm, chỉ ghi/xóa dữ liệu gắn với những fixture này. Không chạy script reset, thay người dùng thật hoặc tự áp migration.

- **31/33 kiểm tra đạt**: Auth, API cá nhân, chặn employee vào HR/admin, chấm vào/ra, retry cùng key, chặn trùng loại và sai chủ queue, ảnh private theo quyền, RLS chéo nhân viên, đọc HR dashboard/hàng đợi/kỳ công, API đổi mật khẩu bắt buộc, API ảnh hết hạn, logout và cleanup.
- **Hai kiểm tra chưa đạt:** nhật ký migration chỉ ghi 12/19 file; chủ ảnh thử vẫn tải được ảnh hết hạn qua Storage dù API trả 410.
- Kiểm tra schema thực tế bổ sung: thiếu RPC `create_work_policy_version`, `operations_metrics`, `finalize_photo_retention`; `review_late_attendance_adjustment` vẫn có chữ ký cũ 5 tham số; truy vấn `timesheet_days.overtime_kind` trả 400. `maintenance_runs` đã tồn tại, nên không được chạy mù toàn bộ migration 013–019; cần đối chiếu từng thay đổi trước khi đồng bộ schema.
- Ba tài khoản Auth/hồ sơ/account thử, event, ảnh và audit liên quan đã được dọn thành công; không còn hồ sơ `TEST-UI-*`. Server 3013 đã dừng. Báo cáo không chứa khóa/mật khẩu: `react/.artifacts/current-supabase/report.json`.
- Đây là smoke test API/Auth/Storage thật, chưa thay thế kiểm thử toàn bộ admin, offline browser, snapshot/export và thiết bị thật trên project này. Không thay schema/policy trong lượt kiểm thử.
