# OpenMontage Studio

OpenMontage Studio là bảng điều khiển local-first cho video factory OpenMontage. Nó đọc project thật trên ổ đĩa, hiển thị checkpoint/artifact, chạy Codex agent hoặc các bước Remotion/FFmpeg/QA đã định nghĩa sẵn, stream log bằng SSE và phát file MP4 trực tiếp trong trình duyệt.

Ứng dụng chỉ bind vào `127.0.0.1`. Frontend không thể gửi lệnh shell tùy ý; mọi process đều được backend tạo từ action định nghĩa trước, và đường dẫn file luôn bị giới hạn bên trong project đang chọn.

## Yêu cầu

- Windows 10/11
- Node.js 20 trở lên và npm
- OpenMontage đã cài
- FFmpeg + FFprobe trên `PATH`, hoặc chỉ rõ executable trong Settings
- Remotion dependencies trong `OpenMontage/remotion-composer/node_modules`
- Python environment dùng được bởi OpenMontage
- Codex CLI nếu muốn nút **Run Pipeline** điều khiển các stage agent-driven

Không cần Docker, database, Redis hay dịch vụ cloud. Cấu hình mặc định bật `freeOnly`; prompt gửi tới Codex yêu cầu không dùng API/provider trả phí.

## Cài và chạy

```powershell
git clone <repo-url> OpenMontage-Studio
Set-Location OpenMontage-Studio
npm install
Copy-Item config/local.example.json config/local.json
npm run dev
```

`npm run dev` build rồi chạy server local ổn định (phù hợp Windows/OneDrive). Nếu đang phát triển source và máy hỗ trợ Vite middleware, có thể dùng `npm run dev:hot` để có hot reload.

Terminal in URL thật, ví dụ:

```text
OpenMontage Studio running at:

http://127.0.0.1:3000
```

Mở URL đó. Vào **Cài đặt** và chọn:

1. OpenMontage path — thư mục repo OpenMontage.
2. Projects Directory — thường là thư mục `projects` nằm trong repo trên.
3. Remotion path — thư mục `remotion-composer`.
4. Python, FFmpeg, FFprobe và Codex CLI — tên command nếu đã có trong `PATH`, hoặc đường dẫn đầy đủ.

Trên máy hiện tại, `config/local.json` đã được tạo riêng và trỏ vào `C:/AI/OpenMontage`. File này bị Git bỏ qua.

## Port tự động

Studio thử `PORT`, rồi `preferredPort` trong config. Nếu port đang bận và **Auto fallback** bật, nó thử lần lượt port tiếp theo:

```text
3000 bận → 3001 → 3002 → ...
```

Frontend và backend dùng cùng origin nên không có port API bị hardcode.

## UI vận hành pipeline như thế nào

- **Run Pipeline / chạy từ Input đến OpenMontage:** backend chạy `codex exec` trong repo OpenMontage. Prompt bắt buộc agent đọc `AGENTS.md`, dùng manifest, checkpoint, approval gate và chỉ ghi vào project đã chọn.
- **Run from Remotion:** Python adapter đọc `artifacts/remotion_props.json` và gọi trực tiếp `tools.video.video_compose.VideoCompose` hiện có.
- **Run from FFmpeg:** backend encode MP4 gần nhất sang H.264/AAC, phát progress thật từ `-progress pipe:1`.
- **Run from QA:** FFmpeg giải mã toàn bộ file để phát hiện lỗi encoding.
- **QA tab:** FFprobe đọc resolution, FPS, duration, codec, frame count và audio stream. “Kiểm tra sâu” còn decode toàn bộ file.

OpenMontage là agent-first, vì vậy các stage research/script/scene/assets không phải các script độc lập. Studio không giả vờ chúng là process riêng: những stage này được giao cho Codex agent; checkpoint và artifact trên ổ đĩa vẫn là nguồn sự thật.

## API chính

- `GET /api/projects`, `GET /api/projects/:id`
- `GET /api/projects/:id/files`, `/status`, `/logs`, `/qa`
- `POST /api/projects/:id/run`, `/run-from`, `/stop`
- `GET /api/system/status`, `/api/settings`
- `PUT /api/settings`
- `GET /api/events` — SSE cho process/log realtime

## Build production

```powershell
npm run build
$env:NODE_ENV='production'
npm run start
```

Các command kiểm tra:

```powershell
npm run typecheck
npm test
```

## Cấu trúc

```text
frontend/             React + TypeScript + Vite + Tailwind
backend/              Express API, scanner, pipeline, process manager, QA
config/               example config; local.json không commit
scripts/              adapter an toàn tới OpenMontage
design-system/        UI/UX Pro design tokens và nguyên tắc
```

## Những file không đưa lên GitHub

`.gitignore` loại trừ `node_modules`, build output, log, video/render, cache, file tạm, `.env`, footage review và `config/local.json`. Video và dữ liệu project cá nhân vẫn nằm ngoài repo Studio.
