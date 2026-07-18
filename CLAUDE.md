# CLAUDE.md — Admin Web (Hệ thống Quản lý Cây Trồng Nông Nghiệp)

Đây là frontend quản trị (chủ vườn) của dự án tốt nghiệp nhóm C43. Backend đã có sẵn tại repo `tttn-c43-ptit/backend-python` — **luôn coi Swagger (`/docs` của backend) là nguồn sự thật cho API contract**, không tự đoán field/response shape.

Đọc trước khi code, theo đúng thứ tự:
1. `docs/design-system.md` — design tokens, danh sách màn hình theo milestone, quy trình thiết kế
2. `docs/prompts.md` — playbook prompt cho từng milestone FE
3. File này — quy ước code

## Tech stack

- Next.js (App Router), TypeScript strict mode
- Styling: Tailwind CSS + shadcn/ui (theme theo token trong `docs/design-system.md`, không hardcode hex)
- Data fetching: TanStack Query + `ky` (HTTP client nhẹ, không dùng axios/fetch trần)
- Form: React Hook Form + Zod (validate khớp schema Pydantic phía backend)
- Map: Mapbox GL JS hoặc Leaflet (vẽ polygon vườn, hiển thị sơ đồ zone)
- Chart: Recharts
- QR/Barcode: `qrcode` + `jsbarcode`; export PDF: `react-pdf` hoặc `@react-pdf/renderer`
- Package manager: pnpm
- Lint/format: ESLint + Prettier
- Test: Vitest (unit) + Playwright (E2E, từ FE-M2 trở đi khi đã có luồng thật để test)

## Cấu trúc thư mục

```
app/
  (auth)/login/            # route group không có sidebar
  (dashboard)/              # route group có sidebar/topbar layout
    gardens/
    plants/
    tasks/
    inventory/
    dashboard/
  api/                      # route handler nếu cần proxy (hạn chế dùng, ưu tiên gọi thẳng backend từ client)
components/
  ui/                       # shadcn components đã theme
  garden-map/                # component bản đồ vườn (signature element, tách riêng vì phức tạp)
  plant-status-badge/        # component dùng lại nhiều nơi — PHẢI là nguồn duy nhất render màu status
lib/
  api-client.ts              # instance `ky` duy nhất, tự gắn access token + refresh khi 401
  query-keys.ts               # tập trung khai báo TanStack Query keys, tránh key rời rạc
hooks/
types/
  api.ts                      # type khớp response backend, generate từ OpenAPI nếu có thể (`openapi-typescript`)
```

## Quy ước bắt buộc

- **Màu trạng thái cây chỉ được định nghĩa 1 lần** trong `components/plant-status-badge`, mọi nơi khác (bảng, bản đồ, chart) phải import từ đó — không copy lại mapping màu.
- **Không gọi `fetch` trực tiếp trong component.** Mọi API call qua `lib/api-client.ts` + custom hook trong `hooks/`, wrap bằng TanStack Query.
- **Type API nên generate từ OpenAPI** của backend (`openapi-typescript http://localhost:8000/openapi.json -o types/api.ts`) thay vì tự gõ tay, để không lệch khi backend đổi schema.
- **Text hướng người dùng: tiếng Việt.** Tên biến/hàm/component: tiếng Anh.
- **Mỗi milestone FE kết thúc bằng:** `pnpm lint` sạch, `pnpm build` qua, ít nhất 1 test Playwright cho happy path của milestone đó (từ FE-M2 trở đi).
- **Không tự đổi tech stack** (Mapbox/Leaflet, Recharts, shadcn...) trừ khi có lý do kỹ thuật rõ ràng và đã trao đổi với nhóm — stack đã chốt để khớp với Mobile App và báo cáo đã nộp GVHD.

## Môi trường (.env)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=            # nếu dùng Mapbox thay vì Leaflet
```

## Definition of done cho mỗi milestone

- [ ] Đúng scope milestone trong `docs/prompts.md`, không lấn sang milestone sau
- [ ] `pnpm lint` + `pnpm build` sạch
- [ ] Responsive kiểm tra ở breakpoint tablet (768px) — Admin Web ưu tiên desktop/tablet, không bắt buộc pixel-perfect mobile
- [ ] Trạng thái loading/error/empty đều có xử lý (không để trắng trang khi API lỗi)
- [ ] Screenshot màn hình chính đính kèm khi báo cáo tiến độ nhóm
