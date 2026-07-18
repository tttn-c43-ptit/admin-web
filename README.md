# Admin Web — Hệ thống Quản lý Cây Trồng Nông Nghiệp

Giao diện quản trị dành cho chủ vườn: tạo vườn, vẽ sơ đồ, quản lý cây/tag QR, giao việc, xem dashboard, quản lý kho vật tư & thu hoạch. Phần đọc-công-khai (`/trace/[code]`) dành cho người tiêu dùng quét mã truy xuất nguồn gốc.

Backend tương ứng: [`tttn-c43-ptit/backend-python`](https://github.com/tttn-c43-ptit/backend-python) — cần chạy backend trước (xem README repo đó) hoặc trỏ `NEXT_PUBLIC_API_URL` tới môi trường staging.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS + shadcn/ui · TanStack Query + `ky` · React Hook Form + Zod · Mapbox GL/Leaflet · Recharts · `qrcode`/`jsbarcode` + `react-pdf`

## Quickstart (local, không Docker)

```bash
cp .env.example .env.local
# đảm bảo NEXT_PUBLIC_API_URL trỏ đúng backend đang chạy (mặc định http://localhost:8000)

pnpm install
pnpm dev
```

Mở http://localhost:3000

## Quickstart (Docker)

```bash
docker compose up --build
```

Mở http://localhost:3000. Yêu cầu backend đã chạy sẵn (xem repo `backend-python`) và `NEXT_PUBLIC_API_URL` trong `.env` trỏ đúng — nếu backend cũng chạy bằng Docker trên máy khác, dùng địa chỉ mạng nội bộ thay vì `localhost`.

## Cấu trúc tài liệu dự án

- [`docs/design-system.md`](docs/design-system.md) — design tokens, danh sách màn hình theo milestone, quy trình thiết kế UI/UX
- [`docs/prompts.md`](docs/prompts.md) — playbook prompt cho Claude Code, mỗi milestone FE-M0 → FE-M7
- [`CLAUDE.md`](CLAUDE.md) — quy ước code cho dự án này

## Tiến độ

| Milestone | Nội dung | Trạng thái |
| --- | --- | --- |
| FE-M0 | Auth & App Shell | 🔲 |
| FE-M1 | Gardens & Zones (vẽ bản đồ) | 🔲 |
| FE-M2 | Plants & Tags (sơ đồ vườn, in QR) | 🔲 |
| FE-M3 | Plant Logs & Timeline | 🔲 |
| FE-M4 | Tasks & Schedules | 🔲 |
| FE-M5 | Dashboard | 🔲 |
| FE-M6 | Inventory, Harvests & Public Trace | 🔲 |
| FE-M7 | AI Diagnosis (view) | 🔲 |

## Scripts

```bash
pnpm dev       # dev server, hot reload
pnpm build     # production build
pnpm lint      # ESLint
pnpm test      # Vitest (unit)
pnpm test:e2e  # Playwright (từ FE-M2 trở đi)
```
