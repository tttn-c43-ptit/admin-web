Đọc AGENTS.md, CLAUDE.md, docs/design-system.md, và docs/prompts.md trước khi làm bất kỳ thay đổi nào.

Nhiệm vụ: audit toàn bộ FE-M0 (Auth & App Shell) hiện tại, tìm và sửa các vấn đề dưới đây. Đây là bước "đóng milestone chắc chắn" trước khi sang FE-M1 — ưu tiên đúng, không ưu tiên nhanh.

## 1. BUG NGHIÊM TRỌNG: token không đồng bộ giữa proxy.ts và api-client.ts

- `proxy.ts` đọc token từ cookie (`request.cookies.get('access_token')`).
- `lib/auth.ts` hiện lưu token vào sessionStorage, KHÔNG set cookie.
- → Route guard trong proxy.ts hiện không hoạt động đúng vì cookie không bao giờ tồn tại.

Sửa theo hướng: giữ nguyên toàn bộ cơ chế sessionStorage hiện có trong lib/auth.ts và api-client.ts (không đổi kiến trúc, không chuyển sang httpOnly cookie/BFF pattern — việc đó để dành cho giai đoạn hardening sau).
Chỉ bổ sung:
- Khi login thành công (sau khi gọi setAccessToken): đồng thời set thêm 1 cookie `access_token` (không cần httpOnly vì set từ client), path=/, SameSite=Lax, max-age tương ứng thời hạn access token.
- Trong hàm clearTokens() (lib/auth.ts): xóa thêm cookie access_token (set max-age=0) song song với việc xóa sessionStorage.
- Nếu có luồng tự động refresh access token (trong api-client.ts khi gặp 401) mà cập nhật access token mới: cập nhật luôn cookie tương ứng, không chỉ sessionStorage.

## 2. Route chưa tồn tại gây 404 prefetch noise trong console

Console hiện có rất nhiều lỗi 404 dạng `plants?_rsc=...`, `tasks?_rsc=...`, `inventory?_rsc=...`, `harvests?_rsc=...`, `reports?_rsc=...` do Next.js tự prefetch các Link trong sidebar trỏ tới route chưa được code.

Sửa: tạo page.tsx tối giản dạng "coming soon" cho từng route sidebar chưa có nội dung thật (ví dụ /plants, /tasks, /inventory, /harvests, /reports, /gardens nếu cũng chưa có) — mỗi trang chỉ cần hiển thị tên milestone tương ứng sẽ làm route đó (tra trong docs/prompts.md để biết đúng milestone), ví dụ "Coming soon — FE-M2". Không cần logic thật, chỉ cần route tồn tại và trả 200 để hết 404.

## 3. Rà soát lại toàn bộ để không có lỗi ẩn khác

- Chạy pnpm lint và pnpm build, sửa hết mọi lỗi/warning, kể cả lỗi type nhỏ.
- Rà lại toàn bộ text hiển thị UI (label, placeholder, button, message lỗi) — xác nhận đã dịch hết sang tiếng Anh, không còn sót tiếng Việt ở đâu, không dịch nhầm làm sai nghĩa.
- Rà lại mọi chỗ dùng form.register(...)/htmlFor/id trong các form — xác nhận tên field khớp 100% với schema Zod tương ứng (đã từng có bug field "username" không khớp "identifier" trong login, kiểm tra không còn kiểu lỗi tương tự ở bất kỳ form nào khác).
- Xác nhận package.json có field "engines" khai báo đúng Node version tối thiểu (>=22.13, khớp với Dockerfile hiện dùng node:22-alpine) — để tránh lặp lại lỗi mismatch Node version giữa máy dev và Docker.
- Kiểm tra .gitignore không có dòng nào vô tình ignore nhầm file cần thiết (đã từng có lỗi dòng `/.dockerignore` bị ignore chính nó — xác nhận không còn lỗi tương tự).
- Xác nhận .dockerignore tồn tại và loại trừ đúng node_modules, .next, .git, .env, .env.local.
- Tìm và xóa mọi console.log/console.debug còn sót lại từ lúc debug (nếu có).
- Kiểm tra không có import không dùng đến (unused imports) — pnpm lint phải tự bắt được nhưng xác nhận lại thủ công 1 lượt.

## 4. Regression test đầy đủ theo docs test plan hiện có (nếu có file TEST_PLAN_FE_M0.md trong repo, đọc và bám theo đúng file đó)

Tự chạy lại (hoặc mô tả rõ cách bạn đã xác minh) các case sau, ưu tiên nhóm liên quan trực tiếp tới bug mục 1:
- Đăng nhập đúng → vào được /dashboard
- Đăng nhập sai password → hiện lỗi rõ ràng, không redirect
- Xóa cookie + sessionStorage, gõ thẳng /dashboard → phải redirect về /login (đây là test quan trọng nhất để xác nhận bug mục 1 đã thật sự hết)
- Đã đăng nhập, gõ lại /login → redirect về /dashboard
- Đăng nhập xong, F5 reload → vẫn ở /dashboard
- Bấm logout → về /login, và gõ lại /dashboard sau đó phải bị chặn (không còn sống sót phiên cũ ở cookie lẫn sessionStorage)

## Yêu cầu đầu ra

Không tự ý sửa gì ngoài phạm vi 3 mục trên. Sau khi xong, viết 1 bản tóm tắt liệt kê:
- Danh sách file đã sửa và lý do sửa từng file
- Xác nhận rõ ràng bug mục 1 (cookie/sessionStorage) đã fix và đã tự test lại theo đúng case ở mục 4
- Danh sách route "coming soon" đã tạo thêm ở mục 2
- Kết quả pnpm lint và pnpm build (phải sạch, dán lại output nếu có thể)

Definition of done: pnpm lint sạch, pnpm build qua, route guard hoạt động đúng thật sự (không chỉ code trông đúng), không còn 404 prefetch trong console cho các route sidebar.
