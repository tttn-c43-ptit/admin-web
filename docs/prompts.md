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

## FE-M0.5 — Public Register, Staff Management & Role-based Access

```
Đọc CLAUDE.md (đặc biệt mục "Phân quyền hiển thị theo role") và docs/design-system.md trước khi làm.

TRƯỚC KHI CODE: xác nhận qua Swagger (http://localhost:8000/docs) xem backend đã có endpoint cho OWNER tạo tài khoản STAFF chưa (dạng POST /api/staff hoặc tương tự, tự gán owner_id theo user đang đăng nhập). Nếu CHƯA có endpoint này, DỪNG LẠI, báo cho người dùng biết cần bổ sung backend trước, KHÔNG tự bịa ra endpoint giả hoặc mock data.

Nếu backend đã sẵn sàng, làm các việc sau:

1. Trang /register (route group (auth), không cần đăng nhập): form đăng ký CHỈ tạo tài khoản role OWNER — RegisterRequest không có field role (backend tự tạo OWNER theo mô tả "Create a garden-owner account"), nên form chỉ cần email/phone (1 trong 2), password (8-128 ký tự), full_name. Gọi POST /api/auth/register. Đăng ký xong tự động chuyển sang /login.

2. Trang /staff (route group (dashboard), CHỈ OWNER truy cập được): danh sách nhân viên hiện có (GET /api/staff) + form tạo mới (email hoặc phone, password, full_name — theo đúng StaffCreate schema), gọi POST /api/staff. Route này phải bị chặn hoàn toàn nếu role hiện tại là STAFF (redirect về /tasks).

3. Lấy role hiện tại qua GET /api/auth/me (trả UserOut gồm role) ngay sau khi đăng nhập/khi load app — lưu vào 1 context/store dùng chung cho toàn app (không tự decode JWT phía client).

4. Cập nhật proxy.ts: đọc role đã lưu (từ cookie/store tương ứng cơ chế đang dùng) để quyết định UI. Nếu STAFF cố vào route OWNER-only (/gardens, /inventory, /harvests, /reports, /staff) → redirect về /tasks. Nếu OWNER → không giới hạn. Lưu ý: đây chỉ là lớp UI, backend vẫn phải tự kiểm tra role ở từng endpoint nhạy cảm (không tự động có, cần xác nhận riêng).

5. Cập nhật sidebar (component layout dashboard): ẩn hoàn toàn các mục OWNER-only khi role là STAFF, chỉ hiện "Tasks". Thêm mục "Staff" vào sidebar (chỉ OWNER thấy), đặt gần cuối danh sách nav.

6. Link "Đăng ký" ở cuối form /login, trỏ sang /register.

Definition of done: tạo được tài khoản OWNER mới qua /register thật (không qua Swagger), OWNER tạo được STAFF qua /staff, đăng nhập bằng STAFF thấy sidebar bị rút gọn đúng và bị chặn khi cố vào URL OWNER-only. pnpm lint + build sạch.
```

---

## FE-M1 — Gardens & Zones

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

Trong route group (dashboard):
1. Trang /gardens: danh sách vườn (GET /api/gardens, có phân trang limit/offset — dùng DataTable hoặc card list có pagination, không render mảng tĩnh), nút "Tạo vườn mới" (POST /api/gardens: name, address, plant_type — KHÔNG có field area_m2, diện tích chỉ tính được sau khi vẽ boundary).
2. Trang /gardens/[id]: GET /api/gardens/{id} (GardenDetail, có boundary GeoJSON). Tích hợp bản đồ (Leaflet) để vẽ polygon boundary, gọi PUT /api/gardens/{id}/boundary (body là GeoJSONPolygon: {type: "Polygon", coordinates: [[[lng,lat],...]]}) khi lưu. Hiển thị area_m2 backend trả về sau khi lưu (không tự tính ở FE).
3. Danh sách zone trong vườn (GET /api/gardens/{id}/zones) + form tạo zone (POST /api/gardens/{id}/zones: name, grid_position optional). QUAN TRỌNG: update/delete zone dùng resource cấp cao nhất, KHÔNG nested theo garden_id — PUT /api/zones/{zone_id} và DELETE /api/zones/{zone_id} (không phải /api/gardens/{id}/zones/{zone_id}).
4. Gán nhân viên vào zone: GET /api/zones/{zone_id}/assignments (danh sách hiện tại), POST /api/zones/{zone_id}/assignments (body: {user_id}) qua dropdown chọn từ danh sách GET /api/staff, DELETE /api/zones/{zone_id}/assignments/{user_id} để gỡ.
5. Dùng TanStack Query cho toàn bộ data fetching, khai báo query key tập trung ở lib/query-keys.ts.

Definition of done: vẽ được polygon thật, lưu thành công, load lại trang vẫn hiển thị đúng polygon đã lưu, gán/gỡ nhân viên khỏi zone hoạt động đúng qua đúng endpoint không nested. pnpm lint + build sạch.
```

---

## FE-M2 — Plants & Tags (Signature screen)

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm — đặc biệt mục màu trạng thái cây và "signature element".

1. components/garden-map/: mở rộng bản đồ vườn từ FE-M1 thành sơ đồ dạng lưới ô — mỗi zone chia thành các ô nhỏ tương ứng plant.grid_x/grid_y, mỗi ô tô màu theo plants.status (dùng components/plant-status-badge làm nguồn màu duy nhất). Click vào ô mở popup thông tin cây (code, status, ngày trồng).

2. Trang danh sách cây (/gardens/[id]/plants): dùng DataTable (shadcn/ui data-table + TanStack Table) vì GET /api/gardens/{garden_id}/plants có phân trang thật (limit/offset, filter status/zone_id/code) — không render mảng tĩnh, phải có pagination control + filter theo status/zone khớp query param backend.

3. Form "Tạo hàng loạt" (bulk generate): gọi POST /api/gardens/{garden_id}/plants/bulk với code_prefix, count, zone_id (optional), start_index (default 1), planted_at (optional) — sinh nhiều cây cùng lúc với mã tự động (SR-K01-001, SR-K01-002...). Đây là cách chính để tạo cây hàng loạt, không tạo tay từng cây một qua form đơn lẻ (dù vẫn giữ form tạo 1 cây đơn lẻ qua POST /api/gardens/{garden_id}/plants cho trường hợp thêm cây riêng lẻ sau này).

4. Trang chi tiết cây /plants/[id]: thông tin cơ bản (GET /api/plants/{id}) + placeholder cho timeline (làm đầy ở FE-M3).

5. Chức năng in mã: sau khi bulk generate xong, chọn các cây vừa tạo → sinh QR (qrcode) hoặc Barcode (jsbarcode) dựa trên plants.code → xuất PDF hàng loạt (react-pdf).

6. Quy trình thay tag: attach tag lần đầu qua POST /api/plants/{id}/tags (tag_code, tag_type). Thay tag hỏng qua PUT /api/tags/{tag_id}/replace (trả về TagReplaceResult gồm old_tag + new_tag) — hiển thị lịch sử rõ ràng (tag cũ status REPLACED, replaced_by trỏ sang tag mới).

7. (Tuỳ chọn, hữu ích để test không cần điện thoại): thêm 1 ô "Test scan" trên trang chi tiết vườn, cho nhập tay tag_code, gọi GET /api/tags/lookup/{code} — hiển thị đúng ScanResult (tag + plant + garden + recent_logs) giống hệt Mobile App sẽ thấy khi quét thật.

Definition of done: sơ đồ lưới render đúng màu theo status thật từ API, bulk generate tạo đúng số cây với mã tuần tự, in được ít nhất 1 file PDF chứa QR hợp lệ (test quét thử bằng điện thoại), DataTable danh sách cây có phân trang/filter hoạt động đúng với API thật. pnpm lint + build sạch.
```

---

## FE-M3 — Plant Logs & Timeline

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

1. Luồng upload ảnh (áp dụng cho form tạo log): với mỗi ảnh người dùng chọn — (a) gọi POST /api/uploads/presign với content_type + size_bytes, nhận về { upload_url, object_url, key, expires_in_seconds, max_size_bytes }; (b) PUT thẳng file lên upload_url (gọi trực tiếp tới MinIO, không qua backend); (c) lưu lại object_url. Khi submit form log, gửi mảng images là danh sách các object_url đã upload (tối đa 10 ảnh theo giới hạn PlantLogCreate.images maxItems).

2. Form tạo log thủ công trên Admin Web (dùng để test/demo, luồng chính vẫn là Mobile App): status (bắt buộc, enum PlantStatus), note (optional, tối đa 5000 ký tự), images (theo luồng ở mục 1). Gọi POST /api/plants/{id}/logs. Không cần tự sinh client_uuid ở Admin Web (field này chủ yếu phục vụ offline sync bên Mobile) — có thể để trống, backend cho phép null.

3. Trang chi tiết cây: hiển thị timeline dùng GET /api/plants/{id}/timeline (đã enrich sẵn reporter_name, không cần tự join). Có phân trang (limit/offset), hiển thị mới nhất trước.

4. Chức năng so sánh ảnh: chọn 2 mốc thời gian từ timeline đã tải, hiển thị 2 ảnh cạnh nhau (before/after) — dùng trực tiếp images đã có trong TimelineEntry.log, không gọi API riêng.

5. Xử lý trạng thái rỗng: cây chưa có log nào (timeline total = 0) → hiển thị hướng dẫn rõ ràng.

Definition of done: tạo log thật từ Admin Web thành công kèm ảnh thật (test xem ảnh hiển thị lại đúng từ MinIO qua object_url), timeline hiển thị đúng dữ liệu thật kèm tên người báo cáo. pnpm lint + build sạch.
```

---

## FE-M4 — Tasks, Schedules & Notifications

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

1. Trang /tasks: DataTable (phân trang thật qua limit/offset) theo task_status (PENDING/IN_PROGRESS/DONE/CANCELLED), filter theo garden_id/assignee_id/status (khớp query param GET /api/tasks). KHÔNG cần tự lọc theo role — backend tự trả đúng phần của OWNER (tất cả task trong vườn của họ) hoặc STAFF (chỉ task được giao) rồi.

2. Form tạo task (chỉ OWNER thấy nút này, theo role từ /api/auth/me): garden_id, type (task_type enum), plant_id (optional), assignee_id (optional), description, due_date. Gọi POST /api/tasks.

3. Hành động trên task: PUT /api/tasks/{id}/start (assignee hoặc owner bấm "Bắt đầu"), PUT /api/tasks/{id}/complete (kèm proof_images — dùng lại đúng luồng presign upload như FE-M3). Owner có thêm PUT /api/tasks/{id} để sửa/reassign/huỷ (status → CANCELLED qua TaskUpdate).

4. Form tạo lịch lặp lại (schedules, chỉ OWNER): UI chọn tần suất dễ hiểu (dropdown Hàng ngày/Hàng tuần/Hàng tháng + chọn thứ/ngày) rồi tự convert sang cron_expr string gửi backend qua POST /api/gardens/{garden_id}/schedules — KHÔNG bắt người dùng tự gõ cron. Hiển thị next_run_at backend trả về (đã tính sẵn, FE không tự tính).

5. Trung tâm thông báo (topbar): dùng GET /api/notifications/unread-count cho badge số lượng (gọi định kỳ polling, ví dụ mỗi 30s — nhẹ hơn gọi cả danh sách). Khi mở dropdown: GET /api/notifications (phân trang, có thể filter unread=true). Đánh dấu đã đọc từng cái: PUT /api/notifications/{id}/read. Nút "Đánh dấu tất cả đã đọc": POST /api/notifications/read-all.

Definition of done: tạo task/schedule thành công qua form thật, start/complete task hoạt động đúng với proof_images upload thật, badge thông báo cập nhật đúng số unread thật, mark-as-read hoạt động. pnpm lint + build sạch.
```

---

## FE-M5 — Dashboard

> ⚠️ **CHƯA CHẠY PROMPT NÀY** — `openapi.json` hiện chưa có endpoint dashboard aggregate hay `/api/ai/summarize`. Xác nhận lại bằng cách fetch `http://localhost:8000/openapi.json` mới trước khi chạy; nếu vẫn chưa có, backend cần làm phần này trước.

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

1. Trang /dashboard: thẻ KPI (tổng số cây theo từng plant_status, dùng đúng màu chuẩn), biểu đồ xu hướng theo thời gian (Recharts).
2. Thẻ tóm tắt AI: gọi POST /api/ai/summarize (nếu backend đã có ở M5), hiển thị đoạn text ngắn AI tổng hợp tình hình vườn; xử lý trạng thái đang tải AI riêng (có thể chậm hơn API thường) và trạng thái lỗi/không khả dụng rõ ràng.

Definition of done: dashboard load đúng số liệu thật, biểu đồ responsive ở tablet. pnpm lint + build sạch.
```

---

## FE-M6 — Inventory, Harvests & Public Trace

> ⚠️ **CHƯA CHẠY PROMPT NÀY** — `openapi.json` hiện chưa có endpoint `/api/inventory*`, `/api/harvests*`, hay `/api/trace/*`. Xác nhận lại qua `openapi.json` mới trước khi chạy.

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

1. Trang /inventory: bảng vật tư (inventory_items) + lịch sử nhập/xuất (inventory_transactions), cảnh báo khi quantity < min_quantity hoặc gần expiry_date.
2. Trang /harvests: bảng thu hoạch theo mùa/cây, biểu đồ năng suất.
3. Trang public /trace/[code] (KHÔNG nằm trong route group (dashboard), không cần đăng nhập): gọi GET /api/trace/:code, thiết kế khác hẳn — hướng người tiêu dùng cuối, có thể dùng tông màu ấm/thân thiện hơn thay vì giao diện "công cụ vận hành" của phần admin.

Definition of done: cảnh báo tồn kho hiển thị đúng điều kiện, trang public hoạt động độc lập không cần token. pnpm lint + build sạch.
```

---

## FE-M7 — AI Diagnosis (view only)

> ⚠️ **CHƯA CHẠY PROMPT NÀY** — `openapi.json` hiện chưa có endpoint `/api/ai/diagnose` hay `ai_diagnoses`. Xác nhận lại qua `openapi.json` mới trước khi chạy.

```
Đọc CLAUDE.md và docs/design-system.md trước khi làm.

Trên trang chi tiết cây (/plants/[id]): thêm section hiển thị kết quả ai_diagnoses gắn với từng plant_log — tên bệnh, % confidence (hiển thị rõ đây là gợi ý AI, không phải chẩn đoán chắc chắn), gợi ý xử lý (suggestion).

Definition of done: hiển thị đúng dữ liệu thật khi backend đã có ai_diagnoses, có fallback rõ ràng khi log chưa được AI chẩn đoán. pnpm lint + build sạch.
```