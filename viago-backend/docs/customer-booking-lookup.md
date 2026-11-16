# Đặt vé và tra cứu của khách hàng

Đặt vé dùng API `/customer/home` và token `viago_customer_access_token` từ đăng nhập. Lịch trình lấy tuyến/chuyến/điểm dừng thật qua API công khai; không lấy dữ liệu mẫu.

## Tra cứu

- Đã đăng nhập: tự tải các đơn liên kết mã khách hàng hoặc số điện thoại của tài khoản backend, gồm online/tại quầy/hotline.
- Khách chưa đăng nhập: yêu cầu OTP `TraCuuVe`, xác thực rồi đổi proof một lần lấy cookie HttpOnly có hạn 30 phút. Khách chưa có tài khoản vẫn dùng được.
- Đổi sang đơn khác luôn đọc lại dữ liệu từ server. Không dùng `viago_orders` trong localStorage.

| API | Công việc |
| --- | --- |
| POST `/customer/auth/otp/request` | `{phoneNumber, purpose:'TraCuuVe'}` → challengeId, expiresAt |
| POST `/customer/auth/otp/verify` | `{challengeId, code}` → verificationToken |
| POST `/customer/ticket-lookup/session` | `{phoneNumber, verificationToken}` → cookie phiên tra cứu |
| DELETE `/customer/ticket-lookup/session` | Thu hồi phiên tra cứu |
| GET `/customer/ticket-lookup/orders?page=1` | Danh sách/phân trang trong phạm vi được phép xem |
| GET `/customer/ticket-lookup/orders/:id` | Chi tiết, version, quyền sửa và điểm hợp lệ |
| PATCH `/customer/ticket-lookup/orders/:id` | `{version, email?, pickupId?, dropoffId?}` |
| POST `/customer/ticket-lookup/orders/:id/tickets/:ticketId/print` | Xác thực vé trả dữ liệu mới và ghi nhận yêu cầu in |

Chỉ sửa email liên hệ (chuỗi rỗng để xóa) và điểm đón/trả của đúng chuyến, theo từng chiều. Tên, số điện thoại, chuyến, ghế, giá bị từ chối trong DTO. Backend kiểm tra còn ít nhất 2 giờ, giới hạn `gioihanchinhsua`, version và trạng thái đơn khi lưu. Lưu không thay đổi không tính thêm lượt. Metadata đặt vé và các vé còn hiệu lực được cập nhật cùng transaction với nhật ký.

Chỉ in vé đã thanh toán, chưa hủy. Trình duyệt mở bản in/lưu PDF; tải PNG cũng lấy dữ liệu mới trước khi xuất. Bộ đếm là số yêu cầu in/xuất, không chứng minh máy in đã in giấy.

## OTP test

Trong `.env` của backend phát triển đặt `ACCOUNT_OTP_MODE=test`, sau đó khởi động lại backend. Backend ghi mã ngẫu nhiên vào terminal:

```text
[VIAGO OTP TEST] <số điện thoại> TraCuuVe: <mã 6 chữ số>
```

Mã có hạn 3 phút, tối đa 5 lần nhập sai, gửi lại sau 60 giây và tối đa 5 yêu cầu/giờ/số điện thoại. Không trả mã trong API. `NODE_ENV=production` không cho dùng chế độ test; cần adapter SMS thật. Không đưa mã cố định vào FE.

## Database và kiểm tra

Chạy `npx prisma db execute --file prisma/sql/customer-ticket-lookup.sql --schema prisma/schema.prisma` khi cài môi trường mới, rồi sinh Prisma Client. SQL thêm bảng phiên, chỉ mục và bật RLS; bảng phiên chỉ được backend truy cập.

Sau build: `node test/customer-lookup.integration.cjs`. Kiểm thử dùng transaction rollback, không gửi SMS hoặc tiền thật.

FE sau build: `node scripts/customer-lookup.smoke.cjs`. Kiểm tra trình duyệt với API fixture cho cả khách đăng nhập và khách dùng OTP, sửa email và in vé.

API đọc/gửi đánh giá cũ cũng yêu cầu quyền từ tài khoản hoặc phiên tra cứu; số điện thoại trong query/body không còn là bằng chứng sở hữu đơn. Hủy/hoàn tiền không nằm trong tính năng này.
