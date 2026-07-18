# Prompt Playbook — Admin Web

Mỗi milestone dưới đây là 1 prompt dùng trực tiếp với Claude Code, chạy tuần tự từ FE-M0. Trước khi chạy bất kỳ prompt nào, đảm bảo Claude đã đọc `CLAUDE.md` và `docs/design-system.md` trong repo (Claude Code tự đọc `CLAUDE.md`, nhưng nên nhắc đọc `docs/design-system.md` trong prompt vì đó không phải file mặc định nó tự soi).

---

## FE-M0 — Auth & App Shell

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

Dựng scaffold Next.js App Router (đã có sẵn create-next-app, chỉ cần thêm):
1. Setup Tailwind + shadcn/ui, khai báo design token màu ở mục 2 của docs/design-system.md làm CSS variables trong globals.css và tailwind.config.
2. Layout 2 route group: (auth) không sidebar, (dashboard) có sidebar trái (nav: Vườn, Cây trồng, Công việc, Kho vật tư, Thu hoạch, Báo cáo) + topbar (search, notification bell, avatar) — chưa cần data thật, chỉ cần shell.
3. Trang /login gọi POST {NEXT_PUBLIC_API_URL}/api/auth/login qua lib/api-client.ts (dùng ky), lưu access+refresh token (httpOnly cookie nếu route handler, hoặc lib riêng nếu client-side — chọn cách nào đơn giản để chạy được trước, có thể tinh chỉnh bảo mật sau).
4. Route guard: chưa đăng nhập → redirect /login; đã đăng nhập mà vào /login → redirect /dashboard.
5. lib/api-client.ts: instance ky duy nhất, tự gắn Authorization header, tự refresh token khi 401 (gọi /api/auth/refresh 1 lần rồi retry).

Definition of done: pnpm lint sạch, pnpm build qua, login/logout chạy được thật với backend đang chạy ở localhost:8000.
```

---

## FE-M1 — Gardens & Zones

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

Trong route group (dashboard):
1. Trang /gardens: danh sách vườn dạng card hoặc bảng (tên, diện tích, số cây), nút "Tạo vườn mới".
2. Form tạo vườn: tên, địa chỉ, loại cây, diện tích (có thể để trống nếu chưa vẽ boundary).
3. Trang /gardens/[id]: tích hợp bản đồ (Mapbox GL hoặc Leaflet — chọn 1, ghi rõ lý do trong commit) để vẽ polygon boundary, gọi PUT /api/gardens/:id/boundary khi lưu. Hiển thị area_m2 backend trả về sau khi lưu (không tự tính ở FE).
4. Danh sách zone trong vườn + form tạo zone (tên, grid_position), gán nhân viên vào zone (zone_assignments) qua dropdown chọn user.
5. Dùng TanStack Query cho toàn bộ data fetching, khai báo query key tập trung ở lib/query-keys.ts.

Definition of done: vẽ được polygon thật, lưu thành công, load lại trang vẫn hiển thị đúng polygon đã lưu. pnpm lint + build sạch.
```

---

## FE-M2 — Plants & Tags (Signature screen)

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm — đặc biệt mục màu trạng thái cây và "signature element".

1. components/garden-map/: mở rộng bản đồ vườn từ FE-M1 thành sơ đồ dạng lưới ô — mỗi zone chia thành các ô nhỏ tương ứng plant.grid_x/grid_y, mỗi ô tô màu theo plants.status (dùng components/plant-status-badge làm nguồn màu duy nhất). Click vào ô mở popup thông tin cây (code, status, ngày trồng).
2. Trang /plants (hoặc /gardens/[id]/plants): bảng danh sách cây, filter theo zone/status, cột badge màu trạng thái.
3. Trang chi tiết cây /plants/[id]: thông tin cơ bản + placeholder cho timeline (sẽ làm đầy FE-M3).
4. Chức năng in mã: chọn nhiều cây → sinh QR (qrcode) hoặc Barcode (jsbarcode) → xuất PDF hàng loạt (react-pdf), mỗi mã kèm plants.code người đọc được.
5. Quy trình thay tag (nếu tag hỏng): form thay tag mới, gọi đúng endpoint replace tag của backend, hiển thị lịch sử tag cũ (replaced_by).

Definition of done: sơ đồ lưới render đúng màu theo status thật từ API, in được ít nhất 1 file PDF chứa QR hợp lệ (test quét thử bằng điện thoại). pnpm lint + build sạch.
```

---

## FE-M3 — Plant Logs & Timeline

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

1. Hoàn thiện trang chi tiết cây: timeline báo cáo (plant_logs) dạng danh sách theo thời gian, mỗi item có ảnh (từ MinIO, backend trả URL) + ghi chú + status tại thời điểm đó.
2. Chức năng so sánh ảnh: chọn 2 mốc thời gian, hiển thị 2 ảnh cạnh nhau (before/after).
3. Xử lý trạng thái rỗng: cây chưa có log nào → hiển thị hướng dẫn rõ ràng thay vì trang trắng.

Definition of done: timeline hiển thị đúng dữ liệu thật từ GET /api/plants/:id/logs và /timeline, ảnh load được từ MinIO. pnpm lint + build sạch.
```

---

## FE-M4 — Tasks & Schedules

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

1. Trang /tasks: danh sách hoặc kanban theo task_status (PENDING/IN_PROGRESS/DONE/CANCELLED), filter theo assignee/type.
2. Form tạo task: loại việc (task_type), mô tả, người phụ trách, deadline.
3. Form tạo lịch lặp lại (schedules): UI chọn tần suất dễ hiểu (ví dụ dropdown "Hàng ngày/Hàng tuần/Hàng tháng" + chọn ngày trong tuần) rồi convert sang cron_expr gửi backend — KHÔNG bắt người dùng tự gõ cron string.
4. Trung tâm thông báo: dropdown chuông ở topbar, đánh dấu đã đọc, polling hoặc gọi lại khi mở dropdown (chưa cần realtime WS/SSE — nằm ở backlog Phase 4).

Definition of done: tạo task/schedule thành công qua form, danh sách cập nhật đúng trạng thái. pnpm lint + build sạch.
```

---

## FE-M5 — Dashboard

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

1. Trang /dashboard: thẻ KPI (tổng số cây theo từng plant_status, dùng đúng màu chuẩn), biểu đồ xu hướng theo thời gian (Recharts).
2. Thẻ tóm tắt AI: gọi POST /api/ai/summarize (nếu backend đã có ở M5), hiển thị đoạn text ngắn AI tổng hợp tình hình vườn; xử lý trạng thái đang tải AI riêng (có thể chậm hơn API thường) và trạng thái lỗi/không khả dụng rõ ràng.

Definition of done: dashboard load đúng số liệu thật, biểu đồ responsive ở tablet. pnpm lint + build sạch.
```

---

## FE-M6 — Inventory, Harvests & Public Trace

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

1. Trang /inventory: bảng vật tư (inventory_items) + lịch sử nhập/xuất (inventory_transactions), cảnh báo khi quantity < min_quantity hoặc gần expiry_date.
2. Trang /harvests: bảng thu hoạch theo mùa/cây, biểu đồ năng suất.
3. Trang public /trace/[code] (KHÔNG nằm trong route group (dashboard), không cần đăng nhập): gọi GET /api/trace/:code, thiết kế khác hẳn — hướng người tiêu dùng cuối, có thể dùng tông màu ấm/thân thiện hơn thay vì giao diện "công cụ vận hành" của phần admin.

Definition of done: cảnh báo tồn kho hiển thị đúng điều kiện, trang public hoạt động độc lập không cần token. pnpm lint + build sạch.
```

---

## FE-M7 — AI Diagnosis (view only)

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

Trên trang chi tiết cây (/plants/[id]): thêm section hiển thị kết quả ai_diagnoses gắn với từng plant_log — tên bệnh, % confidence (hiển thị rõ đây là gợi ý AI, không phải chẩn đoán chắc chắn), gợi ý xử lý (suggestion).

Definition of done: hiển thị đúng dữ liệu thật khi backend đã có ai_diagnoses, có fallback rõ ràng khi log chưa được AI chẩn đoán. pnpm lint + build sạch.
```
