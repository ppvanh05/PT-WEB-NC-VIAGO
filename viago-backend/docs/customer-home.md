# Đặt vé customer và thanh toán tại quầy

Cập nhật 08/11/2026: đã khôi phục VietQR/SePay theo yêu cầu mới nhất. Luồng là tìm chuyến → giữ ghế → kiểm tra thông tin và chọn phương thức → tạo đơn → thanh toán chuyển khoản hoặc tại quầy. Chuyển khoản tự động cần cấu hình ngân hàng/webhook; tại quầy vẫn dùng được khi chưa cấu hình online. Xem [hướng dẫn SePay](sepay-setup.md).

## Các API customer

Tiền tố `/customer/home`. Giá, lịch trình, ghế, đơn và vé lấy từ Supabase qua Prisma; frontend không tự tạo đơn/vé trong localStorage.

| API | Kết quả |
| --- | --- |
| `GET /options`, `GET /` | Cấu hình và dữ liệu trang chủ; phương thức `counter` khả dụng |
| `GET /cities`, `/routes`, `/news`, `/reviews` | Dữ liệu trang chủ |
| `GET /trips`, `/trips/:id`, `/trips/:id/seats` | Tìm chuyến đang bán và ghế còn hợp lệ |
| `GET/POST/DELETE /holds` | Đọc, giữ hoặc trả ghế thuộc cookie phiên |
| `POST /quote` | Kiểm tra điểm đón/trả, ghế đang giữ, hành khách và tính lại giá/voucher |
| `POST /orders` | Lưu đơn và thanh toán chờ theo `method: vietqr` hoặc `counter` |
| `GET /orders/:id/payment` | Thông tin/QR chuyển khoản đúng số tiền và mã, yêu cầu đúng phiên đặt đơn |
| `POST /payments/sepay` | Webhook API Key, HTTP 201; đối soát và xuất vé khi tiền vào hợp lệ |
| `GET /orders/pending`, `/orders/:id` | Khôi phục và theo dõi đơn của phiên khách |
| `POST /orders/:id/cancel` | Hủy đơn chưa thanh toán, giải phóng ghế/voucher |
| `GET /tickets/:token` | Đọc vé đã xuất bằng token riêng |
| `POST /orders/:id/print`, `/tickets/:token/print` | Ghi nhận lần in vé đã thanh toán |
| `GET /promotions`, `/vouchers`, `POST /promotions/:code/claim` | Khuyến mãi công khai và ví voucher |
| `GET /customer` | Điền nhanh hồ sơ của tài khoản có phiên backend thật |
| `GET /destination/weather` | Thời tiết nơi đến, không ảnh hưởng tính đúng của đặt vé |

Không có endpoint customer tự xác nhận đã thu tiền. Khi thiếu cấu hình, `vietqr` trả `configured:false`; lựa chọn vẫn hiển thị kèm thông báo rõ lý do. API tạo đơn chuyển khoản cần thu tiền sẽ từ chối và rollback; đơn tại quầy không phụ thuộc ngân hàng.

Cookie `viago_home` HttpOnly xác định phiên khách vãng lai. Khách có thể tự nhập thông tin và đặt vé mà không cần đăng nhập. Đọc đơn từ phiên khác trả 404. Xác thực thành viên vẫn cần cho ví/hạng/voucher riêng; tài khoản mô phỏng ở phần đăng nhập hiện có không thay thế token backend.

## Vòng đời dữ liệu

1. Giữ ghế cập nhật `ghe_chuyen` sang `DangGiu`, lưu phiên và hạn giữ. Khách khác không được giữ/quote cùng ghế.
2. Quote dùng giá `giaghe` thực, không tin tổng tiền phía trình duyệt. Mã giảm giá là tùy chọn; mã rỗng/sai không khóa nút tiếp tục. Mã chưa được áp dụng thì giá chưa có giảm. Nếu mã đã áp dụng thay đổi khi kiểm tra lại, giao diện yêu cầu xem lại giá.
3. Xác nhận đặt vé ghi `don_hang`, liên kết ghế, hành khách, điểm đón/trả, tiền vé và giảm giá. `counter` tạo `ChoThanhToanTrucTiep` và thanh toán `TIEN_MAT`/`TaiQuay`; `vietqr` tạo `ChoThanhToanOnline` và `VIETQR`/`SePay`. Thanh toán đều chờ, chưa xuất vé đã thanh toán. DTO mặc định `counter` để tương thích client cũ; frontend gửi phương thức đã chọn rõ ràng.
4. Với tại quầy, nhân viên xác nhận đã nhận đủ tiền. Với chuyển khoản, webhook SePay có xác thực và đúng ngân hàng, mã, số tiền, thời gian, ghế mới xác nhận. Cả hai cập nhật thanh toán `ThanhCong`, đơn `DaThanhToan`, ghế `DaBan`, tạo `ve_xe`, `phan_bo_thanh_toan_ve` và nhật ký trong transaction. Ghi nhân viên thu cho tiền mặt. Customer chỉ thấy vé/token in/tra cứu sau xác nhận này; webhook trùng không xuất vé hai lần, tiền vào sai điều kiện được lưu đối soát.
5. Hủy/hết hạn giải phóng ghế và lượt voucher đang giữ; không phát vé. Đơn đã thanh toán cần quy trình hoàn/hủy riêng.

Đơn giảm hợp lệ về 0 được xác nhận và xuất vé ngay bởi server, không ghi nhận thu tiền mặt thực tế.

Giữ chỗ tối đa 10 phút theo quy tắc hiện có, còn phụ thuộc hạn đóng bán và cấu hình chuyến. Trang customer hiển thị rõ thời hạn. Các API giữ/đọc đơn và danh sách admin xử lý những đơn đã hết hạn; tìm chuyến cũng tính ghế giữ đã hết hạn là khả dụng. Chưa thay chính sách thành giữ tới ngày đi.

`key` UUID chỉ là khóa chống gửi lặp của request; các mã nghiệp vụ mới cấp qua sequence theo dạng `DH...`, `TT...`, `VE...`, `SD...`, `NK...`. Các mã cũ được giữ nguyên. `TT` được khởi tạo trên cả tin tức và thanh toán để tránh trùng giá trị đang có; sequence có khoảng trống sau rollback là bình thường.

## Thu tiền trong admin

Vào **Quản lý đặt vé → Quản lý vé đã đặt** (`/admin/tickets/list`), khối **Đơn đặt vé từ khách hàng**:

- Danh sách, tìm theo mã/tên/SĐT, lọc chờ thu hoặc tất cả lấy từ API thật.
- Chọn **Thu tiền**, kiểm tra số tiền và xác nhận đã nhận đủ tiền.
- Endpoint `GET /admin/counter-orders` và `POST /admin/counter-orders/:id/confirm` yêu cầu phiên nhân viên thực. Danh tính thu tiền lấy từ phiên, số tiền lấy từ đơn; không lấy số tiền hoặc mã nhân viên do client tự khai.
- Xác nhận lặp không tạo thêm vé. Đơn hủy/hết hạn hoặc chuyến/ghế không còn hợp lệ bị từ chối.

Khối này liên thông đơn customer thật. Phần danh sách vé quản trị cũ bên dưới vẫn còn dữ liệu/localStorage riêng; đợt này không chuyển toàn bộ chức năng sửa/hủy/hoàn của màn hình quản trị cũ sang backend.

## Kiểm tra đã thực hiện

- 9 nhóm integration với Supabase: cấu hình phương thức; tìm/giữ ghế; quote/voucher tùy chọn; lưu đơn/tiền chờ và chống gửi lặp; phân quyền/thu tiền/xuất vé; hủy; hết hạn; khứ hồi; QR và webhook SePay mô phỏng có xác thực, chống trùng và sai số tiền.
- Kiểm tra trực tiếp các bảng `don_hang`, `ghe_chuyen`, `thanh_toan`, `ve_xe`, `phan_bo_thanh_toan_ve`, `nhat_ky_he_thong` trong transaction. Xác nhận đã ghi đúng dữ liệu; toàn bộ dữ liệu thử, phiên và cập nhật ghế được rollback, không phát sinh chuyển tiền.
- 27 test frontend phạm vi home/booking/counter đạt. Build backend và production frontend được kiểm tra riêng.
- Cấu hình online được kiểm tra bằng biến môi trường riêng trong process test, không sửa `.env`, không gọi ngân hàng hoặc tạo tài khoản SePay thật. Khi người dùng chưa tạo/liên kết tài khoản và cấu hình URL công khai, chưa thể kết luận nhận tiền online thực tế hoạt động.
- Hai cảnh báo CSS cũ ở đặt vé mới và báo cáo hủy không chặn build. Không kết luận toàn bộ test dự án đều xanh hoặc đã kiểm tra giao diện trực quan trong browser.

Chạy lại (cần `.env` DB đúng và quyền mạng):

```powershell
npm run db:business-ids
npm run test:booking
```

Integration test dùng transaction có savepoint cho lỗi request, rồi rollback toàn bộ. Không commit đơn thử, không gửi email/SMS và không chuyển tiền. Không dùng nút thu tiền trên đơn thật để thử.
