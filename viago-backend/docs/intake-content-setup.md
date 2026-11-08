# Thiết lập nội dung và quản lý tiếp nhận

Supabase của workspace hiện đã áp dụng các SQL và dữ liệu khởi tạo bên dưới. Không cần chạy lại để xem dữ liệu; mở frontend ở `http://localhost:4200` và đăng nhập admin. Backend chạy cổng 3000. Nếu thay proxy, phải khởi động lại `ng serve`.

## Cài đặt trên môi trường khác

Đứng trong thư mục `viago-backend`, chuẩn bị `.env` theo cấu hình Prisma hiện có. Không đưa khóa vào frontend hoặc Git.

```powershell
npm ci
npm run build
npm run db:business-ids
npm run content:db:setup
npm run db:intake-workflow
npm run content:migrate -- --apply
```

SQL là thay đổi bổ sung, không xóa bảng hoặc đổi mã cũ. `intake-workflow.sql` tạo metadata cho các hồ sơ/liên hệ hiện có; các hồ sơ gửi về sau được tạo metadata khi nhân viên bắt đầu xử lý. Prisma schema mô tả bảng; truy vấn metadata dùng SQL có tham số.

Dữ liệu nội dung nhập ban đầu chỉ thêm trang chưa có; không ghi đè nội dung đã sửa. Frontend giới thiệu/hướng dẫn vẫn tĩnh theo phạm vi đã chốt.

## Khởi tạo hồ sơ/liên hệ (tùy chọn)

Dữ liệu trong `prisma/intake-data.json` là dữ liệu khởi tạo tổng hợp theo yêu cầu. Email `.invalid` không dùng để gửi thông báo. Script không đổi khóa hoặc ghi đè hồ sơ cũ.

Để tạo CV PDF, dùng Python đã cài `reportlab` và `pypdf`; script Windows sử dụng Arial trong thư mục font Windows:

```powershell
python scripts/create-intake-cvs.py
npm run intake:seed
npm run intake:seed -- --apply
```

Lệnh không có `--apply` chỉ xem trước. Cần build backend trước vì seed dùng hàm cấp mã đã biên dịch. Seed dùng email riêng để tránh thêm trùng khi chạy lại, cấp mã UV/LH từ sequence, tham chiếu tin tuyển dụng đã tồn tại. CV tạo ở `../artifacts/intake-cv`, rồi được sao chép vào kho private bằng mã UV; không ghi đè file đã có. Thư mục artifacts và uploads không được commit.

Kho CV triển khai phải bền vững qua `CV_UPLOAD_DIR`. API tải CV cần phiên admin; không công khai thư mục uploads và không tải URL tùy ý từ DB.

## Kiểm tra

```powershell
npm test -- --runInBand
npm run test:intake
npm run test:content
```

Hai integration script dùng DB thật trong transaction rollback, không gửi email/SMS. Sequence vẫn có thể tăng dù transaction rollback. Intake dọn CV và phiên thử. Không dùng prisma reset/db push để cài các thay đổi này lên DB đang có dữ liệu.

Frontend:

```powershell
cd ../viago-frontend
npm test -- --watch=false --include=src/app/featured/admin/content/**/*.spec.ts --include=src/app/featured/admin/intake/*.spec.ts --include=src/app/featured/customer/about/**/*.spec.ts --include=src/app/featured/customer/footer-pages.spec.ts --include=src/app/core/services/news.service.spec.ts
npm run build
```

## Phạm vi phản hồi

API lưu bản nháp email trong Supabase cùng ghi chú nội bộ, phân công, ưu tiên và lịch sử. Nút mở email chuyển bản nháp vào ứng dụng email của nhân viên; nhân viên tự kiểm tra và gửi. Chưa cấu hình nhà cung cấp email hoặc tác vụ gửi tự động, nên không có trạng thái “đã gửi” giả lập. Lịch phỏng vấn được lưu theo múi giờ Việt Nam, chưa tự tạo lời mời lịch/email.
