# Chuyển máy

Git lưu code/workflow/template, không lưu môi trường đã cài hoặc credentials. Sau khi clone, chạy scripts/setup-windows.ps1 để thiết lập lại môi trường theo đường dẫn thực tế. Node.js, Python, FFmpeg và Codex cần có trên máy mới.

Để tiếp tục một video đang làm, cần chép thêm thư mục projects/<slug>/ (qua ổ đĩa hoặc cloud cá nhân). Các thư mục này bị Git bỏ qua để tránh công khai ảnh khách hàng và làm repo nặng. Chỉ clone repo sẽ khôi phục hệ thống, không tự khôi phục media cá nhân.

Thiết lập key trong engine/.env nếu muốn dùng API stock miễn phí. Không đưa key vào prompt, README hoặc Git. Đăng nhập Codex/GitHub riêng trên máy mới.
