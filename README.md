# OpenVideo

Hệ thống làm video local trên Windows, dùng Codex điều khiển, OpenMontage làm engine, Remotion dựng hiệu ứng và FFmpeg kiểm tra/encode. Đây là mã nguồn và workflow để làm nhiều video, không phải project của một sản phẩm đơn lẻ.

## Dùng trên máy mới

Yêu cầu: Windows 10/11, Node.js 20.19+ (khuyến nghị 22 LTS), Python 3.10+ (khuyến nghị 3.12), Git, FFmpeg/FFprobe và Codex CLI.

```powershell
git clone https://github.com/miguel17717/openvideo.git
cd openvideo
powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1
npm run dev
```

Script setup cài dependency riêng trong project và tạo `config/local.json` theo đường dẫn máy mới. Không mang virtualenv, node_modules hoặc key từ máy cũ. Nếu Python có tên khác, dùng `scripts/setup-windows.ps1 -PythonCommand 'C:\path\python.exe'`. Không cần tài khoản API trả phí.

Nếu thiếu công cụ hệ thống, cài Node.js/Python/Git/FFmpeg từ nguồn chính thức hoặc winget; đăng nhập Codex bằng tài khoản của bạn. Script báo rõ công cụ thiếu và không tự đăng nhập thay bạn.

## Làm video với Codex

Mở repo bằng Codex và yêu cầu: **“Đọc AGENTS.md và WORKFLOW.md, rồi tạo video từ nội dung và ảnh tôi gửi.”**

Workflow đã lưu: content + ảnh/video → kiểm tra nguồn → kịch bản → chia cảnh → stock miễn phí → typography/hiệu ứng → render MP4 → QA. Tiếng Việt, vertical 9:16, Be Vietnam Pro, không TTS khi chưa yêu cầu. Ưu tiên nhân vật châu Á phù hợp khán giả Việt; dùng cảnh tại quốc gia liên quan hoặc hồ sơ không lộ mặt khi thiếu footage phù hợp.

## Template chạy ngay

```powershell
npm run project:new -- video-dau-tien
npm run project:render -- video-dau-tien
```

Template mặc định là 8 cảnh đồ họa không cần key, dùng để kiểm tra render. Sửa `projects/video-dau-tien/artifacts/scenes.json` để đổi nội dung, thời lượng, brand và asset. File ảnh/video nằm trong `projects/video-dau-tien/public/`; trường `src` là tên file tương đối trong thư mục đó. Video xuất ra `projects/video-dau-tien/renders/final.mp4`.

Đây là đường dựng Remotion trực tiếp, bổ sung cho pipeline agent-driven đầy đủ trong engine. Không phải tự động biến bài viết thành video nếu chưa có Codex viết kịch bản/chọn asset.

## Cấu trúc

```text
frontend/       Giao diện Studio React/TypeScript
backend/        API local, scanner project, tiến trình, QA
engine/         Mã nguồn OpenMontage, skills, pipeline, tools, Remotion composer
templates/      Template video tái sử dụng
scripts/        Setup, tạo project, render và adapter
docs/           Quy tắc content, nguồn stock và chuyển máy
projects/       Dữ liệu từng video — được tạo local, không commit mặc định
```

Studio chỉ bind `127.0.0.1`. `freeOnly` là quy tắc vận hành/prompt; không phải tường lửa chi phí. Không bật provider trả phí nếu chưa được người dùng cho phép.

## API key và dữ liệu cá nhân

Key stock miễn phí là tùy chọn: cấu hình trong `engine/.env` trên mỗi máy. Không commit file đó. Pexels và Pixabay dùng key riêng, không gửi key của dịch vụ này sang dịch vụ khác. Không đưa dữ liệu khách hàng lên repo public. Chi tiết: [WORKFLOW.md](WORKFLOW.md), [HANDOFF.md](HANDOFF.md), [docs/MOVE-TO-ANOTHER-PC.md](docs/MOVE-TO-ANOTHER-PC.md).

## Kiểm tra mã nguồn

```powershell
npm run typecheck
npm test
npm run build
```

## Nguồn mở

Engine dựa trên [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage), bản gốc `08e2151fa02de28a5d6a312b3d575692bf147ad7`, có sửa tương thích Windows và tùy biến tích hợp local. Giữ thông báo bản quyền và giấy phép AGPL-3.0 trong [LICENSE](LICENSE), [NOTICE.md](NOTICE.md). Thư viện bên thứ ba giữ giấy phép riêng. Repo này không phải sản phẩm chính thức của tác giả engine.
