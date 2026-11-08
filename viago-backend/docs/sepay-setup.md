# Thiết lập VietQR / SePay cho VIAGO

API và giao diện VietQR/SePay đã được khôi phục. Khi chưa cấu hình, API vẫn liệt kê phương thức `vietqr` với `configured: false`; giao diện giải thích chuyển khoản chưa sẵn sàng và cho phép chọn thanh toán tại quầy. Không tạo QR giả hoặc ghi nhận đã thu tiền khi chưa có giao dịch xác nhận.

## 1. Tạo và liên kết tài khoản

1. Truy cập [SePay](https://my.sepay.vn), tạo tài khoản và hoàn tất các yêu cầu kích hoạt trên dịch vụ.
2. Trong SePay chọn **Tài khoản ngân hàng → Thêm tài khoản**, làm theo quy trình liên kết ngân hàng tương ứng. Thực hiện bước đăng nhập/ngân hàng tại giao diện chính thức; không gửi mật khẩu ngân hàng, OTP, thông tin đăng nhập hoặc khóa bí mật qua chat.
3. Kiểm tra tài khoản liên kết ở trạng thái hoạt động. Tham khảo [hướng dẫn ngân hàng của SePay](https://developer.sepay.vn/vi/sepay-webhooks/tai-khoan-ngan-hang).

## 2. Điền cấu hình riêng trong backend

File `.env.example` đã có sẵn tên biến. Sao chép và điền trực tiếp vào `.env` riêng của backend:

```dotenv
VIETQR_BANK_ID=
VIETQR_ACCOUNT_NO=
VIETQR_ACCOUNT_NAME=
SEPAY_BANK_NAME=
SEPAY_WEBHOOK_API_KEY=
```

- `VIETQR_BANK_ID`: mã/BIN ngân hàng dùng trong ảnh VietQR.
- `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME`: số tài khoản nhận tiền và tên chủ tài khoản.
- `SEPAY_BANK_NAME`: giá trị `gateway` tương ứng ngân hàng liên kết trong payload SePay.
- `SEPAY_WEBHOOK_API_KEY`: khóa bí mật chia sẻ riêng của webhook, tối thiểu 32 ký tự. Đây là khóa chọn cho cơ chế xác thực API Key của webhook; phải trùng với khóa cấu hình trên SePay. Không đưa vào frontend hoặc Git.

Backend cần khởi động lại sau khi đổi biến môi trường. `GET /customer/home/options` trả `configured: true` khi các giá trị bắt buộc và định dạng đã đủ. Cờ này kiểm tra cấu hình cục bộ; chưa chứng minh ngân hàng hoặc webhook đã kết nối thực tế.

## 3. Cấu hình webhook

Backend cần URL HTTPS công khai mà SePay truy cập được. Khi chạy localhost, dùng môi trường triển khai hoặc tunnel được thiết lập riêng; SePay không truy cập trực tiếp localhost trên máy bạn.

Trên SePay chọn **Webhooks → Thêm webhook**:

- Sự kiện **Có tiền vào**.
- Chọn đúng tài khoản ngân hàng nhận tiền.
- URL: `https://TEN-MIEN-BACKEND/customer/home/payments/sepay`.
- Dữ liệu **JSON**.
- Bảo mật **API Key**; điền cùng giá trị `SEPAY_WEBHOOK_API_KEY`. SePay gửi header `Authorization: Apikey <khóa>`.
- Bật gửi lại khi server trả HTTP ngoài 2xx nếu phù hợp cấu hình webhook.

API trả HTTP 201 và JSON `{"success":true,...}`. Theo tài liệu SePay hiện tại, webhook mới chấp nhận 2xx cùng `success:true`; một số cấu hình cũ chỉ chấp nhận 201, nên endpoint dùng 201.

Tài liệu chính thức: [tích hợp webhook SePay](https://docs.sepay.vn/tich-hop-webhooks.html).

## 4. Kiểm tra trước khi nhận tiền thật

Dùng chức năng **Gửi thử** của SePay để kiểm tra URL, xác thực và định dạng. Sau khi ngân hàng đã liên kết và webhook đúng, kiểm tra luồng chuyển khoản với số tiền và nội dung của một đơn kiểm tra do bạn chủ động tạo. Không tự thay trạng thái đơn thành đã thanh toán trong frontend.

Luồng ứng dụng:

1. Khách chọn **VietQR / Chuyển khoản** trước khi xác nhận đơn.
2. Backend tạo đơn `ChoThanhToanOnline`, thanh toán `VIETQR`/`SePay`, mã chuyển khoản `VG...` và QR đúng số tiền.
3. Khách chuyển đúng số tiền, tài khoản và nội dung; frontend chỉ đọc trạng thái.
4. Webhook có xác thực kiểm tra mã, ngân hàng, số tiền, thời gian và ghế. Hợp lệ mới xuất vé, ghi thanh toán thành công và cập nhật ghế đã bán trong transaction.
5. Webhook gửi lặp không tạo vé hai lần. Chuyển sai số tiền, sau hạn hoặc không còn ghế thì lưu để đối soát, không tự phát vé.

Giữ chỗ vẫn tối đa 10 phút theo quy tắc hiện có. Thanh toán tại quầy vẫn dùng được cho đơn chọn `counter` và yêu cầu nhân viên xác nhận thu tiền.

## Kiểm tra code không cần ngân hàng thật

```powershell
npm run test:booking
```

Script dùng Supabase thật trong transaction rollback. Phần online chỉ dùng cấu hình kiểm tra trong process test và payload webhook mô phỏng; không sửa `.env`, không gửi chuyển khoản và không gọi ngân hàng. Việc thử code thành công không đồng nghĩa tài khoản SePay thật đã được tạo/liên kết hay có URL webhook công khai.