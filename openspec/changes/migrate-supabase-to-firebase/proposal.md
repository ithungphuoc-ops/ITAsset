## Why

Workspace đang có 2 backend khác nhau (Supabase cho ITAsset/hpcons-portal, Firebase cho asset-tracker vừa build). Sếp quyết định đồng nhất hạ tầng: chuyển ITAsset từ Supabase (Postgres + Supabase Auth) sang Firebase (Firestore + Firebase Auth), theo đúng kiến trúc đã dùng ở asset-tracker (Server Components/Server Actions dùng Firebase Admin SDK, Firestore Security Rules làm lớp phòng vệ thứ hai). ITAsset là ứng dụng đang chạy — mục tiêu là giữ nguyên 100% tính năng và hành vi hiện có cho người dùng, chỉ đổi phần backend + di chuyển dữ liệu thật.

## What Changes

- Thay `@supabase/supabase-js` + `@supabase/ssr` bằng Firebase Admin SDK (server) cho mọi đọc/ghi dữ liệu — bỏ hẳn cách gọi Supabase trực tiếp từ client (`deviceRepository.ts`, `assignmentRepository.ts` hiện đang gọi `createClient()` phía browser).
- Thay Supabase Auth (email/password) bằng Firebase Auth (vẫn email/password, giữ nguyên trải nghiệm đăng nhập — không đổi sang Google SSO như asset-tracker vì ITAsset không giới hạn theo domain công ty ở mức tương tự).
- Chuyển schema quan hệ Postgres (`devices`, `device_laptop_specs`, `device_monitor_specs`, `assignments`, `employees`, `departments`) sang các collection Firestore tương ứng.
- Viết script migrate dữ liệu thật (một lần) từ Supabase sang Firestore, kèm bước xác minh số lượng bản ghi khớp trước/sau.
- Xoá route `/api/auth/login` (cookie `itasset_logged_in`) — code chết, không được middleware hay UI nào sử dụng (đăng nhập thật đi qua Supabase Auth → sẽ đi qua Firebase Auth).
- Các phần không liên quan tới Supabase (AI trích xuất PDF bằng Anthropic, gửi email qua Gmail/nodemailer, import/export Excel) giữ nguyên, không đổi.
- **BREAKING**: toàn bộ API routes hiện dùng Supabase client (`/api/devices/*`, `/api/employees/*`, `/api/assignments`, `/api/admin/users/*`, `/api/my-devices`, `/api/departments`, `/api/stats`, `/api/qr`) đổi sang gọi Firebase Admin SDK — request/response shape (JSON trả về) giữ nguyên để không phải sửa phía frontend, nhưng nội bộ implementation đổi hoàn toàn.

## Capabilities

### New Capabilities
- `firebase-data-layer`: Yêu cầu về việc lưu trữ dữ liệu (Firestore), xác thực (Firebase Auth), Security Rules, và tính đúng đắn của việc di chuyển dữ liệu từ Supabase sang Firestore.

### Modified Capabilities
- (không có — đây là thay đổi tầng backend/implementation, không đổi behavior/requirement của các tính năng hiện có. ITAsset chưa có spec nào trong `openspec/specs/` để liệt kê ở đây.)

## Impact

- Toàn bộ `src/lib/supabase/*`, `src/lib/repository/*`, `src/proxy.ts`, `src/lib/hooks/useRole.ts`, và ~28 file gọi Supabase client bị ảnh hưởng.
- Cần 1 Firebase project riêng cho ITAsset (project Firebase riêng, không dùng chung với asset-tracker hay hpcons-portal).
- Cần Sếp cung cấp Firebase config + service account (như đã làm với asset-tracker) trước khi implement phần kết nối thật.
- Dữ liệu production thật trong Supabase (devices, employees, departments, assignments, user accounts) cần được export và di chuyển — có downtime ngắn tại thời điểm cắt chuyển để tránh lệch dữ liệu giữa 2 hệ thống.
