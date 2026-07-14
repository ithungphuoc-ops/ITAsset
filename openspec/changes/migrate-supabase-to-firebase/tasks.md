## 1. Firebase Project Setup

- [x] 1.1 Sếp tạo Firebase project riêng cho ITAsset (`hpcons-itasset`) — Authentication > Email/Password, Firestore Database, Firebase Storage đã bật
- [x] 1.2 Sếp lấy Web app config + Service Account key — đã nhận đầy đủ, đã điền `.env.local`
- [x] 1.3 Thêm `src/lib/firebase/client.ts` (lazy init, Firebase Auth) và `src/lib/firebase/admin.ts` (lazy init, Admin SDK + Storage) theo đúng pattern asset-tracker
- [x] 1.4 Thêm `.env.local.example` với các biến `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_ADMIN_*`; đã điền phần client vào `.env.local`, còn thiếu phần Admin SDK

## 2. Data Model & Firestore Infrastructure

- [x] 2.1 Định nghĩa types Firestore cho `Device` (bao gồm `laptopSpecs`/`monitorSpecs` nhúng), `Employee`, `Department`, `Assignment`, `Profile` (`role: 'admin'|'it_staff'|'viewer'`) — đổi field name sang camelCase theo convention Firestore/JS (asset_code → assetCode, v.v.) — `src/lib/firestore/types.ts`
- [x] 2.2 Sếp không phản đối ranh giới quyền 3 role đề xuất, tiếp tục triển khai theo design.md (có thể chỉnh lại sau nếu cần)
- [x] 2.3 Viết `firestore.rules` (file `firestore.rules`) — admin/it_staff ghi được devices/assignments/employees/departments, viewer chỉ đọc; `profiles/{uid}` chỉ chính chủ/admin đọc, chỉ admin ghi
- [x] 2.4 Viết `firestore.indexes.json` (devices theo category/status + createdAt, assignments theo deviceId/employeeId + createdAt) — sẽ bổ sung thêm nếu gặp lỗi thiếu index lúc test
- [x] 2.5 Deploy rules lên Firebase project — Sếp đã publish qua Console (Firestore Rules + Storage Rules); indexes chưa deploy (không có CLI quyền, sẽ tạo qua link lỗi khi cần, giống asset-tracker)
- [x] 2.6 Cấu hình Firebase Storage rules (file `storage.rules`) — Sếp đã publish qua Console

## 3. Auth Migration

- [x] 3.1 Trang `/login`: đổi sang Firebase Auth `signInWithEmailAndPassword` + gọi `/api/auth/session` để tạo cookie
- [x] 3.2 Tạo API route session (`src/app/api/auth/session/route.ts`) — POST tạo session cookie qua Admin SDK, DELETE xoá cookie
- [x] 3.3 Đổi `src/proxy.ts`: đọc session cookie + `profiles/{uid}.role` từ Firestore qua Admin SDK — chặn `/dashboard/*` nếu không có role admin/it_staff/viewer (cải thiện thật so với code cũ — bản cũ chỉ check đã login, không check role)
- [x] 3.4 Đổi `useRole.ts` hook: gọi `/api/auth/me` (đọc session server-side) thay vì Supabase client-side; thêm `canWrite`/`isItStaff`/`isViewer`
- [x] 3.5 Đổi `/api/admin/users/*`: Firebase Admin Auth (`listUsers`/`createUser`/`updateUser`/`deleteUser`) + tạo/xoá document `profiles/{uid}` theo role; route chỉ `admin` gọi được (`requireAdmin()`)
- [x] 3.6 Đổi `/api/auth/logout`: xoá session cookie Firebase
- [x] 3.7 Xoá `/api/auth/login` (code chết)
- [x] 3.8 Viết helper phân quyền trong `src/lib/session.ts` (`hasDashboardAccess`, `canWrite`, `isAdmin`, `requireWriteAccess`, `requireAdmin`) — dùng chung cho proxy + API routes
- [x] 3.9 Đổi toàn bộ `isAdmin &&` (nút sửa/xoá/cấp phát/thu hồi/import) trong 4 trang dashboard sang `canWrite &&` (admin+it_staff); giữ `isAdmin`-only riêng cho mục "Cài đặt" (quản lý user) trong `dashboard/layout.tsx`

## 4. Data Access Layer

- [x] 4.0 Xác nhận: `src/lib/repository/{deviceRepository,assignmentRepository}.ts` không được import ở đâu trong codebase — xoá thẳng, không cần chuyển đổi
- [x] 4.1 Viết `src/lib/firestore/devices.ts` (server-only): CRUD device + specs nhúng, `toDeviceJson()` chuyển camelCase→snake_case
- [x] 4.2 Viết `src/lib/firestore/assignments.ts` (server-only): assign/return/transfer + Firestore transaction đóng assignment active cũ, tính `quantity_in_use`/`quantity_in_stock` (trong route `/api/devices`)
- [x] 4.3 Viết `src/lib/firestore/employees.ts`, `src/lib/firestore/departments.ts` (server-only)
- [x] 4.4 Viết hàm tìm kiếm device (thay `ilike` Postgres) bằng cách lấy toàn bộ `devices` rồi filter trong bộ nhớ theo `assetCode`/`serialNumber`/`brand`/`model` (đã áp dụng tương tự cho employees search)

## 5. API Routes

- [x] 5.1 `/api/devices`, `/api/devices/create`, `/api/devices/[id]`, `/api/devices/export`: đổi sang Firestore, giữ nguyên request/response JSON (snake_case); `/api/devices/[id]` GET bổ sung trả `assignments` (lịch sử đầy đủ, trang chi tiết cần)
- [x] 5.2 `/api/employees`, `/api/employees/[id]`: đổi sang Firestore, giữ nguyên response shape
- [x] 5.3 `/api/departments`: đổi sang Firestore
- [x] 5.4 `/api/assignments`: đổi sang Firestore transaction
- [x] 5.5 `/api/my-devices`: đổi sang Firestore; **bổ sung kiểm tra quyền** (chỉ xem được thiết bị của chính mình trừ khi có quyền dashboard) — bản cũ không kiểm tra gì, ai biết email cũng xem được thiết bị người khác
- [x] 5.6 `/api/stats`: đổi tính toán dashboard stats sang đọc từ Firestore
- [x] 5.7 `/api/qr`: không cần đổi (không dùng Supabase)
- [x] 5.8 `/api/save-devices`: đổi phần lưu hàng loạt (AI import) sang Firestore
- [x] 5.9 Thêm mới `/api/devices/import-excel` (đổi từ code insert Supabase trực tiếp trong `dashboard/devices/import/page.tsx`), `/api/auth/change-password`, `/api/auth/me` — 3 route không có trong kế hoạch ban đầu nhưng cần thiết (phát hiện thêm 4 chỗ Client Component gọi thẳng Supabase mà audit sơ bộ ban đầu bỏ sót)
- [x] 5.10 Bổ sung `requireSession()`/`requireWriteAccess()`/`requireAdmin()` cho toàn bộ route — **cải thiện bảo mật thật**: hầu hết route gốc (`/api/devices/create`, `/api/employees` POST, `/api/my-devices`, v.v.) không hề kiểm tra đăng nhập/quyền, chỉ dựa vào service-role key phía server và việc không công khai URL

## 6. Pages & Components

- [x] 6.1 ~~Chuyển page thành Server Component/Server Action~~ **Không cần** cho phần lớn trang — nhưng rà kỹ hơn phát hiện **4 trang vẫn gọi thẳng Supabase client-side** ngoài dự kiến ban đầu, đã sửa hết:
  - `dashboard/departments/new/page.tsx`: đổi insert trực tiếp → `fetch('/api/departments')`
  - `dashboard/settings/page.tsx`: đổi mật khẩu (`supabase.auth.updateUser`) → `fetch('/api/auth/change-password')` (route mới); dropdown/badge role cập nhật đủ 3 role (admin/it_staff/viewer) thay vì chỉ 2
  - `dashboard/devices/[id]/page.tsx`: đọc device+lịch sử trực tiếp → `fetch('/api/devices/[id]')`
  - `dashboard/devices/import/page.tsx`: import Excel hàng loạt insert trực tiếp → `fetch('/api/devices/import-excel')` (route mới)
  - `app/device/[qr]/page.tsx`, `app/employee/[code]/page.tsx` (Server Component, trang public không cần đăng nhập): đổi từ gọi Supabase trực tiếp sang gọi thẳng hàm Firestore server-only (không qua API route vì đã là server-side)
  - `app/my-devices/page.tsx`: đổi `supabase.auth.getUser/signOut` → `fetch('/api/auth/me')`/`fetch('/api/auth/logout')`
- [x] 6.2 Kiểm tra "policy" trong `src/app/dashboard/devices/page.tsx` — **đã xác nhận không có**, không có logic RLS/permission nào bị bỏ sót ở đây
- [x] 6.3 Xoá `src/lib/supabase/{client,server}.ts` và gỡ `@supabase/supabase-js`, `@supabase/ssr` khỏi `package.json` — build + type-check + lint đều sạch sau khi gỡ

## 7. Data Migration (dữ liệu thật)

- [x] 7.1 Không cần Sếp export thủ công — em tự kiểm tra schema thật qua script đọc mẫu từng bảng bằng service-role key (`select * limit 2`), phát hiện `device_laptop_specs` có thêm 2 cột `main_board`/`power_supply` không có trong type/UI hiện tại → đã bổ sung vào `LaptopSpecs` type + `toDeviceJson()` để không mất dữ liệu (UI form vẫn chưa có ô nhập 2 field này — cần Sếp xác nhận có cần thêm không)
- [x] 7.2 Viết `scripts/migrate-from-supabase.ts`: đọc `departments`/`employees`/`devices`+specs/`assignments` qua Supabase service-role, ghi Firestore bằng batch write, **giữ nguyên UUID gốc làm Firestore doc ID** (không cần bảng map id cũ↔mới vì mọi foreign key — `department_id`, `device_id`, `employee_id` — vẫn đúng). Có cờ `--dry-run`. Đã chạy thật 2026-07-08: `departments 41, employees 120, devices 133 (laptop_specs 40, monitor_specs 57), assignments 88` — đối chiếu số lượng Firestore sau migrate khớp 100%.
- [x] 7.3 ~~Migrate ảnh device cũ~~ **Bỏ qua** (Sếp xác nhận 2026-07-07: chưa có ảnh thật nào, `image_url` mới chỉ dùng lúc demo/test) — chỉ cần bật Firebase Storage sẵn để tính năng upload ảnh tiếp tục hoạt động cho lần dùng thật đầu tiên, không cần script di chuyển dữ liệu ảnh
- [x] 7.4 **Phát hiện quan trọng lúc migrate**: Firebase Auth + `profiles` collection đang trống hoàn toàn (0 user) — nếu cắt chuyển ngay sẽ không ai đăng nhập được, kể cả Sếp. Kiểm tra Supabase Auth: có 3 tài khoản thật (`nguyenhuuphuoc@hpcons.com.vn` admin, `ithungphuoc@hpcons.com.vn` admin — tài khoản Sếp, `tanhaunt10@gmail.com` role gốc `employee` — không khớp 3 role mới nên hạ về `viewer`, cần Sếp xác nhận lại quyền đúng). Không lấy được password hash gốc qua Supabase Admin API (REST/JS SDK không trả `encrypted_password`, cần quyền kết nối Postgres trực tiếp mà ta không có) → đã tạo cả 3 tài khoản Firebase Auth + document `profiles/{uid}` tương ứng với **mật khẩu tạm ngẫu nhiên**, đã gửi riêng cho Sếp qua chat, yêu cầu đổi ngay ở trang Cài đặt sau khi đăng nhập lần đầu.
- [x] 7.5 Chạy migration trực tiếp trên project `hpcons-itasset` (không có project staging riêng, Firestore đang trống nên an toàn) — đối chiếu số lượng bản ghi khớp, spot-check vài document (`toDeviceJson`, employee, assignment liên kết đúng deviceId/employeeId)

## 8. Cutover & Cleanup

- [ ] 8.1 Chọn khung giờ bảo trì cùng Sếp, thông báo trước cho người dùng nếu cần
- [ ] 8.2 Đóng ghi dữ liệu trên Supabase, chạy lại script migrate lần cuối để bắt thay đổi phát sinh
- [ ] 8.3 Deploy bản code mới trỏ vào Firebase, xác nhận `.env` production đã đúng
- [x] 8.4 ~~Gỡ `@supabase/supabase-js`, `@supabase/ssr` khỏi `package.json`~~ **Đã làm ở mục 6.3** (sớm hơn dự kiến, vì code không còn phụ thuộc Supabase ngay cả trước khi có dữ liệu thật)
- [ ] 8.5 Giữ Supabase project ở trạng thái chỉ đọc (không xoá) tối thiểu 2-4 tuần trước khi cân nhắc tắt hẳn

## 9. Verification

- [ ] 9.1 Đăng nhập bằng tài khoản cũ (đã migrate) — admin, it_staff, viewer, và employee (`/my-devices`)
- [ ] 9.2 Luồng chính: tạo device → cấp phát cho employee → xem lịch sử → thu hồi → employee xem đúng "Tài sản của tôi"
- [ ] 9.3 Quét/tra cứu QR thiết bị (`/device/[qr]`)
- [ ] 9.4 Thử upload ảnh device mới (tính năng chưa từng dùng thật) — xác nhận lưu và hiển thị đúng qua Firebase Storage
- [ ] 9.5 Import PDF báo giá bằng AI, import/export Excel, in QR — xác nhận không bị ảnh hưởng bởi việc đổi backend
- [ ] 9.6 Gửi email thông báo cấp phát vẫn hoạt động
- [ ] 9.7 Phân quyền: employee không truy cập `/dashboard/*`; viewer không tạo/sửa/xoá/cấp phát/thu hồi được; it_staff không vào được trang quản lý user
- [ ] 9.8 So sánh số liệu dashboard/stats trước và sau migrate để phát hiện lệch dữ liệu
