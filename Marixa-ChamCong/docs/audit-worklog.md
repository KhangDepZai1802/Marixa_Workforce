# Nhật ký review module Chấm công

Ngày: 08/10/2026 (Asia/Saigon). Commit gốc: `bdb4a43b0c01e331f0bde6db6e10f2693b71e10f`.

Phạm vi: chỉ đọc và review ứng dụng; chỉ cài/cập nhật skill và tạo tài liệu audit. Không sửa implementation, chạy migration, gửi chấm công thật hay ghi dữ liệu production.

## Theo dõi công việc

- [x] SEQ: kiểm tra workspace, chỉ dẫn, trạng thái Git và file đính kèm.
- [x] SEQ: cài và đọc Business Analyst SKILL.md; kiểm tra tài liệu tham chiếu của project.
- [x] SEQ: cập nhật UI/UX Pro Max bằng CLI chính thức 2.15.0; hợp nhất vào bản skill hiện có, không giữ bản trùng.
- [x] SEQ: đọc đầy đủ skill/reference mới và các mẫu tham chiếu BA; không áp nghiệp vụ của repository nguồn vào project này.
- [x] PAR đợt 1, backend: trace controller, service, model, mapping, database, phân quyền, phụ thuộc ca/nghỉ/lương và test; ghi danh sách file đã đọc cùng bằng chứng.
- [x] PAR đợt 1, frontend: trace route, API, luồng nhân viên/quản trị và UI dùng chung; ghi danh sách file đã đọc cùng bằng chứng.
- [x] PAR đợt 1, phụ trách chính: kiểm tra khởi động/xác thực/schema, chuẩn bị UI local cô lập và ghi nhận thực tế ở nhiều viewport.
- [x] SEQ sau đợt 1: đối chiếu nghiệp vụ với UI/API/DB, kiểm chứng kết luận và nguồn trích dẫn.
- [x] SEQ: viết `docs/modules/attendance/01-business-analysis.md` bằng tiếng Việt, đủ 13 mục yêu cầu.
- [x] SEQ: viết `docs/ui-ux/01-ui-ux-pro-max-audit.md` bằng tiếng Việt, đủ 18 mục và đề xuất top 10/mobile.
- [x] SEQ: kiểm tra liên kết, bằng chứng, mức độ nghiêm trọng, giới hạn audit và xác nhận source không đổi.
- [x] SEQ: rà soát sai sót trong phân tích; bàn giao tóm tắt điều hành và câu hỏi nghiệp vụ còn mở.

## Ghi chú khi áp dụng skill từ repository khác

Skill BA có các quy ước khởi tạo và đường dẫn tham chiếu dành riêng cho EasyPlatform. Khi bắt đầu audit, repository này chưa có `docs/project-config.json`, `docs/project-reference/`, `docs/specs/`, `AGENTS.md` hoặc `CLAUDE.md`. Yêu cầu của người dùng về chỉ review, đường dẫn báo cáo, bằng chứng source cụ thể và nhãn NEEDS VALIDATION được ưu tiên. Không sinh bộ khung project không liên quan, không implement, không áp nghiệp vụ EasyPlatform. Báo cáo AS-IS không đồng nghĩa với đặc tả nghiệp vụ đã được chủ nghiệp vụ chấp thuận.

Kết quả UI chạy với dữ liệu giả lập chỉ là bằng chứng về bố cục/tương tác, không chứng minh API thật hoạt động đúng. Quyền camera/GPS và bàn phím trên thiết bị thật cần kiểm chứng riêng.

## Những quy định người dùng đã xác nhận

- Lịch làm hiện tại: 08:00–12:00 và 13:00–17:00; nghỉ trưa 12:00–13:00, tổng 8 giờ làm/ngày. Chưa chốt số lượt chấm trong giờ nghỉ trưa, dung sai hoặc quy tắc công một phần ngày.
- HR/Admin quản lý toàn công ty; Manager chỉ quản lý nhân viên phụ trách. Chưa chốt cách xác định quan hệ phụ trách và tự duyệt công.
- Mỗi doanh nghiệp dùng hệ thống/database riêng. Không đưa đa tenant dùng chung database vào yêu cầu thiếu bắt buộc.

## Nguồn và phiên bản skill

- Business Analyst: [repository nguồn](https://github.com/duc01226/EasyPlatform/tree/main/.agents/skills/business-analyst), cài tại `.agents/skills/business-analyst/`; đọc trực tiếp để áp dụng trong phiên này. SHA256 của SKILL.md: `e225df554a33bd31aed7b6c6103c905ebac3ea8c1e75935a09e875af5bb2395d`.
- Các reference tải từ cùng repository: `docs/project-reference/spec-principles.md`, `.agents/skills/shared/tc-format.md`, `.agents/skills/shared/sdd-artifact-contract.md`; lưu bản đọc tại thư mục `references` của skill BA. Chúng hướng dẫn phương pháp/định dạng, không phải nghiệp vụ của công ty.
- UI/UX Pro Max: [hướng dẫn chính thức](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill#installation), cập nhật bằng `ui-ux-pro-max-cli@latest`, CLI báo **2.15.0**. CLI mới tạo đường dẫn `.agents` toàn cục; đã so khớp hash, hợp nhất vào bản Codex hiện có tại `C:/Users/khang/.codex/skills/ui-ux-pro-max/` và loại riêng bản trùng vừa tạo. Bản cũ được sao lưu trong thư mục TEMP ngoài vùng skill. SHA256 SKILL.md mới: `8b827fe03b349aeea99a7d6cf4ccd892e6065b672859fdb11e13a1919453eddc`.
- Python 3.13.2 và Node 22.20.0 đã có; không cài thêm phần mềm hệ thống. Dependency frontend được cài đúng lockfile để chạy audit; công cụ trình duyệt nằm trong thư mục audit tạm.

## Kiểm chứng trong trình duyệt

Phương pháp, viewport, lỗi đã tái hiện và giới hạn nằm tại [bằng chứng UI](ui-ux/evidence/README.md). Build frontend thành công vào thư mục audit tạm; có cảnh báo CSS và dung lượng bundle. Không chạy backend vì khởi động có migration/schema sync/seeding tự động.

## Bàn giao và kiểm tra cuối

- [Phân tích nghiệp vụ](modules/attendance/01-business-analysis.md): đủ 13 mục, 22 quy tắc AS-IS và 24 findings; taxonomy đúng yêu cầu. [Inventory BA](modules/attendance/review-evidence.md) ghi phạm vi source, reference và probe tái hiện.
- [Đánh giá UI/UX](ui-ux/01-ui-ux-pro-max-audit.md): đủ 18 mục, 34 vấn đề, TOP 10 và MOBILE-FIRST; [inventory UI](ui-ux/review-evidence.md) phân biệt phần đọc sâu với khảo sát mở rộng. Findings giữa hai báo cáo có giao nhau, không cộng thành tổng lỗi độc lập.
- Bộ giao diện có 55 ảnh và ba file JSON quan sát; bộ chính gồm 12 route ở 8 viewport. Đã sửa nhận định sơ bộ bằng phép đo lại modal, phân biệt cuộn bảng với tràn document, và đối chiếu lỗi lịch bằng probe.
- Đã kiểm tra liên kết Markdown nội bộ tồn tại, không còn placeholder, đủ cấu trúc mục và nhãn finding. Citation dùng số dòng LF/`rg`, không dùng số dòng bị nhân đôi do CRCRLF.
- `git diff --stat` trống sau review: không thay đổi source được theo dõi; chỉ thêm skill workspace và tài liệu/artifact trong `.agents/`, `docs/`. Không commit/refactor/triển khai recommendation. Vite phục vụ audit đã dừng.
- Các câu hỏi còn mở ở mục 13 báo cáo BA; lịch làm, phạm vi HR/Admin/Manager và hệ thống/database riêng đã được chốt theo câu trả lời người dùng, không hỏi lại.
