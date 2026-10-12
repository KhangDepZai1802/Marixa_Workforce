# MASTER PROMPT — TỔNG HỢP TOÀN BỘ YÊU CẦU & GIỚI HẠN UI/UX NỘI BỘ MARIXA

> **Áp dụng cho Marixa — quyết định ngày 12/10/2026:** Đây là tài liệu tham khảo giao diện được chuyển từ một hệ thống khác. Nghiệp vụ Marixa lấy từ `docs/01`–`07`, ưu tiên quyết định mới trong `plan.md` và `worklog.md`; không nhập các module công trường, kho, xuất nhập khẩu hoặc vai trò chưa có vào Marixa. Những yêu cầu chỉ dành cho các module đó được đánh dấu `NOT_APPLICABLE`. Các liên kết repository gốc bên dưới giữ nguyên để bảo toàn nguồn tham khảo; “17/17 tệp đã đọc” là thông tin của bản tổng hợp gốc, không phải bằng chứng kiểm tra của lượt triển khai Marixa.
>
> Chủ dự án chọn thiết kế lại cả nhân viên, HR và admin; Codex tự đánh giá các điểm khó dùng. Xanh lam đậm là màu chính, cyan/vàng chỉ nhấn nhẹ theo `logo.png`; trang chủ hiển thị việc cần làm theo vai trò. Ảnh/GPS vẫn tùy chọn và độc lập, ngoài văn phòng vẫn tính công bình thường, ca chung có phiên bản, phép cộng theo tháng và kỳ đã khóa không bị ghi đè. Không biến những yêu cầu tham khảo về camera/geofence thành điều kiện chặn chấm công.

> **Dùng trực tiếp cho Codex / AI coding agent.** Đây là bản HỢP NHẤT, KHỬ TRÙNG LẶP các yêu cầu liên quan **giao diện, hạn chế giao diện, điều hướng, responsive, trải nghiệm người dùng và UI acceptance** tìm thấy trong **17/17 tệp** thuộc thư mục [`prompt/`](https://github.com/chautuancons2010/CT_NoiBo/tree/main/prompt), nhánh `main`, repository `chautuancons2010/CT_NoiBo`, kiểm tra ngày 10/10/2026. Các mục có chữ **BẮT BUỘC / CẤM** là ràng buộc; các thông số ghi **gợi ý / tham khảo / nếu cần** phải được hiểu là định hướng, KHÔNG phải tiêu chuẩn kỹ thuật cố định.
>
> **Phạm vi trích xuất:** Chỉ gom nội dung liên quan UI/UX hoặc ràng buộc nghiệp vụ trực tiếp ngăn việc thiết kế giao diện sai. Đây **không** phải bản sao nguyên văn toàn bộ 17 tệp (vì phần lớn còn chứa yêu cầu database/API/back-end chuyên ngành). Mỗi nhóm đều có tham chiếu ngược tới tệp nguồn ở phụ lục cuối.

---

## 0. VAI TRÒ, MỤC TIÊU VÀ NGUYÊN TẮC KHÔNG THỂ VI PHẠM

Bạn là **Principal Product Designer + Senior Frontend Engineer + UX Auditor** chuyên phần mềm nội bộ Việt Nam. Làm việc **trên mã nguồn thực tế**, không thiết kế mẫu tách rời. Trước khi thay đổi bất kỳ màn hình nào: đọc kiến trúc, thành phần UI, route, quyền, trạng thái, nghiệp vụ Marixa trong `docs/01`–`07`, `plan.md`, các quyết định mới trong `worklog.md` và bản master này. Bộ `prompt/` ở repository gốc là nguồn của tài liệu tham khảo, không phải bộ đặc tả nghiệp vụ Marixa.

**Mục tiêu:** Hệ thống có giao diện doanh nghiệp chuyên nghiệp, tối giản, dễ hiểu, giàu thông tin đúng mức; nhất quán từ module đến module; dùng tốt trên desktop của văn phòng và mobile của giám sát ngoài công trường (mạng yếu); không “AI-generated”, không dashboard template hay trang quảng cáo. Các luồng hiện hữu phải hoạt động đúng và tiếp tục được kế thừa.

**Thứ tự ưu tiên tuyệt đối khi xung đột:**

1. Blueprint/nghiệp vụ đã xác nhận của Marixa, ưu tiên quyết định mới trong plan/worklog.
2. Bất biến nghiệp vụ, quyền truy cập, tính toàn vẹn dữ liệu, lịch sử/audit.
3. Route, API/service, xác thực, realtime, upload/offline.
4. Design system hiện hữu và chuẩn hóa của dự án.
5. `ui-ux-pro-max` (nếu cài) — chỉ là công cụ audit/design hỗ trợ.
6. Trang trí, tính thẩm mỹ và micro-animation.

**Nghiêm cấm:** tự thay đổi entity, data model, workflow, permission, approval, timesheet, leave ledger, stock ledger, warehouse posting, project/worksite, worker attendance, export/audit semantics, API contract chỉ vì redesign. Không xóa chức năng đang sử dụng khi chưa đối chiếu blueprint. Không biến workflow nhiều bước thành CRUD đơn giản. Không hard-code policy chưa được xác nhận.

**Business Preservation Audit trước redesign:** lập ma trận `Requirement | Current implementation | COMPLETE/PARTIAL/MISSING/CHANGED/CONFLICT/UNKNOWN | Files/API/DB | Action`. Chức năng ngoài blueprint đánh dấu `EXTENSION`, không tự xóa. Phải phân biệt **UI thiếu/chưa thuận tiện** với **nghiệp vụ thực sự không tồn tại**. Đặc biệt, worker attendance phải giữ chuỗi `Assignment → Daily Roster → Attendance Session → Group Photos → Confirm → Timesheet`, không được rút còn `Project → Worker checklist → Save`.

**Dùng skill nếu có:** kiểm tra `ui-ux-pro-max`, đọc `SKILL.md`, dùng để review design system, responsive, spacing, typography, navigation, forms, touch, accessibility và audit cuối. Không cài trùng, không cho skill đổi nghiệp vụ hoặc áp phong cách khác.

Nguồn: `prompt1909` §§1–4, 19, 42–48; `prompt1.md` §§4–6; `prompt2.md` §§1–4.

---

## 1. CÁC GIỚI HẠN THẨM MỸ / ANTI-PATTERN — CẤM HOẶC HẠN CHẾ NGHIÊM NGẶT

### 1.1. Phong cách bắt buộc

- `Enterprise / Clean / Minimal / Professional / Data-oriented / Operational software`.
- Thực tế, rõ ràng, dễ quét thông tin, phù hợp người Việt dùng hằng ngày; `Clarity > Decoration`, `Consistency > Creativity`, `Usability > Animation`.
- Có thể **tham khảo nguyên tắc tổ chức trải nghiệm**, không sao chép, từ MISA AMIS, Base.vn, Odoo, Linear, Notion.
- Không giống landing page, dashboard demo, giao diện marketing hay bản thiết kế hàng loạt do AI dựng.

### 1.2. Cấm các phong cách và thủ thuật thị giác sau

- Gradient xanh–tím/trang trí tràn lan; glassmorphism; neon; nền blob; hero marketing.
- Hình minh họa trang trí vô nghĩa; sticker/emoji cho nghiệp vụ; pastel icon tile ở mọi nơi.
- Mỗi card một màu; card quá lớn/quá cao; KPI card quá cao; thẻ bo tròn 20–30px hoặc pill button tràn lan.
- Shadow quá lớn; card/table bình thường nên dùng border nhẹ thay vì shadow nặng.
- Khoảng trắng trang trí quá nhiều; section gap, page header, padding quá lớn; trang desktop 1920/2560 bị “loãng”.
- Animation nhiều; animation bảng không có ý nghĩa; chart dày đặc; fake charts; KPI/statistics giả chỉ để lấp layout.
- Chuyển bảng thành card hàng loạt trên desktop khi bảng phù hợp hơn, hoặc ép bảng desktop co bé trên điện thoại.
- Tiêu đề trang lặp lại; nhiều CTA chính cùng mục đích; action icon dày đặc trên mọi dòng; icon trùng nhưng hành vi khác.
- Nội dung quảng cáo như “Welcome back 👋”, “Let's get started”, “Boost your productivity”.
- Tràn chữ hoặc cuộn ngang vô lý trên mobile; thu font quá nhỏ để cố nhét dữ liệu; status chỉ báo bằng màu.
- Raw stack trace, raw API/SQL/DOMException, mã lỗi backend khó hiểu cho người dùng cuối.

**Quy tắc sử dụng màu:** chỉ một primary brand color cho hành động chính, điều hướng active, link quan trọng, selected/focus. Màu `success/warning/error/info` chỉ khi truyền đạt trạng thái thực; giá trị warning = 0 không tự tô đỏ/cam. Phân biệt badge `status`, `priority`, `category`, `warning`; **không badge hóa mọi field**. Chip/tag tối đa khoảng 2–3 rồi `+N`; icon phải có ý nghĩa hành động, không dùng chỉ để lấp chỗ trống.

Nguồn: `prompt1.md` §§5–7; `prompt2.md` §§2–6, 12–13, 22, 36; `prompt1909` §§19, 24–25, 29, 32, 44.

---

## 2. DESIGN TOKENS — CHỈ MỘT HỆ THỐNG

Tập trung token tại một nơi. **Không hard-code** màu, margin/padding, radius, chiều cao control rải rác; không để mỗi module có bộ CSS/token riêng. Ưu tiên dùng và chuẩn hóa token/component đang có thay vì tạo một design system song song.

| Nhóm | Quy định / định hướng được trích |
|---|---|
| **Spacing scale** | `4, 8, 12, 16, 20, 24, 32, 40, 48` px (thang gợi ý) |
| **Input radius** | Khoảng `6–8px` |
| **Button radius** | Khoảng `6–8px` |
| **Card radius** | Khoảng `8–10px` |
| **Modal radius** | Khoảng `10–12px` |
| **Page title** | Khoảng `22–24px` |
| **Section title** | Khoảng `16–18px` |
| **Body** | Khoảng `14–16px`; mobile thường `15–16px` |
| **Secondary text** | Khoảng `13–14px` |
| **Data table** | Khoảng `13–14px` |
| **Font weight** | Chủ yếu `400, 500, 600`; không lạm dụng 700/800 |
| **Font** | Inter / Be Vietnam Pro / system font; **bắt buộc hiển thị tiếng Việt chính xác** |
| **Nền / Surface** | Neutral; ví dụ nền `#F7F8FA`, surface `#FFFFFF` |
| **Text / Border** | Primary gray 900; secondary gray 600; muted gray 500; border gray 200/300 hoặc tương đương |
| **Shadow** | Nhẹ cho modal, popover, dropdown, floating surfaces; hạn chế card/table |
| **Brand** | Một primary + hover/active/subtle/border/focus token có kiểm soát |
| **Semantic** | neutral, info, success, warning, danger/error |

**Spacing ownership:** Parent layout chịu trách nhiệm khoảng cách giữa children. Không cộng chồng `PageHeader margin-bottom + PageContent padding-top + Card margin-top`. Page cùng loại phải có baseline title, chỗ bắt đầu content, toolbar height và card padding thống nhất. Sửa tận shared layout/token, không vá từng trang bằng margin riêng.

**Mật độ thông tin:** giảm card/input/header/khoảng trắng quá lớn, nhưng không compact đến mức khó chạm/khó đọc. Có thể hỗ trợ density `Thoải mái / Tiêu chuẩn / Gọn` an toàn qua cấu hình, không cho admin nhập pixel tùy ý.

Nguồn: `prompt1.md` §7; `prompt2.md` §§5–6; `prompt4.md` §§9–13, 21, 45–46; `prompt1909` §§20–26.

---

## 3. APP SHELL, MENU, PAGE LAYOUT VÀ ROUTING

### 3.1. Desktop shell

- Cấu trúc: **sidebar trái + header trên + main content**.
- Sidebar **khoảng 240–260px**; header **khoảng 56–64px** (tham số gợi ý, không ép nếu codebase có token chuẩn hợp lý hơn).
- Sidebar: branding, nhóm nghiệp vụ, active item, hover, permission filtering, collapse khi hợp lý, fallback responsive; active tinh tế, không tô đậm nhiều item cùng lúc.
- Header nhỏ gọn: breadcrumb/context, global search nếu cần, thông báo, user menu, chỉ thêm quick action thật sự hữu ích.
- Các nhóm menu nghiệp vụ: Tổng quan; Nhân sự (nhân viên/chấm công/bảng công/ca/nghỉ phép); Dự án (dự án/công trường/cập nhật/điểm danh); Kho (hàng hóa/nhập/xuất/chuyển/kiểm kê); Xuất nhập khẩu; Quản lý (phê duyệt/báo cáo); Hệ thống (người dùng/vai trò-quyền/cấu hình). Hiển thị theo quyền và module enable.
- `Dashboard` phải có lối quay về từ mọi module; active item xác định theo pathname/current route, không để sai menu.

### 3.2. Mobile shell

- **Không** thu nhỏ sidebar desktop. Bottom navigation tối đa **5 đích** (master gợi ý khoảng 4–5), theo role/permission; safe area đúng, không đè CTA.
- Nhân viên: `Trang chủ / Chấm công / Đơn từ / Thông báo / Cá nhân` (ví dụ).
- Giám sát: `Trang chủ / Điểm danh / Dự án / Thông báo / Cá nhân` (ví dụ).
- **Một màn hình = một nhiệm vụ chính**. Ưu tiên hành động người dùng làm ngay thay vì biểu đồ.

### 3.3. Chuẩn page template

- **List/Data Page:** `PageHeader(Title, Description, PrimaryAction) → Toolbar(Search/Filter/Date/Columns/Export/Bulk) → DataTable hoặc mobile list → Pagination`. Table có thể dùng gần full workspace.
- **Form Page:** dùng route riêng cho create/edit dài; desktop gợi ý khung **1000–1200px**, hai cột khi hợp lý; mobile **một cột**. Form dài chia section, sticky actions khi cần.
- **Detail Page:** header entity rõ, các section/tabs thật; desktop gợi ý khung **1200–1400px** (không cố định bắt buộc).
- **Dashboard Page:** responsive grid, auto-height, widget theo dữ liệu thực; desktop gợi ý **1440–1600px**. Không dùng một `max-width` duy nhất cho mọi page.
- Không stretch input/card vô hạn trên màn hình 1920/2560; danh sách rộng thì dùng không gian hữu ích của bảng.
- Các page cùng loại dùng cùng template, không tự sáng tạo hierarchy/margin mỗi nơi.

### 3.4. Quy tắc route / tab / drawer / modal / lightbox

| Kiểu | Dùng khi | Không dùng khi |
|---|---|---|
| **Route/page** | Module khác, entity khác, form dài, workflow nhiều bước, detail cần bookmark/deep-link/back | Không tạo giant state-only page |
| **Route-backed tab** | Các phần lớn trong employee/project/shipment/item detail; URL phản ánh tab | Không state-only tab cho section lớn |
| **Drawer** | Quick detail, preview, quick edit, contextual info | Không biến thành toàn bộ hồ sơ phức tạp |
| **Modal** | Confirm, thao tác ngắn, form nhỏ | Không nhét form nhân viên 40 fields hoặc phiếu kho nhiều dòng |
| **Lightbox** | Ảnh, album, preview tài liệu nhẹ | Không tải full-size hàng loạt trước |

- Browser Back/Forward, Refresh, direct deep-link phải hoạt động; query filters/pagination/search/scroll nên giữ khi `List → Detail → Back` nếu hợp lý.
- Route-backed tabs và breadcrumb chính xác; mỗi page chỉ có **một Page Title**; không xuất hiện breadcrumb sai kiểu “Hệ thống > Không tìm thấy”.
- Trường hợp từng xảy ra **Back trên production/Vercel về route đúng nhưng content trống**: bắt buộc sửa root cause (auth hydration, effects, query keys, router cache, BFCache, params, abort, state), **cấm** vá bằng `window.location.reload()`, `router.refresh()` mọi trang, `setTimeout`, random key hay disable cache toàn ứng dụng.
- URL query giữ filter quan trọng, ví dụ `/employees?status=active&department=engineering&page=2`.

Nguồn: `prompt1.md` §§8–13, 37–40; `prompt2.md` §§7–20, 33, 40–42; `prompt1909` §§5, 20–24, 32, 39.

---

## 4. RESPONSIVE / TOUCH / ACCESSIBILITY / MÀN HÌNH LỚN

**Mobile:**

- Touch target tối thiểu **44×44px**; primary action có thể cao **52–56px** nếu hợp lý.
- Body không bị thu nhỏ khó đọc; nút đủ lớn, row action bấm được; tuyệt đối không phụ thuộc `hover`.
- Không horizontal overflow, text Việt wrap lỗi, button bị cắt, cột tràn dọc; cho code/email/filename quá dài phải có max-width + ellipsis + tooltip/detail.
- Có keyboard handling: bàn phím không che field hoặc nút lưu; bottom nav không đè nội dung, safe area iPhone/PWA và browser bar chính xác.
- Desktop table phải biến thành **task-oriented list/compact rows/detail** trên điện thoại; scroll ngang bảng chỉ nếu thật sự cần so sánh dạng ma trận.
- Giám sát công trường: mobile phải ít thao tác, phù hợp mạng yếu, có trạng thái offline/pending/sync/GPS bằng từ ngữ phổ thông.
- Breakpoint behavior phải có quyết định cụ thể `resize / stack / collapse / hide / move / replace presentation`, không chỉ CSS shrink.

**Tablet/desktop/wide:**

- Tablet portrait dùng được; 2 cột dashboard khi phù hợp. Desktop dashboard grid thường 2–4 cột, mobile một cột.
- Không kéo card full 2.000px trên wide screen; table/list tận dụng chiều ngang, form/detail bounded width; không có khoảng trống vô nghĩa.

**Viewport regression bắt buộc (hợp nhất các prompt):**

`360px`, `375×812`, `390×844`, `430×932`, tablet `768×1024`, laptop `1366×768`, desktop `1440×900`, `1920×1080`, wide `2560×1440`.

**Accessibility:**

- Navigation bàn phím, tab/focus rõ, focus ring, `<label>`/control association, semantic button, icon-only `aria-label`.
- Không truyền trạng thái chỉ bằng màu; color contrast đủ đọc, lỗi kèm text; screen-reader semantics cho heading, combobox, dialog.
- Modal/command palette cần focus trap, Escape close; lightbox hỗ trợ arrow navigation; reduced motion nếu animation.
- Thử trên Chrome/Edge mới, Safari iOS và Chrome Android nếu là trình duyệt người dùng mục tiêu; ưu tiên test camera/GPS/offline trên thiết bị thực.

Nguồn: `prompt1.md` §§9–11, 19, 37; `prompt2.md` §§14–18, 33–36, 48; `prompt6.md` §86; `prompt14.md` §§73–77; `prompt16.md` §§7–9, 144, 150; `prompt1909` §§24, 30, 41.

---

## 5. THƯ VIỆN THÀNH PHẦN DÙNG CHUNG — KHÔNG DUPLICATE

Tìm/chuẩn hóa/reuse các component tương đương hiện có trước khi tạo mới:

```text
AppShell / AppSidebar / AppHeader / MobileBottomNav
AppPage / PageHeader / PageBreadcrumb / PageActions / PageToolbar
Breadcrumb / UserMenu / NotificationPanel
Button / IconButton / Input / Textarea / Select / Combobox
Checkbox / Radio / Switch / DatePicker / DateRangePicker
SearchInput / FilterBar / FilterChip
DataTable / Pagination / ColumnVisibilityMenu / DropdownMenu / Tabs
Card / SectionCard / StatCard / MetricCard / DashboardGrid / DashboardPanel
FormSection / FormGrid / FormField
StatusBadge / PriorityBadge / ApprovalStatus
Modal / Drawer / ConfirmDialog / Lightbox
EmptyState / LoadingState / Skeleton / ErrorState
PermissionDeniedState / OfflineState / Toast
FileUpload / ImageUpload / AttachmentList / DocumentList / Avatar
Timeline / ApprovalTimeline / AuditHistory
```

- Một component = một chuẩn visual/behavior. Không có năm phiên bản nút, ba CSS bảng hoặc các selector nhân sự riêng cho từng module.
- `DataTable`: loading, empty, error, sort, search, filter, pagination, selection, column visibility, action menu, sticky header nếu cần, fallback mobile, keyboard cơ bản. Style **compact, readable, border nhẹ, hover nhẹ, header rõ**, hạn chế zebra mạnh.
- Mỗi row chỉ hiển thị action trực tiếp thực sự thường dùng; phần còn lại vào menu `⋯`.
- `FormField`: label, required marker, helper, validation sát field, schema/server-side validation; lỗi tạm thời không mất nội dung.
- `StatusBadge`: nhỏ, có ý nghĩa; không đặt trên mọi field.
- `Toast`: dùng vừa đủ cho success/error/sync; không spam. Destructive action phải confirm.
- `Lightbox`: thumbnail, lazy full image, next/previous, arrow keys, ESC, loading/error/metadata, zoom nếu cần; không preload hàng trăm ảnh.
- Chỉ xóa component/CSS legacy khi xác nhận đã migrate toàn bộ nơi sử dụng và không làm mất nghiệp vụ.

Nguồn: `prompt1.md` §§14–19; `prompt2.md` §§21–27, 43–45; `prompt1909` §§21–23, 29, 31.

---

## 6. TRẠNG THÁI GIAO DIỆN, DỮ LIỆU VÀ HIỆU NĂNG

- Mọi page/luồng quan trọng phải có **Loading, Empty, Error, PermissionDenied, Offline/NetworkDisconnected, Success** khi thích hợp; không `return null` ra trang trắng.
- Skeleton phù hợp cho table/detail header/card/image; không treo fullscreen spinner thiếu thông tin.
- Empty có title + hướng dẫn ngắn + CTA **chỉ khi user có quyền/thật sự thực hiện được**. Không dùng marketing copy.
- Error phải giải thích bằng tiếng Việt, có `Thử lại` hoặc điều hướng hợp lý; 403/404/500 không lộ framework trace.
- Kết nối yếu: giữ draft, trạng thái pending, retry rõ; không báo thành công giả khi chưa lưu. Không spam toast mạng nhấp nháy.
- **Adaptive data**: test với `0, 1, 5, 20, 100+` bản ghi. Quy tắc tham khảo cho panel: `0→Empty`, `1–4→auto-height`, `5–8→bounded`, `>8→Xem tất cả / scroll / pagination`. Không fixed-height để lại vùng trống dài.
- Chart: `0 nhóm→không chart`, `1 nhóm có ý nghĩa→summary nhỏ`, `>=2 nhóm có ý nghĩa→chart nếu hữu ích`; không xóa hẳn khả năng chart khi seed data ít, nhưng **không tạo dữ liệu giả**.
- Hạn chế duplicate fetch, render lặp, waterfall, giant bundle, ảnh gốc trên list; có lazy image, lazy route, pagination/virtualization khi cần; widget lỗi không làm crash toàn trang.
- Phải tách server state, URL state, UI local state, form state, auth state; navigation chính không dựa vào state local đơn thuần.

Nguồn: `prompt1.md` §§17–18, 34, 48; `prompt2.md` §§23–26, 43–46; `prompt15.md` §§62–67, 152, 162; `prompt1909` §§26, 31, 39–40.

---

## 7. YÊU CẦU UI/UX CỤ THỂ THEO TỪNG MODULE

> Mỗi mục dưới đây là **điều kiện tổ chức UI**, không cho phép tự rút gọn nghiệp vụ. Route dưới đây là ví dụ convention trong prompt gốc; khi codebase có route chuẩn tương đương, ưu tiên giữ route hiện tại và cung cấp chuyển hướng tương thích thay vì tự phá deep-link.

### 7.1. Nhân sự, hồ sơ, tài khoản, vai trò — `prompt3.md`

- Desktop `/employees`: table mã NV, tên, phòng ban, chức vụ, loại nhân sự, liên hệ, ngày vào, trạng thái; filter search/phòng ban/chức vụ/loại/trạng thái; giữ query trong URL.
- Tuyệt đối **không hiển thị CCCD, ngân hàng, BHXH mặc định trong list**, global search snippet hoặc payload của người không có quyền. Mask field nhạy cảm; phân quyền xem/xuất riêng, không chỉ ẩn CSS.
- Employee detail: header tên + mã + phòng ban/chức vụ + trạng thái; tabs route-backed `Hồ sơ / Công việc / Hợp đồng / Tài liệu / Lịch sử / Tài khoản`, mở rộng `Chấm công / Nghỉ phép / Bảng công` khi module hoạt động.
- Tạo hồ sơ qua `/employees/new`, **không modal khổng lồ**. Các section: cơ bản, công việc, liên hệ; chỉ bắt buộc field cần lúc tạo. Quick-edit dùng drawer nếu phù hợp; full-edit dùng page.
- Desktop hồ sơ phân section, chỉ show sensitive data nếu thực sự cần và có quyền. Lịch sử timeline người đọc hiểu, **không raw JSON diff**; hợp đồng theo table/timeline.
- Tab tài khoản chỉ show định danh, trạng thái, vai trò, ngày kích hoạt, last login nếu hỗ trợ; **không show password**.
- Quản lý quyền: nhóm permission theo nghiệp vụ, checkbox + giải thích tiếng Việt; không yêu cầu admin hiểu key kỹ thuật. Mobile employee chỉ self-service và thông tin cơ bản, không ép full HR editor; HR mobile dùng compact list.

### 7.2. Admin Console, branding, giới hạn tùy chỉnh — `prompt4.md`

- Admin Console **chung AppShell**, có sub-navigation: thương hiệu, giao diện, điều hướng, module, tổ chức, thời gian, bảo mật, lịch sử/audit; không tạo website quản trị tách rời vô ích.
- Trang branding cho chỉnh tên hệ thống/công ty, logo chính/compact/favicon và các biến thể cần thiết; logo upload PNG/JPEG/WEBP, SVG chỉ khi sanitize an toàn, preview/replace/remove/reset/validation. Tỷ lệ gợi ý logo ngang **3:1–5:1**, icon/favicon **1:1**; ảnh lỗi có fallback chữ `MARIXA`/icon. Marixa V1 dùng logo chính thức; mục này không tự yêu cầu xây thêm trình quản lý thương hiệu.
- Cùng một brand source áp dụng sidebar, mobile header, login, favicon và các xuất bản báo cáo khi có tích hợp; **không hard-code logo ở nhiều nơi**.
- Primary color chọn qua preset/picker/hex valid; hệ thống tự derive hover/active/subtle/border/focus, kiểm tra contrast và foreground. Có preview trước publish; không cho màu làm chữ khó đọc.
- Appearance cho cấu hình an toàn density, sidebar, table density, default page size, mode đã support. **Không tự thêm dark mode nửa vời**; font chỉ từ bộ đã duyệt, không custom font tùy ý.
- Login chỉ logo, tên hệ thống/công ty, subtitle ngắn; **không page-builder/marketing hero/gradient**.
- Navigation có thể reorder trong nhóm cho phép, bật/tắt module ở cấp tổ chức, landing mặc định; **không sửa arbitrary route/script hay bypass permission**.
- **V1 cấm admin tự nhập CSS/JS/raw HTML, sửa component layout, drag-drop toàn bộ trang, sửa route/DB schema/API/auth/business logic, upload executable tùy ý.** `Safe configuration > unlimited customization`.
- Settings chia subroute, không trang 5.000px. Có preview, cảnh báo unsaved change, confirm publish/reset quan trọng, success message. Admin mobile chỉ cần xem và chỉnh đơn giản; workflow cấu hình phức tạp ưu tiên desktop.

### 7.3. Chấm công cá nhân — `prompt5.md`

- Mobile-first `/attendance`: ngày/giờ hiện tại, ca, địa điểm được phép, GPS status, mạng, trạng thái chấm công, **một CTA chính**, lần chấm gần nhất.
- Camera **không phải file upload thông thường**: mở camera, GPS chạy song song, chụp ảnh, preview, `Chụp lại / Sử dụng ảnh`, local save, submit/sync. Camera trước ưu tiên selfie; cho đổi camera nếu cần. **Không filter/beauty/AR/sticker**.
- Nút chụp lớn. Lỗi camera/GPS/permission phải là tiếng Việt có hướng dẫn ngắn; **không raw DOMException**. Không tự dùng gallery fallback nếu policy bắt ảnh real-time.
- GPS status theo ngôn ngữ dễ hiểu, không hiển thị latitude/longitude/accuracy raw cho người thường; geofence, khoảng cách là dữ liệu từ cấu hình, không hard-code.
- Offline là trạng thái chính thức: vẫn chụp/lưu pending nếu khả thi; hiển thị rõ **“Đã ghi nhận trên thiết bị / Chờ đồng bộ / Đã đồng bộ / Đồng bộ lỗi”**. Không xóa queue nếu logout/session hết hạn; tránh chấm trùng do double tap.
- Sau submit phải có success screen rõ thời gian, nơi chấm, trạng thái sync; processing có text. Không spam network toast; dùng status tồn tại khi offline.
- HR desktop: record table/filter theo ngày/nhân viên/địa điểm/trạng thái/ngoại lệ; thumbnail lazy, lightbox đầy đủ, metadata (nhân viên/giờ/nơi/trạng thái); full image on-demand, không đưa ảnh gốc vào table.

### 7.4. Dự án, công trường, điểm danh công nhân tập thể — `prompt6.md`

- Phải phân biệt `Project` và `Worksite`. Desktop project list dạng table có filter; project detail header + route-backed tabs `Tổng quan / Nhân sự / Lịch / Điểm danh / Tài liệu / Lịch sử`.
- `/projects/:id/team` hiển thị theo nhóm quản lý, kỹ sư, giám sát, công nhân; phân công qua selector **dùng lại từ Nhân sự**. Lịch V1 ưu tiên ngày/tuần, không ép calendar quá phức tạp.
- Mobile giám sát **đưa công trường/worksite được phân công hôm nay lên đầu**, số công nhân dự kiến và nút `Điểm danh`; không bắt tìm trong menu dài.
- Wizard điểm danh giữ **roster tự tải từ assignment/snapshot**, các trạng thái có mặt/vắng/nghỉ/phát sinh và nguyên nhân theo policy; **không bắt nhập lại tên công nhân**. Bước ảnh tập thể cho **nhiều ảnh**, preview/xóa/chụp lại, camera sau, GPS của giám sát; bước review tổng hợp và confirm.
- Mobile worker list dùng compact rows, thao tác status rõ, sticky summary (có mặt/vắng/chưa xác nhận), một CTA `Tiếp tục`; **không dùng desktop table**. Roster lớn hơn ~30 người có search tên/mã nhưng **không mất trạng thái đã chọn khi lọc**.
- Bulk `Chọn tất cả có mặt` có thể dùng, nhưng thao tác chuyển mọi người sang trạng thái vắng hàng loạt phải an toàn/confirm. Không ép tính hoặc nhập % tiến độ nếu blueprint chưa yêu cầu.
- Khi rời wizard, draft được lưu local và có `Tiếp tục / Bỏ bản nháp` (bỏ phải xác nhận); offline roster chỉ dùng dữ liệu đã cache thật, **không tạo roster giả**. Submit offline xác nhận “lưu thiết bị/chờ đồng bộ”.
- HR desktop xem danh sách session theo ngày, project, worksite, giám sát, dự kiến, có mặt, vắng, phát sinh, ảnh, trạng thái; xem/sửa có lý do + history/audit, không sửa âm thầm.
- Nội dung công việc theo config (có thể optional); không biến điểm danh thành báo cáo 30 trường. Không xóa bước nghiệp vụ để làm UI gọn.

### 7.5. Đơn nghỉ, phê duyệt, phép năm, PDF — `prompt7.md`

- Employee mobile `/leave`: danh sách đơn của tôi dạng rows, status dễ hiểu, CTA `Tạo đơn` rõ. Form 1 cột, input lớn, số ngày dự kiến, số phép hiện có/đang chờ/khả dụng/sau duyệt **phân biệt đúng**; không làm người dùng tưởng pending đã trừ chính thức.
- Detail đơn: mã, trạng thái, loại, ngày, lý do nguyên văn, file, lịch sử phê duyệt bằng timeline người đọc được.
- Người duyệt mobile phải xem **context đủ trước khi bấm Duyệt/Từ chối**; không đặt 2 nút nhỏ trực tiếp trên list dày thiếu bối cảnh.
- HR desktop table/filter đơn, balance table và ledger theo thời gian; **không cho sửa trực tiếp ô “Còn lại”** trong table; không tạo calendar quá phức tạp nếu list đủ.
- PDF đơn nghỉ **A4 portrait**, margin, font Việt và pagination hợp lý, không cắt nội dung; phản ánh trạng thái draft/pending/approved/rejected, không giả chữ ký; không đưa CCCD/bank không cần thiết; không tạo ngôn ngữ pháp lý nếu chưa được xác nhận.
- Lỗi số phép thiếu/đơn trùng/người duyệt thiếu/chuyển trạng thái phải hiển thị tiếng Việt, không raw HTTP/SQL.

### 7.6. Bảng công, ca làm, xử lý ngoại lệ, Excel — `prompt8.md`

- Desktop `/timesheets`: table theo kỳ/tháng, status kỳ, filter phòng ban/trạng thái, xuất Excel; chi tiết từng nhân viên/từng ngày có nguồn chấm, nghỉ phép, điều chỉnh, ảnh/link và lịch sử.
- `/timesheets/exceptions` phải là **trung tâm ngoại lệ** (thiếu vào/ra, xung đột nghỉ phép, GPS, ảnh pending, sync pending, roster conflict); không bắt HR tự mở từng hồ sơ để tìm lỗi.
- Mobile nhân viên xem công theo ngày như `Ngày — giờ vào→ra — trạng thái`, tap xem chi tiết; không co bảng desktop.
- Admin export template chỉ cấu hình whitelist: sheet/cột/thứ tự/tên header, format ngày/giờ, freeze/filter, preview; **cấm arbitrary formula, VBA/macro, raw SQL/DB column**. Preview dùng dữ liệu an toàn, không cần xuất workbook đầy đủ cho mỗi lần xem.
- Excel chuyên nghiệp nhưng nhẹ: header rõ, freeze top, auto filter, độ rộng cột hợp lý, wrap lý do/ghi chú, date/time/number typed cells, hyperlink rõ; **không lạm dụng merged cells/màu trang trí/logo lớn**. Tất cả sheet dùng một snapshot/version của kỳ.

### 7.7. Cập nhật dự án / nhật ký hiện trường / giám sát tiến độ — `prompt9.md`

- UI dạng **structured timeline**, **không biến thành chat/social feed**. Mỗi update có tác giả, vai trò, ngày giờ, loại, nội dung preview, trạng thái, mức độ vấn đề khi có, file/ảnh và pinned marker. Card nhẹ, không oversized.
- Mobile giám sát CTA `Cập nhật dự án` trực tiếp; form ngắn: loại, title nếu cần, nội dung, tình trạng, issue flag/severity, ảnh/tài liệu, worksite nếu nhiều. Hỗ trợ nháp và phục hồi upload.
- Nội dung dài `Xem thêm`; feed chỉ preview **3–4 ảnh** rồi `+N`, click lightbox, full image theo nhu cầu; camera sau ưu tiên, compress và preview.
- Project overview trình bày health/status, người quản lý, lịch, nhân sự, điểm danh, vấn đề ghim, cập nhật gần; **không nhiều chart**. Timeline có filter loại/tác giả/worksite/vấn đề/severity/ngày/status.
- Dashboard quản lý ưu tiên **project cần chú ý, issue mở, cập nhật gần đây**. Director xem tổng quan, không mặc định tràn raw attendance/photos; PM được xem chi tiết hơn theo quyền.
- V1 **không ép % tiến độ cảm tính, WBS/KPI nặng hoặc task board** nếu blueprint chưa yêu cầu; project health không tự đổi bởi AI/UI.

### 7.8. Quản lý kho, hàng hóa, tồn, nhập/xuất/chuyển, kiểm kê — `prompt10.md`

- Desktop list/table cho mã hàng, tên, nhóm, đơn vị, kho, tồn, trạng thái; filter đầy đủ. Nếu nhiều kho, **không show “tồn tổng” gây hiểu nhầm**, phải ghi rõ tồn từng kho/tổng tồn.
- Item/warehouse detail có header + route-backed tabs tồn kho/lịch sử/tài liệu/giao dịch tương ứng; không giant page.
- Document detail phiếu: header số, trạng thái, kho, ngày; section thông tin, lines, file, lịch sử; actions theo status rõ (`Lưu nháp`, `Ghi sổ`, `Đảo phiếu`...) và quyền. **Phiếu đã POSTED không được edit âm thầm**.
- Phiếu nhập/xuất dùng **Form Page + bảng dòng hàng**, không modal lớn; keyboard-friendly; sticky actions khi dài. Line editor đơn giản item/qty/UOM/note, tránh spreadsheet nặng.
- Kiểm kê theo wizard `Chọn kho → Danh sách → Số thực tế → Chênh lệch → Ghi nhận`; refresh không mất draft.
- Dashboard kho chỉ vài thành phần hữu ích (hết/sắp hết, phiếu chờ, giao dịch gần), **không 15 biểu đồ**. Mobile kho ưu tiên xem tồn, xem phiếu, confirm đơn giản, không ép editor phức tạp như desktop.
- Ledger table có lọc, hiển thị transaction/nhập/xuất/balance/reference, không sửa ledger từ UI.

### 7.9. Xuất nhập khẩu, shipment, chứng từ, ETA — `prompt11.md`

- Desktop shipments table theo nhà cung cấp, hợp đồng, mode, xuất phát/đến, ETD/ETA, customs, receiving, trạng thái; filter `Needs attention`.
- Shipment detail header + route-backed tabs overview/lines/containers/documents/customs/receiving/history; overview tóm tắt để dễ quét, **không dồn raw data**.
- ETA thay đổi phải show **ETA hiện tại + lịch sử old→new**, cập nhật ETA có field ngày mới/lý do/nguồn; activity timeline human-readable, không raw audit JSON.
- Receiving progress % chỉ khi có **số thực nhận/tổng dự kiến có thật**. Documents table có version/status/upload/replace/view/archive, không overwrite mất lịch sử.
- Dashboard XNK: đang vận chuyển/sắp về/đang thông quan/chờ nhận kho/cần chú ý; chú ý lô trễ ETA, thiếu C/O/chứng từ, đã đến chưa nhập. Không nhiều chart.
- Mobile XNK chỉ cần xem shipment/ETA/status/chứng từ, upload tài liệu, cập nhật đơn giản theo quyền; không ép full hợp đồng/PO editor phức tạp. **V1 không cần bản đồ live vessel**.

### 7.10. Phê duyệt tập trung, thông báo, tài liệu, audit, cấu hình — `prompt12.md`

- Approval inbox phân loại yêu cầu/mã/người gửi/ngày/tóm tắt/bước hiện tại/thời gian chờ; **mở detail trước khi approve/reject** nếu list không đủ context. Detail có timeline, tài liệu và action đúng quyền.
- Mobile approvals dùng short actionable list → detail → action; không dense table. Workflow preview hiển thị tuyến phê duyệt + cảnh báo resolver thiếu trước publish.
- Notification center: chưa đọc/đã đọc, ngày giờ, type, mark read, deep-link; mobile nhóm Hôm nay/Trước đó. Notice hệ thống dùng banner nhẹ, không blocking popup trừ sự cố critical.
- Document Center desktop là **table-oriented** (tên/loại/module/version/ngày), search/filter metadata và permission; mobile là compact list → preview/detail. Ảnh/PDF có viewer, Office có thể download/open, không ép renderer Word/Excel browser nặng.
- Audit desktop table thời gian/actor/module/action/object/reference, drawer detail; không hiện diff JSON thô cho end user; không cần mobile audit quá sâu.
- Settings chia nhóm/subroute có search, không gộp 500 field thành trang dài.

### 7.11. API, integration, secrets — `prompt13.md`

- Integration dashboard chỉ các chỉ số vận hành hữu ích: kết nối, lỗi, webhook fail, last sync, API requests; không quá nhiều chart.
- Secret input **mask**, không reveal/khôi phục secret cũ, không prefill secret nhạy cảm; tránh URL, client log, local cache.
- Mapping UI nguồn→đích + preset transformation (`Direct`, `Trim`, `Uppercase`, date/enum mapping), **không editor raw code**.

### 7.12. Dashboard theo vai trò, global search, command center — `prompt14.md`

- Dashboard phải trả lời: **Hôm nay có gì? Điều gì bất thường? Tôi cần xử lý gì? Tôi đi đâu tiếp?** Không phải gallery KPI/chart.
- Dashboard `/dashboard` và landing theo role/permission: **việc cần xử lý → cảnh báo → hoạt động gần đây → quick actions**; không show dữ liệu người dùng không có quyền.
- Employee mobile: ngày/ca/chấm công/đơn/thông báo/bảng công; **không chart**. Supervisor mobile: công trường hôm nay/dự kiến/điểm danh/vấn đề/cập nhật; CTA rõ.
- HR: đơn cần duyệt, hồ sơ thiếu, công nhân tạm, bảng công exception, trạng thái nhân sự/chấm công. Warehouse: chứng từ chờ, tồn, kiểm kê. XNK: sắp về, thông quan, cần chú ý. Management: project health, high issues, cảnh báo tổng quan, không mặc định thấy CCCD/bank/ảnh chấm công.
- Dashboard card **nhỏ, data-oriented** (`Label / real value / context / deep link`); chart chỉ khi dữ liệu có ý nghĩa. Quick actions theo permission.
- Header global search `Tìm nhân viên, dự án, shipment, chứng từ...`; command palette `Ctrl/Cmd+K` nếu không conflict; palette ưu tiên top results/đi tới/tạo mới/gần đây, **không đưa trăm kết quả**; search page `/search?q=...` có tab/filter/pagination và URL lưu query.
- Mobile search mở **full-screen search**, không áp keyboard-centric command palette; command palette desktop support shortcut, focus, arrow, Enter, Esc, accessibility.
- Admin chỉ được bật/tắt/reorder widget preset, landing/dashboard preset; **không arbitrary dashboard builder**. Dashboard desktop grid vừa phải, mobile 1 cột, không kéo card rộng vô hạn.

### 7.13. Production, lỗi hệ thống, hiệu suất ảnh — `prompt15.md`

- System-health admin page có application/DB/storage/jobs/integrations/backup với status thật, không show secrets. Backup status không được giả khi không có nguồn dữ liệu.
- Có app-level, route-level, widget-level error boundary; một widget lỗi không crash toàn app.
- 404: `Không tìm thấy trang`; 403: `Bạn không có quyền truy cập`; 500: `Hệ thống gặp sự cố`; action thích hợp `Thử lại`/`Về trang chủ`.
- Các màn nhiều bản ghi (timesheet, ledger, audit, document, project updates) cần pagination/virtualization hợp lý, lazy images/route, không quá tải bundle.
- Dùng thumbnails/compressed image, mở ảnh gốc on-demand. Khi font/CDN bên ngoài lỗi, UI vẫn dùng được qua local/system font.

### 7.14. QA / UAT / go-live UI — `prompt16.md`

- Desktop QA: table, filter, form, drawer, modal, sticky header, overflow, chuỗi tiếng Việt dài, print/export ở `1366×768`, `1440×900`, `1920×1080` (và wide `2560×1440` từ master).
- Mobile QA: `360`, `375`, `390`, `430` cùng thực tế trên thiết bị khi có thể; chấm công camera/GPS/offline, worker attendance, leave, approvals, project updates, notifications, search; không chỉ emulator desktop.
- Browser QA Chrome/Edge mới, Safari iOS, Chrome Android theo đối tượng dùng; test label, keyboard, focus, contrast, touch, errors.
- PWA/safe area: bottom nav, camera controls, CTA không bị browser bar/keyboard che.
- Data production-like: dashboard/nhân sự/bảng công/kho/shipment/search/audit/tài liệu; không có delay nhiều giây không loading state. Test business regression đầy đủ trước nghiệm thu.

---

## 8. NHỮNG RÀNG BUỘC PHI GIAO DIỆN PHẢI BẢO TOÀN KHI SỬA UI

Đây là **guardrail chống regression**, không phải yêu cầu mở rộng backend ngoài phạm vi:

1. Không làm mất/double-submit chấm công, ảnh, GPS, offline queue, retry, idempotency; các sync states phải phản ánh đúng.
2. Không xóa/chuyển biến domain `Employee record ≠ User account` và `Project ≠ Worksite`.
3. Permission phải kiểm tra server-side; UI chỉ ẩn/disable action theo permission, không bao giờ coi ẩn nút là bảo mật.
4. Các trạng thái `APPROVED / POSTED / LOCKED` không được chỉnh âm thầm; có workflow, reason, lịch sử, audit.
5. Nghỉ phép phải tôn trọng ledger; bảng công giữ source/history; kho dùng stock ledger; XNK liên kết nhập kho đúng thực tế.
6. Không giả dữ liệu KPI, trạng thái, thống kê, backup, ETA, tồn kho, nhân công, approval; `0` phải là dữ liệu thật, không gợi ý sai.
7. Không phát minh giờ làm, OT, cách tính trễ/về sớm, số kho, policy geofence, phép năm, checklist chứng từ, phê duyệt, biểu mẫu PDF khi chưa xác nhận. Thiết kế configurable và đánh dấu `NEEDS_CONFIRMATION`.
8. Không gây rò rỉ PII trong list, search, preview, URL, logs, export hoặc photo/document viewer.
9. Không làm sai authentication hydration, realtime subscription cleanup, API contract, report/export behavior, deep-link hoặc file ownership.
10. Không phá chức năng hiện hữu chỉ vì không có data demo, không có ảnh screenshot hoặc màn đó chưa được đưa vào navigation.

Nguồn: `prompt1909` §§1–18, 35–40, 42–48; cross-reference `prompt3.md`–`prompt16.md`.

---

## 9. QUY TRÌNH THỰC HIỆN CHO CODEX — BẮT BUỘC

### Pha A — Inspect, inventory, audit

1. Đọc project `AGENTS.md`, README, design-system, source tree, package scripts; đọc đặc tả Marixa, plan/worklog và bản master này theo phạm vi áp dụng ở đầu tài liệu.
2. Lập inventory route/page/component/CSS/token, permission/auth, data fetching, responsive và module workflows. Phân loại **CURRENT / LEGACY / DUPLICATE / UNREACHABLE**.
3. Tạo **Business Preservation Matrix** với link file+symbol và so với blueprint. Ghi rõ domain nào đang COMPLETE/PARTIAL/MISSING/CHANGED/CONFLICT/UNKNOWN; tránh xóa nhầm.
4. Tạo **UI Constraint Matrix**: `Requirement ID | Rule | Source prompt & section | Current status | Affected screens | Severity | Fix plan`.
5. Xác định các lỗi ưu tiên P0/P1: mất content khi Back/Forward, mobile blank, overflow, khó thao tác chấm công/điểm danh, menu sai, lỗi upload, dữ liệu nhạy cảm lộ, UI bị đè keyboard, thiếu state.

### Pha B — Chuẩn hóa mà không đổi domain

6. Chuẩn hóa design tokens, một app shell desktop/mobile, page templates và shared components trước; không refactor business API tùy tiện.
7. Migrate màn hình **theo module**, bảo đảm mỗi lần thay có desktop/mobile, route, states, permission và test hồi quy. Không rewrite tất cả thành giant component.
8. Mỗi màn: kiểm tra hierarchy (1 title/1 CTA chính), layout width, density, table/list, filter URL, empty/loading/error/offline, text dài, hành động destructive, accessibility.
9. Với worker attendance, attendance cá nhân, nghỉ phép, kho và XNK: **kiểm tra state machine và dữ liệu thật** trước khi thay bố cục UI.
10. Refactor duplicate CSS/component chỉ khi không thay đổi behavior; không xóa legacy nếu còn màn dùng.

### Pha C — Kiểm thử, nghiệm thu, báo cáo

11. Test viewports: `360`, `375×812`, `390×844`, `430×932`, `768×1024`, `1366×768`, `1440×900`, `1920×1080`, `2560×1440`.
12. Test data volumes: `0,1,5,20,100+`; tiếng Việt dài; không có ảnh; ảnh lỗi; offline, mạng chậm, session expired; long names/codes.
13. Test navigation: direct link/refresh, tab routes, list→detail→Back→Forward, query filters/pagination/scroll, auth hydration; không workaround reload.
14. Test role & permission: employee, supervisor, HR, PM, warehouse, XNK, management, admin; trực quan đúng phạm vi, backend không lộ dữ liệu.
15. Test workflow: chấm công/GPS/camera/offline, điểm danh/roster/ảnh/submit, nghỉ phép/approval, bảng công/Excel, dự án, kho/posted/ledger, XNK/receiving/ETA, notification, search.
16. Chạy lint/typecheck/build và test hiện có; không dùng `any`, `@ts-ignore`, catch rỗng để che lỗi mới; báo cáo những failure không do thay đổi của đợt này.

**Tối ưu theo mức độ rủi ro:** P0 nghiệp vụ/data/security/navigation, P1 mobile field usability, P2 consistency/spacing/polish. Không đổi hệ thống chạy ổn thành chậm hơn chỉ vì đẹp hơn.

---

## 10. ĐẦU RA CODEx PHẢI BÁO CÁO

Sau khi chạy prompt này trong môi trường coding, **không được chỉ báo “đã tối ưu UI”**. Xuất:

1. **Bảng tất cả ràng buộc UI/UX đã audit**, có nguồn tệp/mục, status `PASS/FAIL/PARTIAL/NOT_APPLICABLE`, đường dẫn component/page.
2. **Business Preservation Matrix**, những nghiệp vụ bị mất trước đó và đã/ chưa khôi phục, lý do.
3. **Danh sách routes/screens đã sửa**, màn desktop/mobile, screenshots/evidence nếu công cụ cho phép.
4. **Bộ design tokens**, shared component và page template, nơi nằm trong source, phần CSS legacy đã loại bỏ.
5. **Các thay đổi navigation, form, table/list, dashboard, offline, state, accessibility**, phân theo module.
6. **Đánh giá dữ liệu ít/nhiều và responsive**: viewport + 0/1/5/20/100+, các lỗi còn lại.
7. **Xác minh Back/Forward/Refresh**, đặc biệt root cause lỗi content trống trên production; không dùng force reload.
8. **Tình trạng auth/permission/realtime/upload/report/ledger/workflow**, chứng minh không bị phá.
9. **Kết quả lint/typecheck/build/tests**, lỗi mới/legacy, giới hạn chưa giải quyết và quyết định cần business xác nhận.
10. **Danh sách file thay đổi**, migration/data/security tác động (nếu có) và cách rollback hợp lý.

### Acceptance checklist cốt lõi

- [ ] Chỉ **một** bộ design tokens, một hệ page templates, shared components reuse.
- [ ] Không AI/template look, gradient trang trí, pastel tràn lan, oversized cards, KPI/chart giả.
- [ ] Desktop không loãng ở 1920/2560, form không stretch vô hạn; table đủ đọc.
- [ ] Mobile giám sát thao tác nhanh, một primary task, không sidebar/table shrink, không overflow.
- [ ] 44px touch targets, safe area/keyboard, accessibility states cơ bản.
- [ ] Tiếng Việt chính xác, không text/code dài làm vỡ layout.
- [ ] Một page title, một CTA chính cho cùng hành vi; route/active nav/breadcrumb đúng.
- [ ] Page và widget có Loading/Empty/Error/Permission/Offline/Success phù hợp.
- [ ] Dữ liệu thật ít/nhiều thích ứng, không fake information.
- [ ] Camera/GPS/roster/approval/ledger/reports/audit/permission không bị giản lược.
- [ ] Deep-link, Back/Forward/Refresh hoạt động không mất content.
- [ ] Build/typecheck/lint/test được thực thi và được báo cáo trung thực.

---

## 11. PHỤ LỤC — DANH MỤC 17/17 TỆP ĐÃ ĐỌC VÀ CÁC MỤC UI QUAN TRỌNG

| Tệp | Trọng tâm giao diện và giới hạn nổi bật |
|---|---|
| [`prompt1.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt1.md) | §§4–19, 37–40, 48, 50: UI direction, cấm style, token, shell, mobile, pages, nav, components, states, accessibility |
| [`prompt2.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt2.md) | §§1–46, 48–50: frontend UI tổng thể, tables/forms, color, mobile, QA, code quality, performance |
| [`prompt3.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt3.md) | §§18–23, 39, 54–60, 65–67: nhân sự list/detail/form, tài khoản, sensitive, role UI, mobile |
| [`prompt4.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt4.md) | §§2–15, 21–25, 40–48: admin layout, branding, appearance, safe customization, preview/save |
| [`prompt5.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt5.md) | §§3–10, 13–16, 22–23, 38–45, 47–48, 57–62: mobile attendance, camera, GPS, offline, states |
| [`prompt6.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt6.md) | §§13–20, 24, 30–40, 45, 57, 59–63, 83, 85–86: project/worksite, attendance wizard, supervisor UX |
| [`prompt7.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt7.md) | §§3, 6–11, 33–41, 49–55, 77–78: leave form, mobile approvals, balance, PDF, errors |
| [`prompt8.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt8.md) | §§32–35, 38, 40–54, 63–67, 83: timesheet UI, exception center, Excel style/template, mobile |
| [`prompt9.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt9.md) | §§4, 15–18, 33–40, 63–70: project update timeline, feed limits, issues, dashboard, mobile |
| [`prompt10.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt10.md) | §§12, 36–43, 69–71, 90–94: warehouse list, document page, line editor, stock count, mobile |
| [`prompt11.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt11.md) | §§29, 48–53, 57, 63–67, 71: shipment list/detail, ETA history, documents, dashboard/mobile |
| [`prompt12.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt12.md) | §§4–6, 14, 23, 43–45, 63, 73, 100–105: approvals, documents, notification, audit, settings |
| [`prompt13.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt13.md) | §§48, 56, 89, 92: masked secrets, mapping UI, integration dashboard, security |
| [`prompt14.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt14.md) | §§2, 6–16, 20, 24–27, 41–42, 50–52, 73–77: dashboard theo role, search, command palette |
| [`prompt15.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt15.md) | §§54, 62–67, 99, 119, 152, 162: health UI, error boundaries, performance, image loading |
| [`prompt16.md`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt16.md) | §§7–9, 144, 150, 152 và UAT theo module: desktop/mobile/browser QA, safe area, regression |
| [`prompt1909`](https://github.com/chautuancons2010/CT_NoiBo/blob/main/prompt/prompt1909) | **Master redesign** §§1–3, 19–26, 29–41, 44–48: thứ tự ưu tiên, cấm UI phá business, wide screen, spacing, adaptive data, P0 Back |

> **Lưu ý nguồn:** Một số đoạn ở `prompt1.md` và `prompt2.md` thuộc định hướng “nền tảng” của các giai đoạn cũ. `prompt1909` nhấn mạnh khi redesign trên phần mềm hiện hành, **phải giữ business preservation**, vì vậy không được dùng các câu “chưa cần logic nghiệp vụ” trong bản nền tảng để xóa chức năng đã hoàn thiện. Các giá trị kích thước/tỷ lệ trong prompt gốc là gợi ý trừ khi ghi rõ “BẮT BUỘC”.

**NGUYÊN TẮC CUỐI:** Không thiết kế chỉ cho screenshot, seed data, một module hay chỉ desktop. Kết quả phải là **một hệ thống nội bộ Marixa có nghiệp vụ đúng đặc tả, giao diện nhất quán, mobile dễ thao tác, desktop giàu dữ liệu cho văn phòng, dữ liệu ít/nhiều đều ổn định, có thể phát triển tiếp mà không phá domain logic.**
