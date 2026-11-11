# Workflow sản xuất video

## 1. Nhận đầu vào

Nhận content, ảnh đánh số, footage nếu có, logo hợp lệ, CTA, thời lượng và nền tảng. Nếu chỉ có ảnh ghép, có thể tách khung để test nhưng phải nói rõ giới hạn độ nét. Ưu tiên ảnh nền không có chữ để Remotion dựng tiếng Việt chính xác.

## 2. Kịch bản và kiểm tra nguồn

Giữ hook rõ trong 3 giây đầu. Chọn một ý chính mỗi cảnh; rút gọn bài dài thay vì nhồi chữ. Nội dung di trú là thông tin giáo dục chung; claim quan trọng cần nguồn chính thức và ngày kiểm tra. Mâu thuẫn/chưa chắc chắn phải ghi rõ để người dùng kiểm tra.

## 3. Chia cảnh

Lập bảng gồm số cảnh, thời lượng, nội dung, asset, chuyển động và nguồn. 8 cảnh không bắt buộc mỗi cảnh bằng nhau: đọc chữ cần đủ thời gian. Khi người dùng yêu cầu 4 ảnh xen kẽ 4 video và ảnh thứ tư ở cuối, thứ tự là video → ảnh1 → video → ảnh2 → video → ảnh3 → video → ảnh4.

## 4. Asset

Tái dùng ảnh người dùng cung cấp và stock miễn phí. Ưu tiên nhân vật châu Á theo brief người Việt; nếu không phù hợp, dùng địa điểm tại quốc gia liên quan hoặc cảnh hồ sơ/chi tiết không lộ mặt. Đừng coi stock là khách hàng, nhân viên hay người bảo chứng thật. Kiểm tra license/metadata và ghi lại URL, tác giả, ID.

Pexels/Pixabay là hai dịch vụ khác nhau. Chỉ dùng key với đúng dịch vụ và lưu trong engine/.env. Khi không có key, có thể dùng trang tải công khai được phép; báo rõ không gọi API. Không đăng nhập, mua credit hoặc dùng API trả phí khi chưa được phép. Hình AI là tùy chọn, không bắt buộc; tránh chi phí tạo ảnh nếu người dùng đã có asset.

## 5. Typography và motion

Be Vietnam Pro: 700/800 cho tiêu đề, 600 cho callout, 500 cho nội dung. Load cả subsets latin và vietnamese để không rơi về font khác. Chữ/logo liên hệ nên do Remotion dựng riêng. Không chèn subtitle lặp lại nguyên văn tiêu đề nếu không có narration.

Ảnh: pan/zoom nhẹ, crop giữ chủ thể. Video: chọn đoạn chuyển động phù hợp, không crop mất người; có thể đặt video ngang trong bố cục editorial dọc. Dùng hiệu ứng chữ, underline, highlight, reveal và chuyển cảnh có chủ đích. Không dùng cùng bố cục cho mọi cảnh.

## 6. Render

Default 1080x1920, 30fps, H.264 MP4, CRF khoảng 18–20. TTS hiện là tùy chọn; giữ tắt cho đến khi người dùng yêu cầu. Không thêm nhạc không rõ quyền. Nếu cổng preview bị ứng dụng khác chiếm, dùng cổng riêng, không tắt ứng dụng kia. Mỗi project có assets/artifacts/renders riêng.

## 7. QA và bàn giao

Xác minh file tồn tại, duration, resolution, codec, audio theo yêu cầu. Dùng ffmpeg giải mã toàn bộ. Xem khung hình đại diện từng cảnh: dấu Việt, crop, CTA, chữ tràn/đè, logo và asset thiếu. Im lặng là hợp lệ khi không yêu cầu audio. Gửi MP4 có đường dẫn dùng được và báo giới hạn thực tế.

## 8. Tái sử dụng

Video mới tạo project mới. Dùng lại engine, workflow, typography và kỹ thuật; thay nội dung/ảnh/footage/CTA. Tránh thiết kế lại hệ thống hoặc cài lại dependency mỗi lần. Chỉ cập nhật workflow chung khi thay đổi có ích cho nhiều video.
