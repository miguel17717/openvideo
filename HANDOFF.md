# Tiếp tục trên máy khác

Đây là hệ thống sản xuất nhiều video. Người dùng đã thử thành công các dạng text + ảnh chuyển động và 4 ảnh xen kẽ 4 footage. Thành phẩm cũ không phải cốt lõi repo và không được đưa lên repo public.

Các lựa chọn mặc định đã thống nhất: Windows, Codex điều khiển, engine OpenMontage, Remotion, FFmpeg, miễn phí ở giai đoạn đầu, tiếng Việt, dọc 9:16, Be Vietnam Pro, không TTS hiện tại. Nếu có key stock miễn phí thì sử dụng đúng provider; nếu chưa có, không buộc người dùng phải mua dịch vụ.

Repo engine/ giữ các sửa local ở: tools/video/video_compose.py, tools/audio/piper_tts.py, tools/analysis/composition_validator.py và các component Remotion. Model Piper/virtualenv/FFmpeg binary không nằm trong Git; cần cài riêng trên máy mới. Không khẳng định TTS đã sẵn sàng cho máy mới trước khi thử thật.

Máy mới: đọc README, chạy setup, kiểm tra dependency, mở repo bằng Codex. Sau đó nhận brief và tạo project trong projects/. Không cần người dùng kể lại workflow. Chat history không được đồng bộ qua Git; tri thức làm việc cần nằm trong các file này.
