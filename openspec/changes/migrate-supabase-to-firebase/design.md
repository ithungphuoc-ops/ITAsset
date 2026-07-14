## Context

ITAsset hiện là Next.js 16 app, dữ liệu 100% qua Supabase:
- **Data access**: `src/lib/repository/{deviceRepository,assignmentRepository}.ts` gọi Supabase client-side nhưng **không được import ở bất kỳ đâu trong codebase** — code chết, có thể xoá. Toàn bộ trang trong `dashboard/**` là Client Component gọi thẳng `fetch('/api/...')`; các Route Handler (`/api/devices`, `/api/employees`, `/api/assignments`, `/api/my-devices`, `/api/admin/users/*`, `/api/departments`, `/api/stats`, `/api/qr`, `/api/devices/export`, `/api/save-devices`) tự gọi Supabase trực tiếp bằng `createClient` với service-role key, không qua tầng repository nào. Kiến trúc này đã đúng nguyên tắc "mọi truy cập DB nằm phía server" — chỉ cần đổi bên trong route, **không cần refactor page thành Server Component/Server Action**.
- **Auth**: Supabase Auth email/password (`signInWithPassword`). Role lưu trong `user_metadata.role`, đọc ở `proxy.ts` (middleware) và `useRole.ts` (client hook) — thực tế chỉ dùng 2 giá trị `admin`/`employee`, dù type `UserRole` khai báo 3 giá trị (`admin`/`it_staff`/`viewer`) chưa từng được set/dùng ở đâu trong code.
- **RLS**: không tìm thấy policy nào trong repo — không có bằng chứng RLS được cấu hình. Route `/api/my-devices` và `/api/admin/users` dùng service-role key, tự kiểm soát bằng logic trong route, không dựa vào RLS.
- **Code chết**: `/api/auth/login` (cookie `itasset_logged_in`, mật khẩu cứng trong env) không được middleware hay UI nào gọi tới — an toàn để xoá.
- **Không liên quan Supabase** (giữ nguyên): AI trích PDF báo giá (Anthropic SDK), OCR fallback (tesseract.js), gửi email (nodemailer/Gmail), import/export Excel (xlsx), QR encode/decode (qrcode, @zxing/library).
- Repo **không có** file migration/schema SQL đầy đủ cho bảng `devices`, `employees`, `departments`, `assignments`, và bảng `auth.users` (Supabase Auth) — schema các bảng này chỉ tồn tại trên Supabase Dashboard, cần Sếp export trước khi viết script migrate dữ liệu thật.

## Goals / Non-Goals

**Goals:**
- Giữ nguyên 100% hành vi/tính năng hiện có cho người dùng cuối (không đổi UI, không đổi luồng nghiệp vụ), **trừ** việc triển khai đúng mô hình 3 role đã quyết định (xem Decisions).
- Chuyển toàn bộ đọc/ghi dữ liệu sang Firebase Admin SDK bên trong các Route Handler hiện có — khớp nguyên tắc "chỉ server chạm DB" của asset-tracker, loại bỏ hoàn toàn việc gọi Supabase/Firestore trực tiếp từ browser. Vì các trang đã gọi qua `fetch('/api/...')` (không import repository trực tiếp), **không cần** refactor UI thành Server Component/Server Action.
- Di chuyển dữ liệu thật (devices, employees, departments, assignments, user accounts) từ Supabase sang Firestore không mất dữ liệu, có bước xác minh. (Không có ảnh thiết bị thật cần di chuyển — xem Decisions.)
- Thiết lập Firestore Security Rules làm lớp phòng vệ thứ hai (cải thiện so với hiện tại — vốn không có RLS nào).
- Triển khai đúng 3 role (`admin`/`it_staff`/`viewer`) với phân quyền rõ ràng (Sếp đã xác nhận muốn làm đầy đủ, không chỉ giữ 2 role như hiện tại).

**Non-Goals:**
- Không đổi sang Google Workspace SSO như asset-tracker — ITAsset giữ nguyên đăng nhập email/password qua Firebase Auth.
- Không thiết kế lại UI/UX (trừ các chỗ cần thêm để phân quyền theo 3 role, ví dụ ẩn nút hành động với role không đủ quyền).
- Không đổi các phần AI/email/import-export Excel — các phần này không đụng tới Supabase, giữ nguyên.

## Decisions

- **Data model Firestore**:
  - `devices`: giữ các field hiện có (`assetCode`, `category`, `brand`, `model`, `serialNumber`, `status`, `purchaseDate`, `purchasePrice`, `warrantyExpiry`, `notes`, `imageUrl`, `qrCode`, `quantity`), **nhúng** `laptopSpecs`/`monitorSpecs` làm object con trong document `devices` (thay vì 2 collection riêng `device_laptop_specs`/`device_monitor_specs`) — vì specs luôn được đọc cùng device, không có truy vấn độc lập trên specs; nhúng giúp giảm số lần đọc và khớp best-practice Firestore cho quan hệ 1-1 luôn-đọc-cùng-nhau.
  - `employees`, `departments`: giữ collection riêng, tương tự Postgres, `employees.departmentId` tham chiếu `departments`.
  - `assignments`: collection top-level như asset-tracker, giữ field `quantity`, `assignedBy`/`returnedBy` (người thực hiện thao tác, khác với asset-tracker vốn không có 2 field này).
  - `profiles`: collection mới (map từ Firebase Auth `uid`) lưu `{ fullName, role, createdAt }` — tách biệt với `employees` vì người đăng nhập (admin/IT staff) không nhất thiết là nhân viên được cấp thiết bị (type `Profile` đã có sẵn trong code, chưa từng dùng thật — migration này là lúc dùng nó đúng mục đích).
- **Auth**: Firebase Auth email/password, giữ đúng trải nghiệm đăng nhập hiện tại. Role đọc từ Firestore `profiles/{uid}.role` ở middleware (Node.js runtime, theo pattern `proxy.ts` của asset-tracker) — không dùng `user_metadata` vì Firebase Auth custom claims cần refresh token mới thấy thay đổi, đọc trực tiếp từ Firestore đơn giản và nhất quán hơn.
- **Role model — triển khai đúng 3 role** (Sếp xác nhận 2026-07-07): vì code hiện tại chưa từng thực sự dùng `it_staff`/`viewer`, ranh giới quyền hạn giữa 3 role là suy luận hợp lý của em, cần Sếp duyệt lại/chỉnh nếu không đúng ý:
  - `admin`: toàn quyền — CRUD devices/employees/departments, cấp phát/thu hồi, **và** quản lý tài khoản người dùng khác (trang `/dashboard/settings` quản lý user/role hiện chỉ admin mới vào được).
  - `it_staff`: CRUD devices/employees/departments, cấp phát/thu hồi, import/export, quét QR — **không** vào được trang quản lý tài khoản người dùng (không tạo/xoá/đổi role user khác).
  - `viewer`: chỉ xem — danh sách/chi tiết thiết bị, lịch sử cấp phát, dashboard/stats — không có nút tạo/sửa/xoá/cấp phát/thu hồi nào hiển thị hoặc hoạt động.
  - Nhân viên thường (người được cấp thiết bị nhưng không đăng nhập quản trị) tiếp tục dùng route `/my-devices` như hiện tại — không đổi, không phải 1 trong 3 role trên (role trên `profiles` chỉ áp dụng cho người có đăng nhập dashboard).
- **Xoá code chết**: bỏ `/api/auth/login`, cookie `itasset_logged_in`, và `src/lib/repository/{deviceRepository,assignmentRepository}.ts` (không dùng ở đâu).
- **Tầng data-access**: viết mới `src/lib/firestore/{devices,employees,departments,assignments}.ts` (server-only, `import "server-only"`, dùng Firebase Admin SDK), thay thế logic Supabase hiện đang nằm trực tiếp trong từng Route Handler. Route Handler gọi các hàm này, **giữ nguyên request/response JSON shape** (field snake_case như cũ) để không phải sửa mọi nơi gọi API cùng lúc — client component không đổi gì.
- **Tìm kiếm thiết bị**: Postgres `ilike` (substring, không phân biệt hoa thường) trên `asset_code`/`serial_number`/`brand`/`model` không có tương đương trực tiếp trong Firestore. Quyết định: lấy toàn bộ `devices` về rồi filter trong bộ nhớ (JavaScript `includes()`), chấp nhận được ở quy mô hiện tại (kho thiết bị nội bộ, không phải hàng chục nghìn bản ghi). Nếu sau này dữ liệu lớn hơn nhiều, cần đánh giá lại (Algolia/Typesense) — ngoài phạm vi change này.
- **QR code**: giữ nguyên logic sinh `qrCode = ITASSET-{assetCode}-{timestamp}`, chỉ đổi nơi lưu.
- **Firestore Security Rules**: viết mới (asset-tracker làm tương tự) — admin/it_staff ghi được devices/employees/departments/assignments, viewer chỉ đọc, employee (không đăng nhập dashboard) chỉ đọc được assignment/device của chính mình qua `/my-devices`. Đây là cải thiện an ninh so với hiện trạng (không có RLS nào).
- **Storage cho ảnh thiết bị**: Sếp xác nhận (2026-07-07) hiện **chưa có ảnh thật nào** trong Supabase Storage — `image_url` mới chỉ được dùng lúc demo/test. Vẫn bật Firebase Storage để tính năng upload ảnh tiếp tục hoạt động cho việc dùng thật sau này, nhưng **không cần bước di chuyển dữ liệu ảnh** (không có gì để chuyển).

## Risks / Trade-offs

- [Risk] Downtime/lệch dữ liệu nếu vừa migrate vừa cho phép ghi dữ liệu ở cả 2 hệ thống → Mitigation: đóng băng ghi dữ liệu trên Supabase trong 1 khung giờ bảo trì ngắn, migrate dữ liệu, deploy bản Firebase, kiểm tra nhanh (smoke test), rồi mở lại.
- [Risk] Supabase không cho export password gốc, chỉ có hash. → Mitigation: kiểm tra thuật toán hash Supabase Auth dùng (thường là bcrypt) — Firebase Admin `importUsers` hỗ trợ import trực tiếp hash `BCRYPT`, nếu khớp thì giữ được password người dùng hiện tại mà không cần reset. Nếu không khớp/không lấy được hash (cần quyền truy cập DB trực tiếp, không qua JS client): fallback là gửi email yêu cầu đặt lại mật khẩu cho toàn bộ user khi cắt chuyển.
- [Risk] Composite index Firestore bị thiếu gây lỗi runtime khi truy vấn nhiều điều kiện (giống lỗi asset-tracker đã gặp) → Mitigation: định nghĩa trước `firestore.indexes.json` dựa trên toàn bộ truy vấn hiện có trong repository/route, deploy trước khi cắt chuyển.
- [Risk] Refactor ~28 file có thể gây hồi quy hành vi ở các luồng ít được test (import PDF, export Excel, print QR) → Mitigation: test tay từng luồng chính sau khi refactor (xem tasks.md phần Verification), vì các luồng này không đổi logic nghiệp vụ, chỉ đổi nguồn dữ liệu.
- [Risk] Ranh giới quyền `it_staff` vs `viewer` là suy luận của em, chưa được Sếp duyệt chi tiết từng chức năng → Mitigation: liệt kê rõ trong tasks.md để Sếp review lại 1 lần trước khi implement phần UI ẩn/hiện theo role.

## Migration Plan

1. Sếp tạo Firebase project riêng cho ITAsset (như đã làm với asset-tracker): bật Auth (Email/Password), tạo Firestore, lấy Web config + Service Account key, gỡ chặn org policy tạo key nếu cần.
2. Build toàn bộ code mới (Route Handler + Firestore) chạy song song, **chưa đấu vào dữ liệu production** — test bằng dữ liệu giả trên Firebase project vừa tạo.
3. Sếp export schema + dữ liệu thật từ Supabase Dashboard (bảng `devices`, `employees`, `departments`, `assignments`, và danh sách user trong Supabase Auth).
4. Viết script migrate dữ liệu một lần (đọc Supabase qua service-role key, ghi Firestore qua Admin SDK), chạy thử trên project Firebase staging, đối chiếu số lượng bản ghi trước/sau.
5. Xử lý migrate user Auth: thử `importUsers` với hash bcrypt; nếu không khả thi, chuẩn bị email thông báo đặt lại mật khẩu.
6. Deploy `firestore.indexes.json` + `firestore.rules` trước khi cắt chuyển thật.
7. Chọn khung giờ bảo trì ngắn (Sếp quyết định): đóng ghi dữ liệu trên Supabase → chạy migrate script lần cuối (bắt các thay đổi phát sinh từ bước 3) → deploy code mới trỏ vào Firebase → smoke test toàn bộ luồng chính → mở lại cho người dùng.
8. Giữ Supabase project + dữ liệu ở trạng thái chỉ đọc (không xoá) trong ít nhất 2-4 tuần để có thể rollback nếu phát sinh lỗi nghiêm trọng.
9. Rollback: nếu cần, trỏ deploy về bản code cũ (Supabase) — dữ liệu Supabase vẫn còn nguyên trong thời gian giữ lại ở bước 8.

## Open Questions

- ~~Vai trò 2 hay 3 role?~~ **Đã chốt (2026-07-07)**: triển khai đúng 3 role (`admin`/`it_staff`/`viewer`), ranh giới quyền đề xuất ở trên — cần Sếp duyệt lại khi review tasks.md.
- ~~`image_url` có dùng thật không?~~ **Đã chốt**: có, lưu ở Supabase Storage — cần migrate file thật, không chỉ URL.
- Có chấp nhận thử import password hash (bcrypt) hay cứ chọn phương án an toàn là reset password toàn bộ user ngay từ đầu?
- Khung giờ bảo trì để cắt chuyển — Sếp chọn thời điểm nào ít ảnh hưởng nhất?
