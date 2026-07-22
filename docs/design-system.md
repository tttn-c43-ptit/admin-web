# UI/UX Design Plan — Admin Web (Hệ thống Quản lý Cây Trồng Nông Nghiệp)

## 1. Bối cảnh & nguyên tắc thiết kế

> **Cập nhật:** toàn bộ UI copy (label, button, message) chuyển sang tiếng Anh. Giữ nguyên toàn bộ design token màu/typography đã định nghĩa bên dưới — chỉ đổi ngôn ngữ text, không đổi thiết kế.

Đây là **công cụ quản lý vận hành** cho chủ vườn (B2B/nội bộ), không phải trang marketing — ưu tiên: đọc nhanh trạng thái, thao tác ít bước, rõ ràng trên bộ dữ liệu lớn (có thể 1.000+ cây). Tránh trang trí thừa; mọi lựa chọn màu/spacing phải phục vụ việc "nhìn phát biết ngay vườn đang ổn hay có vấn đề".

Nguyên tắc:
- **Trạng thái là công dân hạng nhất.** Màu trạng thái cây (`plant_status`) phải nhất quán tuyệt đối ở mọi nơi hiển thị (bảng, thẻ, bản đồ, biểu đồ).
- **Bản đồ vườn là yếu tố hình ảnh đặc trưng nhất** (signature element) — không phải hero banner hay minh hoạ, mà là sơ đồ vườn dạng lưới/polygon thực sự hữu dụng.
- **Responsive nhưng ưu tiên desktop/tablet** cho Admin Web (chủ vườn dùng ở văn phòng/nhà); Mobile App mới là nơi thao tác ngoài đồng.
- Không dùng animation trang trí; chỉ dùng transition ngắn (150-200ms) cho feedback thao tác (loading, hover, mở modal).

## 2. Design tokens

**Màu sắc** (định nghĩa làm CSS variables, dùng xuyên suốt qua Tailwind theme, không hardcode hex trong component):

| Token | Hex | Dùng cho |
| --- | --- | --- |
| `--brand` | `#2F5233` (xanh lá đậm, forest green) | Logo, nav active state, primary button |
| `--brand-muted` | `#E8EDE6` | Background nhạt cho card/section liên quan brand |
| `--surface` | `#FAF9F6` | Nền trang (off-white ấm, đỡ chói khi nhìn dashboard lâu) |
| `--surface-card` | `#FFFFFF` | Nền card/table trên surface |
| `--ink` | `#1C1F1D` | Text chính |
| `--ink-muted` | `#5C645E` | Text phụ, label |

**Màu trạng thái cây** (khớp đúng `plant_status` enum, dùng nhất quán mọi nơi — bảng, chip, marker bản đồ, biểu đồ):

| Status | Màu | Ý nghĩa |
| --- | --- | --- |
| `UNKNOWN` | `#9CA3AF` (xám) | Chưa có báo cáo |
| `HEALTHY` | `#3F9142` (xanh lá) | Khỏe mạnh |
| `WATCHING` | `#D9A441` (vàng/amber) | Cần theo dõi |
| `SICK` | `#C1502E` (đỏ cam đất) | Có bệnh |
| `DEAD` | `#2B2B2B` (đen/xám đậm) | Đã chết |

**Typography:**
- UI/body: **Inter** hoặc **IBM Plex Sans** — sans-serif rõ ràng, đọc tốt ở kích thước nhỏ trong bảng dữ liệu dày đặc.
- Số liệu/dashboard (KPI lớn): cùng font nhưng dùng `tabular-nums` để số thẳng hàng trong bảng/thẻ thống kê.
- Không cần font display/serif riêng — đây là công cụ vận hành, không phải trang giới thiệu sản phẩm.

**Layout:**
- Sidebar cố định bên trái (nav chính: Vườn, Cây trồng, Công việc, Kho vật tư, Thu hoạch, Báo cáo) + topbar (search, notification bell, avatar).
- Content area dùng grid 12 cột, card bo góc nhẹ (`rounded-lg`, `border` mảnh thay vì shadow nặng — giữ cảm giác gọn, "công cụ" chứ không "app tiêu dùng").
- Bảng dữ liệu: sticky header, zebra row nhẹ, badge màu trạng thái ở đầu dòng.

**Signature element:** bản đồ vườn dạng polygon + lưới ô (zones), click vào ô ra popup thông tin cây, màu ô = màu trạng thái tổng hợp của cây trong ô đó. Đây là màn hình người dùng sẽ nhớ nhất — đầu tư kỹ nhất vào đây (M1-M2).

## 3. Danh sách màn hình theo milestone (khớp milestone backend)

| Milestone (FE) | Milestone backend tương ứng | Màn hình |
| --- | --- | --- |
| **FE-M0** Auth & Shell | M0 | Đăng nhập, layout sidebar/topbar rỗng, route bảo vệ (đã đăng nhập/chưa đăng nhập) |
| **FE-M0.5** Register, Staff & Roles | M0 | Đăng ký public (chỉ role OWNER), màn hình OWNER tạo/mời tài khoản STAFF, route guard + sidebar theo role (STAFF chỉ thấy menu Công việc, ẩn Vườn/Kho vật tư/Báo cáo hoặc hiển thị read-only) |
| **FE-M1** Gardens & Zones | M1 | Danh sách vườn, tạo vườn (form), trang chi tiết vườn: vẽ polygon trên bản đồ (Mapbox GL/Leaflet), chia zone, danh sách zone + gán nhân viên |
| **FE-M2** Plants & Tags | M2 | Sơ đồ vườn dạng lưới (signature element), danh sách cây (bảng + filter theo status/zone), trang chi tiết cây, in mã QR/Barcode hàng loạt (PDF) |
| **FE-M3** Plant Logs & Timeline | M3 | Timeline báo cáo theo cây (ảnh + ghi chú theo thời gian), so sánh ảnh giữa 2 mốc thời gian |
| **FE-M4** Tasks & Schedules | M4 | Bảng/kanban công việc, tạo lịch lặp lại (cron dễ hiểu bằng UI, ví dụ chọn "mỗi thứ 2 hàng tuần" thay vì nhập cron string), trung tâm thông báo |
| **FE-M5** Dashboard | M5 | Trang tổng quan: thẻ KPI (số cây theo status), biểu đồ xu hướng, thẻ tóm tắt AI (text ngắn do AI tổng hợp) |
| **FE-M6** Inventory, Harvests & Trace | M6 | Bảng kho vật tư + nhập/xuất, bảng thu hoạch theo mùa/cây, trang public truy xuất nguồn gốc (không cần đăng nhập, thiết kế khác hẳn — hướng người tiêu dùng, có thể thoải mái hơn về mặt hình ảnh) |
| **FE-M7** AI Diagnosis (view) | M7 | Hiển thị kết quả chẩn đoán AI trên trang chi tiết cây (ảnh + bệnh + % tin cậy + gợi ý xử lý) |

## 4. Quy trình thiết kế đề xuất

1. **Wireframe thấp độ trung thực (lo-fi)** cho 4 màn hình cốt lõi trước khi code dòng nào: Danh sách vườn, Sơ đồ vườn (map), Danh sách cây, Dashboard. Có thể vẽ nhanh trên Figma hoặc Excalidraw — không cần đẹp, chỉ cần chốt bố cục/luồng trước.
2. **Định nghĩa design token trước** (bước 2 ở trên) trong `tailwind.config.ts`/`globals.css` — không code page nào trước khi có token.
3. **Dựng component nền** dùng shadcn/ui làm base (button, input, table, dialog, badge...), theme lại theo token — không tự viết lại từ đầu.
4. **Code theo milestone FE-M0 → FE-M7**, mỗi milestone xong thì chụp lại 1-2 screenshot, tự phê bình (đủ contrast? đủ responsive? bảng dễ đọc không?) trước khi qua milestone tiếp.
5. **Không làm màn hình public trace (FE-M6 phần trace)** theo cùng "giọng" với dashboard nội bộ — đây là trang hướng người tiêu dùng cuối, có thể thoải mái hơn về hình ảnh/thương hiệu nông trại.

## 5. Việc cần làm ngay để bắt đầu FE-M0

- [ ] Xác nhận `NEXT_PUBLIC_API_URL` trỏ đúng backend đang chạy local (`http://localhost:8000`)
- [ ] Setup shadcn/ui + Tailwind theme với token ở mục 2
- [ ] Dựng layout sidebar/topbar rỗng (chưa cần data thật)
- [ ] Trang đăng nhập gọi `POST /api/auth/login`, lưu access/refresh token, redirect vào dashboard rỗng
- [ ] Route guard: chưa đăng nhập → redirect `/login`; đăng nhập rồi mà vào `/login` → redirect dashboard
