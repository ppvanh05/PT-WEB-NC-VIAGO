# Đặt vé admin và thanh toán SePay

Luồng FE: chọn điểm đi/đến, loại xe và ngày → chọn chuyến → giữ ghế tại server → nhập thông tin và điểm đón/trả → lấy báo giá → tạo đơn → thu tiền mặt hoặc chờ SePay → xuất vé.

Không tự tạo/cập nhật `khach_hang`. Nếu số điện thoại khớp hồ sơ đang hoạt động, đơn liên kết hồ sơ đó; thông tin nhập được lưu trên đơn. Không bổ sung API in vé, đổi ghế hoặc hoàn tiền trong phạm vi này.

## API

Tất cả API dưới đây yêu cầu `Authorization: Bearer <token admin>`, trả `Cache-Control: no-store` và kiểm tra dữ liệu đầu vào. Prefix `/admin/booking-management`.

| Method/path | Đầu vào | Đầu ra / bảng chính |
| --- | --- | --- |
| GET `/options` | Không | Phương thức, cờ cấu hình, môi trường thanh toán |
| GET `/trips/:id/seats` | Mã lịch trình | Sơ đồ ghế, giá, trạng thái; chỉ đọc `lich_trinh`, `tuyen_xe`, `xe`, `ghe_chuyen`, `ghe`, `don_hang`, `ve_xe`, không dọn/ghi dữ liệu |
| POST `/holds` | `holdId?` UUID, `tripId`, `seatIds` (1–5 ghế duy nhất) | `holdId`, `seatIds`, `releasedSeatIds`, `expiresAt`, `serverTime`; chỉ cập nhật ghế thay đổi trong `ghe_chuyen`; hết hạn đơn liên quan nếu cần |
| DELETE `/holds/:holdId` | UUID giữ ghế | `released: true`; trả ghế chưa gắn đơn trong `ghe_chuyen` |
| POST `/quote` | Payload bên dưới | `subtotal`, `discount`, `insurance: 0`, `total`, `currency`; kiểm tra ghế/điểm/khuyến mãi |
| POST `/orders` | Quote + `idempotencyKey`, `expectedTotal`, `source`, `note?`, `payment` | Đơn, trạng thái, vé và QR thanh toán nếu có |
| GET `/orders` | `page`, `pageSize`, `status=all\|pending`, `search?` | Danh sách đơn do admin tạo và phân trang |
| GET `/orders/:id` | Mã đơn | Đơn, thông tin khách, tổng tiền, trạng thái, `requiresReview`, vé, `transfer` |
| POST `/orders/:id/confirm-payment` | UUID `idempotencyKey`, `receivedAmount` | Chỉ thu tiền mặt; số tiền phải đúng tổng đơn; xác nhận lặp trả kết quả cũ |
| POST `/orders/:id/cancel` | `reason` | Hủy đơn chưa thanh toán, trả ghế và lượt giữ khuyến mãi |

Khi xem `GET /orders/:id`, backend chỉ xử lý hết hạn trong nhóm đơn đang mở (gồm hai chiều nếu có), không chạy dọn toàn hệ thống. Thông tin chuyến của các chiều được đọc chung một truy vấn; cấu trúc phản hồi và số ghế trống vẫn giữ nguyên. FE mở hộp chi tiết ngay với thông tin tóm tắt từ danh sách, hiển thị trạng thái tải và chỉ bật thao tác sau khi nhận chi tiết mới. Đóng/chuyển đơn hủy yêu cầu cũ; phản hồi cũ không được ghi đè đơn đang xem.

Đo phần đọc chuyến mà không ghi dữ liệu: build rồi chạy `node test/booking-latency.readonly.cjs`. Script so sánh dữ liệu hiển thị, số truy vấn và thời gian; kết quả không bao gồm xác thực hay toàn bộ HTTP request.

Quote:

```json
{
  "holdId": "UUID do API holds cấp",
  "seatIds": ["GC042"],
  "customer": { "name": "Nguyễn Văn An", "phone": "0901234567" },
  "pickupId": "DD005",
  "dropoffId": "DD013",
  "doubleSeatIds": [],
  "voucherCode": "MÃ_THỰC_TẾ_NẾU_CÓ"
}
```

`seatIds` là lựa chọn thực tế của FE; nếu khác danh sách đang giữ, báo giá/tạo đơn trả 409. Trường này tùy chọn để tương thích client cũ, FE admin luôn gửi. Khi không dùng mã thì bỏ `voucherCode`; email khách là tùy chọn. Tạo đơn thêm:

```json
{
  "idempotencyKey": "UUID cho một lần xác nhận đặt vé",
  "expectedTotal": 160000,
  "source": "TaiQuay",
  "note": "Khách có một vali",
  "payment": { "method": "VIETQR", "confirmReceived": false }
}
```

`source`: `TaiQuay` hoặc `Hotline`. `method`: `TIEN_MAT` hoặc `VIETQR`. `confirmReceived: true` chỉ dùng với tiền mặt tại quầy. Gửi lại nguyên payload và cùng key khi mất phản hồi; không tạo key mới cho lần retry. Nếu tổng tiền thay đổi, trả 409 với `code: PRICE_CHANGED` và `total` mới; phải báo giá/xác nhận lại.

Đơn chưa trả tiền có `status: pending`, `tickets: []`; chuyển khoản có `transfer` gồm `qrUrl`, tài khoản, số tiền, nội dung, môi trường. Đơn thành công có `status: paid`, `transfer: null`, danh sách vé cùng mã QR và số tiền phân bổ. Hủy/hết hạn có `status: cancelled/expired`.

Giá chuẩn lấy từ `ghe_chuyen.giaghe`; lựa chọn phòng đôi chỉ áp dụng ghế `CabinDoi`, nhân đôi theo nghiệp vụ khách hàng hiện có. Không thêm phụ thu FE. Một người liên hệ dùng chung cho đơn; mỗi ghế sinh một vé sau khi thanh toán. Khuyến mãi được kiểm tra theo số điện thoại/hồ sơ đã có, không sửa hồ sơ.

## Giao dịch và giữ chỗ

- Lượt giữ gắn với nhân viên từ token và UUID từng form; không thể lấy lượt giữ của người khác. Tối đa 5 ghế/form, tối đa 10 phút hoặc cấu hình chuyến nếu ngắn hơn; bị giới hạn bởi giờ đóng bán. Đổi ghế/tạo đơn không gia hạn.
- Đơn admin dùng khóa nội bộ `HOME:ADM...` để tái sử dụng nghiệp vụ và webhook đã có. Khách hàng không thể truy cập phiên admin bằng cookie khách hàng.
- Tạo đơn ghi `don_hang`, `thanh_toan`, liên kết `ghe_chuyen`, giữ lượt `su_dung_khuyen_mai`/`voucher_khach_hang` nếu có, và nhật ký.
- Xác nhận tiền ghi `thanh_toan`, `don_hang`, `ghe_chuyen`, tạo `ve_xe`, `phan_bo_thanh_toan_ve`, hoàn tất khuyến mãi và nhật ký trong cùng transaction Serializable có retry.
- Bộ dọn chạy mỗi 30 giây; các thao tác nghiệp vụ cũng kiểm tra hạn. Hủy/hết hạn trả cả ghế và lượt giữ voucher. Không hủy đơn đã thanh toán qua API hủy giữ chỗ.
- API danh sách quầy hiện có cũng trả đơn admin, gồm QR chưa trả tiền. FE danh sách dùng nguồn đặt thực tế và mở cùng chi tiết đơn/QR.

## Phản hồi giao diện và tải dữ liệu ghế

- Khi chọn ghế, FE đổi màu cam ngay và hiển thị đang xác nhận. Gom thao tác trong 120 ms, gửi tối đa một request giữ ghế cùng lúc; nếu có thao tác mới trong lúc chờ thì gửi lựa chọn mới sau phản hồi trước. Thông tin khách vẫn có thể nhập trong lúc đồng bộ; báo giá/tạo đơn chỉ được bật khi server xác nhận đủ ghế.
- Server từ chối rõ ràng (ví dụ 409) thì quay về lựa chọn đã xác nhận và cập nhật lại sơ đồ. Khi lỗi mạng chưa biết kết quả, giữ lựa chọn trên UI, chặn đặt vé và cho thử lại cùng UUID. Phản hồi của form/chuyến cũ bị bỏ qua; bỏ form đợi request giữ ghế đang chạy rồi mới trả ghế.
- GET seats chỉ đọc một truy vấn, tự tính ghế hết hạn là trống; bộ dọn riêng tiếp tục giải phóng dữ liệu. Hold đọc ghế yêu cầu cùng các ghế của draft, giữ nguyên ghế không đổi và hạn giữ ban đầu. Chỉ hết hạn các đơn liên quan khi cần thu hồi ghế, không chạy dọn toàn hệ thống ở mỗi lần chọn.
- Không tải lại sơ đồ sau một lần giữ ghế thành công: áp dụng thay đổi tại FE. Tự cập nhật mỗi 30 giây tính từ lúc request trước hoàn tất, tránh request chồng nhau, tạm dừng khi tab ẩn hoặc đang đồng bộ ghế/tạo đơn. Request đọc cũ được hủy/bỏ qua khi chuyển chuyến hoặc bắt đầu chọn ghế.

Đo đọc database thực tế ngày 13/11/2026 bằng `node test/booking-latency.readonly.cjs`, cùng một chuyến, 3 mẫu sau làm nóng, transaction chỉ đọc:

| Phần đọc | Số query/mẫu | Các mẫu (ms) |
| --- | --- | --- |
| Đọc đầy đủ chuyến cũ | 7 | 1388, 1399, 1333 |
| Đọc sơ đồ ghế mới | 1 | 196, 191, 197 |

Đây là phần đọc database, chưa gồm xác thực, transaction giữ ghế hay HTTP; không phải số đo toàn bộ endpoint hoặc cam kết độ trễ production.

## SePay Test mode

Backend tái sử dụng `POST /customer/home/payments/sepay`, xác thực HMAC-SHA256 qua `X-SePay-Signature` và `X-SePay-Timestamp`. Chữ ký tính trên `timestamp + '.' + raw body`, timestamp được lệch tối đa 300 giây. Không dùng FE để xác nhận đã nhận chuyển khoản.

OCB cá nhân dùng VA chính thức: QR nhận tiền theo `VIETQR_ACCOUNT_NO` (VA), `SEPAY_ACCOUNT_NO` chứa tài khoản chính mà webhook báo trong `accountNumber`. Backend kiểm tra cả tài khoản chính và `subAccount` đúng VA, từ chối giao dịch sai VA trước khi ghi dữ liệu. Khi nhận trực tiếp trên tài khoản, để trống `SEPAY_ACCOUNT_NO`. Xem hướng dẫn Live trong `docs/sepay-setup.md`.

Đặt riêng trong `.env` của môi trường phát triển:

```dotenv
SEPAY_MODE=test
VIETQR_BANK_ID=
VIETQR_ACCOUNT_NO=
VIETQR_ACCOUNT_NAME=
SEPAY_ACCOUNT_NO=
SEPAY_BANK_NAME=
SEPAY_WEBHOOK_SECRET=
```

Điền thông tin tài khoản thử nghiệm và khóa webhook riêng lấy từ SePay Test mode; khóa tối thiểu 32 ký tự. Không đưa khóa vào FE. Khởi động lại backend khi đổi cấu hình. `SEPAY_MODE` chỉ gắn nhãn thử nghiệm trên API/FE; tài khoản và webhook Test mode phải được cấu hình đúng trên SePay. Khi không đặt `SEPAY_MODE=test`, API gắn nhãn `live`.

1. Bật Test mode tại SePay, tạo tài khoản ngân hàng thử nghiệm và webhook **tiền vào**.
2. Cấu hình webhook trỏ đến HTTPS công khai của backend + `/customer/home/payments/sepay`, chọn HMAC-SHA256 và Secret Key trùng `SEPAY_WEBHOOK_SECRET` của backend. Localhost cần tunnel riêng.
3. Cấu hình mã thanh toán trên SePay là `VIAGO[0-9]{6,8}` (tiền tố `VIAGO`, theo sau 6–8 chữ số). Có thể bật **Chỉ gửi khi có mã thanh toán** và chọn tiền tố `VIAGO` khi lọc mã.
4. Tạo đơn admin chọn chuyển khoản QR. Trên SePay mô phỏng giao dịch đúng tài khoản, số tiền và nội dung `VIAGO` + 8 chữ số mà đơn trả về, ví dụ `VIAGO12345678`. Không chuyển tiền thật khi đang thử nghiệm.
5. FE tự đọc lại đơn mỗi 4 giây khi mở chi tiết; chỉ khi webhook hợp lệ mới thấy đã thanh toán/vé.
6. Thử thêm sai số tiền, hết hạn và gửi lại webhook. Backend lưu giao dịch bất thường ở `DangXuLy`, có mã lỗi để đối soát, không xuất thêm vé.

Test mode tách giao dịch ngân hàng nhưng API đặt vé vẫn ghi database đã cấu hình; dùng database phát triển cho thử nghiệm. Chuyển Live cần tài khoản/ngân hàng/webhook Live riêng và kiểm tra kết nối thực tế.

Tài liệu: [SePay Test mode](https://developer.sepay.vn/vi/tien-ich-khac/test-mode), [Webhooks](https://developer.sepay.vn/vi/sepay-webhooks). Tham khảo thêm `docs/sepay-setup.md`.

## Kiểm thử

`npm run test:admin-booking`: dùng dữ liệu nền của database, tạo fixture trong transaction luôn rollback; không gọi ngân hàng và không tăng sequence mã nghiệp vụ thật. Bao phủ xác thực, ghế xung đột/khác chủ, giá, chống trùng, tiền mặt, QR, webhook giả/lặp/sai tiền/đến muộn, hết hạn, hủy và không tạo khách mới.

Sau build, `node test/admin-booking.integration.cjs --sepay` chạy riêng các nhóm SePay/OCB, QR, số tiền, webhook lặp và tiền đến muộn, với cùng cơ chế rollback.

`npm run build` rồi `node --test test/seat-inventory.unit.cjs`: kiểm tra inventory chỉ đọc, hết hạn logic, cập nhật phần ghế thay đổi, chống giành ghế và bảo vệ ghế đã có vé. Integration admin kiểm tra thêm dữ liệu hết hạn không bị ghi khi GET seats, giữ nguyên timestamp ghế không đổi, hạn giữ và danh sách ghế khớp báo giá/tạo đơn.

FE: `node node_modules/@angular/cli/bin/ng.js test --watch=false "--include=src/app/featured/admin/booking/**/*.spec.ts"`. Sau build, `node scripts/admin-booking.smoke.cjs` kiểm tra trình duyệt với API mô phỏng chậm 1,5 giây: ghế cam trước khi giữ ghế phản hồi, không gọi lại seats sau giữ ghế thành công, rồi tạo đơn QR và nhận vé sau thanh toán mô phỏng.

Sau build, `node --test test/sepay.unit.cjs` kiểm tra cấu hình VA, chống nhận sai VA/tài khoản/ngân hàng, chế độ Live/Test, giữ trường `subAccount` qua validation, mã `VIAGO` có số 0 ở đầu, tránh trùng tham chiếu, tương thích mã cũ và từ chối nội dung chứa nhiều mã khác nhau. Integration admin kiểm tra thêm QR OCB chứa VA, webhook thiếu/sai VA không xuất vé, webhook hợp lệ/lặp chỉ xuất vé một lần. Các cấu hình Live trong integration là dữ liệu giả nằm trong process test, không liên kết ngân hàng thật.

`node --test test/sepay-hmac.unit.cjs`: kiểm tra HTTP thực qua bộ parser Nest với raw body, chữ ký hợp lệ, sai số tiền/body, Unicode/khoảng trắng, timestamp sai/cũ/tương lai, biên lệch 5 phút, header thiếu/sai/trùng, không dùng lại API Key và không bỏ qua DTO validation. Cả integration admin và khách hàng gửi webhook HMAC đã ký; kiểm tra thanh toán lặp vẫn chỉ xuất vé một lần.
