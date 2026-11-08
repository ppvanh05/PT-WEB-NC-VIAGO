# Backend trang chủ khách hàng

Trang chủ gọi API `/customer/home`; không còn khởi tạo danh mục chuyến,
khuyến mãi, tin tức hoặc xác nhận thanh toán từ dữ liệu mẫu/localStorage.
Không thêm bảng mới. Các mã và enum nghiệp vụ tiếp tục dùng schema VIAGO.

## Cấu trúc

```text
home/
  home.module.ts
  common/
    home.dto.ts
    home.guard.ts
  catalog/
    home.controller.ts
    home.service.ts
  booking/
    booking.controller.ts
    booking.service.ts
  promotions/
    promotions.controller.ts
    promotions.service.ts
  payments/
    payments.controller.ts
```

`catalog` trả cấu hình, tuyến, chuyến/ghế, đánh giá, thời tiết và dữ liệu
trang chủ. Tin tức gọi `CustomerNewsService` hiện có, chỉ lấy bài đã hiển
thị và đến thời điểm đăng. `booking` quản lý giữ ghế, quote, đơn và vé.
`promotions` kiểm tra điều kiện và ví voucher. `payments` nhận webhook SePay.

## API

| API tương đối | Vai trò |
| --- | --- |
| `GET /` | Thành phố, tuyến nổi bật, khuyến mãi, tin mới, đánh giá, cấu hình |
| `GET /cities`, `/routes`, `/news`, `/reviews` | Dữ liệu từng phần từ CSDL |
| `GET /trips`, `/trips/:id`, `/trips/:id/seats` | Lịch trình và ghế đang bán |
| `GET /promotions?page=1&pageSize=3` | Khuyến mãi công khai, phân trang |
| `GET /vouchers` | Ví voucher của khách đã xác thực |
| `POST /promotions/:code/claim` | Lưu mã công khai vào ví, chống trùng |
| `GET /customer` | Thông tin chính khách đang đăng nhập |
| `GET/POST/DELETE /holds` | Đọc/giữ/trả ghế của cookie phiên |
| `POST /quote` | Tính lại giá ghế và voucher trên server |
| `POST /orders` | Chốt đơn, giữ lượt voucher và tạo yêu cầu thanh toán |
| `GET /orders/pending`, `/orders/:id` | Đơn thuộc phiên; trạng thái thực tế |
| `POST /orders/:id/cancel` | Hủy đơn chưa thanh toán, trả ghế/lượt voucher |
| `GET /orders/:id/payment` | VietQR theo cấu hình ngân hàng thực tế |
| `POST /payments/sepay` | Webhook đã xác thực, đối soát tiền và xuất vé |
| `GET /tickets/:token` | Vé thực theo token tra cứu |
| `POST /orders/:id/print`, `/tickets/:token/print` | Ghi nhận lần in vé |
| `GET /destination/weather` | Dự báo theo nơi/ngày đến, có cache/timeout |

`quote` và `orders` nhận `legs`, `passenger`, `voucher` tùy chọn; `orders`
thêm `key` chống trùng và `terms=true`. Ghế trong payload là `maghechuyen`
thực, không phải nhãn hiển thị A01/1A. Không nhận giá, tổng tiền hoặc mức
giảm do trình duyệt khai báo. Ví dụ:

```json
{
  "legs": [{
    "tripId": "MA_LICH_TRINH",
    "seats": ["MA_GHE_CHUYEN"],
    "doubleSeats": [],
    "pickupId": "MA_DIEM_DON",
    "dropoffId": "MA_DIEM_TRA"
  }],
  "passenger": {"name": "Nguyễn Văn A", "phone": "0901234567"},
  "voucher": "MA_KHUYEN_MAI"
}
```

## Điều kiện voucher

Đọc `khuyen_mai`, `khuyen_mai_hang`, `khuyen_mai_tuyen_duong`,
`voucher_khach_hang`, `su_dung_khuyen_mai` và thông tin khách/đơn hiện có.
Kiểm tra trạng thái, thời gian hiệu lực, phạm vi đặt vé, tuyến bao gồm/loại
trừ, giá trị đơn tối thiểu, ngày trong tuần, hạng thành viên, đơn đầu tiên,
tháng sinh, quyền được cấp voucher, số lượt tổng và giới hạn theo khách/SĐT.

Giảm theo phần trăm hoặc số tiền, giới hạn bởi mức giảm tối đa và tổng giá
vé. Mã quà tặng không giảm trực tiếp giá vé. Mã được chuẩn hóa chữ hoa ở
server. Khuyến mãi hết hạn/hết lượt đã dùng không nằm trong danh sách công
khai; các lượt đang giữ được phản ánh trong `remainingUses`.

Quote chỉ kiểm tra, không tiêu thụ voucher. Tạo đơn giữ lượt trong
transaction Serializable; thanh toán thành công mới tăng số đã dùng. Hủy
hoặc hết hạn giải phóng lượt và ví voucher đang giữ. Hai chiều khứ hồi dùng
một lượt voucher, phân bổ giảm giá theo giá vé từng chiều.

## Frontend và xác thực

`HomeApiService` gọi API cùng origin, gửi cookie phiên; proxy dev đã có
`/customer/home` và `/customer/home/**`. Cần khởi động lại `ng serve` khi
thay proxy. `BookingService` là adapter API; bản nháp lưu sessionStorage
để khôi phục giao diện. CSDL là nguồn giá, ghế, đơn, voucher và trạng thái
thanh toán. Không dùng dữ liệu đơn/chuyến giả đã lưu từ bản demo.

Khuyến mãi công khai có thể sao chép và áp dụng cho khách vãng lai khi đủ
điều kiện. Voucher dành riêng/hội viên và lưu ví yêu cầu Bearer phiên
backend: token ngẫu nhiên được lưu hash trong `phien_dang_nhap`, tài khoản
và khách còn hoạt động. Không dùng `user.id`, số điện thoại hay Firebase ID
do frontend tự khai thay xác thực. Adapter đọc token backend từ khóa
sessionStorage `viago_backend_access_token`; luồng đăng nhập backend thật
cần cấp phiên này. Đăng nhập demo/Firebase hiện có chưa làm điều đó.

Khi chưa có phiên backend, trang chủ chỉ cho sao chép mã, không giả báo đã
lưu vào ví. Form voucher yêu cầu thông tin hành khách và điểm đón/trả trước
khi báo áp dụng thành công; mức giảm được trả về từ `/quote`.

## Thanh toán và giới hạn hiện tại

Chỉ phương thức backend báo `configured=true` được hiện ra. Backend yêu
cầu đủ `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME`,
`SEPAY_BANK_NAME`, `SEPAY_WEBHOOK_API_KEY` trước khi tạo đơn cần chuyển
tiền. Đơn được giảm về 0 có thể chốt mà không gọi ngân hàng. Frontend chỉ
poll trạng thái và kiểm tra lại khi khách bấm “Tôi đã thanh toán”, không tự
phát vé. QR chuyển khoản, mã vé và QR vé đều lấy từ backend.

Trong lần rà soát này, cấu hình thanh toán thực tế chưa đủ. Cần điền cấu
hình, thiết lập webhook trên SePay và thử giao dịch thật trước khi mở bán
online có thu tiền. Các màn hình ngoài trang chủ như hồ sơ, tra cứu, tin
tức chi tiết, đồ thất lạc có luồng riêng; thay đổi này không viết lại toàn
bộ các màn hình đó.

Đã kiểm tra API bằng PostgreSQL thật trong transaction rollback: dữ liệu
trang chủ, voucher hết hạn/hết lượt, phân quyền, lưu ví chống trùng, giới
hạn mức giảm, chống tạo đơn trùng, giải phóng lượt khi hủy và vé đơn tổng
tiền 0. Dữ liệu kiểm tra không được commit. File kiểm tra tạm được dọn sau
khi hoàn tất; các bài kiểm thử frontend có sẵn được cập nhật theo API mới.
