# Kiểm tra bản đóng gói

Ngày 11/11/2026, bản source độc lập này đã được kiểm tra:

- Cài dependency Studio và engine Remotion từ lockfile.
- TypeScript frontend/backend: đạt.
- Studio Vitest: 2 test đạt. Engine có bộ test riêng, không trộn các runner vào Vitest của Studio; chưa chạy toàn bộ test upstream.
- Build production Studio: đạt.
- Tạo project mới từ template và render thật 8 cảnh, 24 giây, 1080x1920, 30fps, H.264.
- FFprobe và giải mã toàn bộ bằng FFmpeg: đạt.
- Cú pháp các Python adapter/Windows compatibility file được kiểm tra.
- Cú pháp script PowerShell setup được kiểm tra. Chưa chạy cài đặt end-to-end trên một máy Windows hoàn toàn sạch; máy mới vẫn cần tải dependency và có công cụ hệ thống theo README.
- Audit source public: không có tên thương hiệu khách hàng bị cấm, không có config/key thực tế hoặc sản phẩm khách hàng. File demo/SFX đi kèm upstream giữ theo nguồn và giấy phép upstream.

TTS, API stock và provider cloud cần cấu hình/kiểm tra trên từng máy khi sử dụng. Không khẳng định các provider đó sẵn sàng chỉ vì source đã có trong repo.
