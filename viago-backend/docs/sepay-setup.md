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
SEPAY_ACCOUNT_NO=
SEPAY_BANK_NAME=
SEPAY_WEBHOOK_SECRET=
```

- `VIETQR_BANK_ID`: mã/BIN ngân hàng dùng trong ảnh VietQR.
- `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME`: số tài khoản khách chuyển tiền vào trên QR và tên chủ tài khoản. Với OCB, dùng số VA được cấp sau khi liên kết.
- `SEPAY_ACCOUNT_NO`: tài khoản chính mà SePay báo trong `accountNumber`. Bắt buộc khi nhận qua VA chính thức; để trống khi nhận trực tiếp vào cùng số tài khoản trên QR.
- `SEPAY_BANK_NAME`: giá trị `gateway` tương ứng ngân hàng liên kết trong payload SePay.
- `SEPAY_WEBHOOK_SECRET`: Secret Key HMAC-SHA256, tối thiểu 32 ký tự; phải trùng với Secret Key trên SePay. Không đưa vào frontend hoặc Git.

Backend cần khởi động lại sau khi đổi biến môi trường. `GET /customer/home/options` trả `configured: true` khi các giá trị bắt buộc và định dạng đã đủ. Cờ này kiểm tra cấu hình cục bộ; chưa chứng minh ngân hàng hoặc webhook đã kết nối thực tế.

Chạy `npm run sepay:status` để xem trạng thái cấu hình và tên trường thiếu/sai. Lệnh không in số tài khoản, tên chủ tài khoản hay khóa bí mật; trả exit code 1 khi chưa cấu hình đủ. `SEPAY_MODE` chấp nhận `live` hoặc `test` (mặc định `live`); chế độ sai sẽ vô hiệu hóa QR.

## Nhận tiền thật bằng OCB cá nhân

OCB cá nhân nhận giao dịch SePay qua VA gắn với tài khoản chính. Techcombank chưa nằm trong danh sách API webhook hiện tại. Kiểm tra danh sách mới nhất trong Dashboard SePay trước khi liên kết: [ngân hàng hỗ trợ](https://developer.sepay.vn/vi/sepay-webhooks/tai-khoan-ngan-hang).

1. Đăng ký SePay, ở môi trường Live chọn Ngân hàng → Kết nối thêm → OCB → Cá nhân.
2. Tự nhập thông tin xác thực/OTP trên giao diện chính thức của SePay, liên kết ngân hàng và tạo VA. Không gửi mật khẩu/OTP cho người khác.
3. Ghi nhận số tài khoản chính và số VA từ SePay, điền trực tiếp vào `.env` riêng:

```dotenv
SEPAY_MODE=live
VIETQR_BANK_ID=970448
VIETQR_ACCOUNT_NO=SO_VA_NHAN_TIEN
VIETQR_ACCOUNT_NAME="TEN_CHU_TAI_KHOAN_SEPAY_HIEN_THI"
SEPAY_ACCOUNT_NO=SO_TAI_KHOAN_CHINH_OCB
SEPAY_BANK_NAME=OCB
SEPAY_WEBHOOK_SECRET=KHOA_HMAC_NGAU_NHIEN_TOI_THIEU_32_KY_TU
```

Thay toàn bộ giá trị mô tả bằng thông tin thật. Tạo khóa riêng trên máy bằng `node -e "console.log('whsec_'+require('node:crypto').randomBytes(32).toString('hex'))"`, dán cùng khóa vào `.env` và trường Secret Key của webhook SePay; không gửi khóa qua chat.

QR dùng `VIETQR_ACCOUNT_NO` (VA). Webhook phải khớp đồng thời `accountNumber = SEPAY_ACCOUNT_NO`, `subAccount = VIETQR_ACCOUNT_NO` và `gateway = OCB`. Thiếu/sai VA hoặc tài khoản chính bị từ chối trước khi ghi thanh toán. Nhật ký thanh toán lưu số VA nhận tiền. Phương thức nhận trực tiếp trên tài khoản vẫn dùng được khi bỏ trống `SEPAY_ACCOUNT_NO`.

4. Tạo webhook Live theo phần 3 bên dưới: JSON, tiền vào, chọn đúng VA, dùng HMAC-SHA256 với Secret Key trùng backend, URL HTTPS công khai kết thúc bằng `/customer/home/payments/sepay`. Bật retry khi HTTP ngoài 2xx.
5. Khởi động lại backend, chạy `npm run sepay:status`. FE có nút Kiểm tra lại khi QR chưa sẵn sàng hoặc chưa tải được cấu hình.
6. Tạo đơn demo với giá nhỏ do server quy định, chủ tài khoản tự thực hiện chuyển khoản đúng số tiền/nội dung và trước hạn giữ ghế. Xem lịch sử webhook SePay và xác nhận VIAGO đổi sang đã thanh toán, chỉ xuất một vé cho mỗi ghế. Chỉ kiểm thử tự động/mô phỏng chưa chứng minh kết nối Live.

Theo [hướng dẫn OCB](https://docs.sepay.vn/ket-noi-ocb-api.html), số VA là số cung cấp cho khách để nhận tiền. Tài liệu SePay hiện ghi OCB cá nhân chưa hỗ trợ gỡ liên kết; cần đọc điều kiện này trước khi xác nhận liên kết.

## 3. Cấu hình webhook

Backend cần URL HTTPS công khai mà SePay truy cập được. Khi chạy localhost, dùng môi trường triển khai hoặc tunnel được thiết lập riêng; SePay không truy cập trực tiếp localhost trên máy bạn.

Trên SePay chọn **Webhooks → Thêm webhook**:

- Sự kiện **Có tiền vào**.
- Chọn đúng tài khoản ngân hàng nhận tiền.
- URL: `https://TEN-MIEN-BACKEND/customer/home/payments/sepay`.
- Dữ liệu **JSON**.
- Cấu trúc mã thanh toán: `VIAGO[0-9]{6,8}` — tiền tố `VIAGO`, phần sau là 6–8 chữ số. Backend sinh mã có đúng 8 chữ số, ví dụ `VIAGO12345678`. Nếu bật **Chỉ gửi khi có mã thanh toán**, cấu trúc trên SePay phải khớp; bộ lọc tiền tố để trống hoặc chọn `VIAGO`.
- Bảo mật **HMAC-SHA256**; điền Secret Key cùng giá trị `SEPAY_WEBHOOK_SECRET`.
- Bật gửi lại khi server trả HTTP ngoài 2xx nếu phù hợp cấu hình webhook.

API trả HTTP 201 và JSON `{"success":true,...}`. Theo tài liệu SePay hiện tại, webhook mới chấp nhận 2xx cùng `success:true`; một số cấu hình cũ chỉ chấp nhận 201, nên endpoint dùng 201.

Tài liệu chính thức: [tích hợp webhook SePay](https://docs.sepay.vn/tich-hop-webhooks.html).

### Xác thực HMAC-SHA256

SePay gửi `X-SePay-Timestamp` (Unix giây) và `X-SePay-Signature` có dạng `sha256=<hex>`. Backend tính HMAC-SHA256 của `timestamp + '.' + raw body` bằng Secret Key, đối chiếu bằng so sánh constant-time. Nest được bật `rawBody: true` để giữ nguyên bytes của JSON; không dùng JSON đã parse rồi serialize lại.

Timestamp chỉ được lệch tối đa 300 giây so với đồng hồ server. Thiếu/sai header, chữ ký sai, body bị thay đổi hoặc thời gian ngoài cửa sổ này trả 401 trước khi xử lý giao dịch. Thiếu Secret Key hợp lệ trả 503. Chống lặp trong cửa sổ thời gian vẫn dựa trên ID giao dịch duy nhất trong database; retry hợp lệ không xuất vé lần nữa. Thời điểm ký request và thời điểm chuyển tiền là hai kiểm tra riêng: ký mới không làm đơn hết hạn trở lại hợp lệ.

Cấu hình API Key cũ không được dùng làm phương án dự phòng. Khi chuyển từ phiên bản trước, lưu Secret Key HMAC riêng vào `.env`, đổi phương thức trên SePay sang HMAC-SHA256 và điền đúng Secret Key, rồi khởi động lại backend. `SEPAY_MODE=test` dùng thông tin tài khoản/webhook Test mode; `live` dùng cấu hình Live riêng. HMAC không thay thế kiểm tra mã đơn, tài khoản, VA, số tiền và thời hạn.

Tham khảo [định dạng chữ ký SePay](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc). Chạy `npm run test:sepay` để build và kiểm tra chữ ký, raw body Unicode/khoảng trắng, timestamp và cấu hình.

## 4. Kiểm tra trước khi nhận tiền thật

Dùng chức năng **Gửi thử** của SePay để kiểm tra URL, xác thực và định dạng. Sau khi ngân hàng đã liên kết và webhook đúng, kiểm tra luồng chuyển khoản với số tiền và nội dung của một đơn kiểm tra do bạn chủ động tạo. Không tự thay trạng thái đơn thành đã thanh toán trong frontend.

Luồng ứng dụng:

1. Khách chọn **VietQR / Chuyển khoản** trước khi xác nhận đơn.
2. Backend tạo đơn `ChoThanhToanOnline`, thanh toán `VIETQR`/`SePay`, mã chuyển khoản `VIAGO` + 8 chữ số và QR đúng số tiền. Mã được kiểm tra với toàn bộ lịch sử tham chiếu SePay trong cùng transaction Serializable, không tái sử dụng mã của đơn đã thanh toán/hết hạn.
3. Khách chuyển đúng số tiền, tài khoản và nội dung; frontend chỉ đọc trạng thái.
4. Webhook có xác thực kiểm tra mã, ngân hàng, số tiền, thời gian và ghế. Hợp lệ mới xuất vé, ghi thanh toán thành công và cập nhật ghế đã bán trong transaction.
5. Webhook gửi lặp không tạo vé hai lần. Chuyển sai số tiền, sau hạn hoặc không còn ghế thì lưu để đối soát, không tự phát vé.

Giữ chỗ vẫn tối đa 10 phút theo quy tắc hiện có. Thanh toán tại quầy vẫn dùng được cho đơn chọn `counter` và yêu cầu nhân viên xác nhận thu tiền.

Đơn đã tạo trước khi đổi cấu trúc vẫn giữ mã `VG...`; backend tiếp tục nhận webhook cho mã cũ và không sửa QR đang lưu. Khi kiểm thử với bộ lọc `VIAGO` trên SePay, hãy tạo đơn mới và dùng đúng nội dung do API trả về; không tự thay tiền tố trong nội dung của đơn cũ.

## Kiểm tra code không cần ngân hàng thật

```powershell
npm run test:booking
```

Script dùng Supabase thật trong transaction rollback. Phần online chỉ dùng cấu hình kiểm tra trong process test và payload webhook mô phỏng; không sửa `.env`, không gửi chuyển khoản và không gọi ngân hàng. Việc thử code thành công không đồng nghĩa tài khoản SePay thật đã được tạo/liên kết hay có URL webhook công khai.
