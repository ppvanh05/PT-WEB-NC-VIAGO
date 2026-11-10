# Backend tài khoản, hồ sơ và nhật ký

## Phạm vi

Backend NestJS/Prisma và frontend Angular đã kết nối cho `customer/auth`,
`customer/profile`, `admin/auth`, `admin/employees`, `admin/customers`,
`admin/activity-logs`. Không nhập dữ liệu mẫu localStorage vào Supabase,
không reset mật khẩu hay đổi quyền tài khoản có sẵn khi kiểm thử.

Các frontend đã đối chiếu:

| Chức năng                                     | Frontend thực tế                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| Đăng ký, đăng nhập, OTP, quên mật khẩu        | `src/app/auth/auth-modal`, `core/services/auth.service.ts`                      |
| Hồ sơ, bảo mật, thiết bị, lịch sử vé, voucher | `featured/customer/profile`, `auth/security-settings-modal`                     |
| Đăng nhập quản trị                            | `featured/admin/auth/login`, `core/services/admin-session.service.ts`           |
| Nhân viên                                     | `featured/admin/staff/staff-account-management` (route `/admin/staff/accounts`) |
| Khách hàng                                    | `featured/admin/customers/customer-account-management`                          |
| Nhật ký                                       | `featured/admin/logs/activity-log`, `core/services/activity-log.service.ts`     |

`featured/admin/employees/employee-account-management` và
`featured/admin/activity-logs` là các folder placeholder, không phải UI đầy đủ.

## Kết quả đối chiếu Supabase ngày 09/11/2026

Đọc `information_schema.columns` và so sánh với Prisma DMMF: **22/22 bảng tồn tại,
không thiếu cột được khai báo trong schema**:

`tai_khoan`, `khach_hang`, `nhan_vien`, `vai_tro`, `quyen_han`,
`nhan_vien_quyen_han`, `phien_dang_nhap`, `otp`, `nhat_ky_he_thong`,
`bang_hang_thanh_vien`, `dac_quyen_hang_thanh_vien`, `don_hang`, `ve_xe`, `ghe_chuyen`, `ghe`, `lich_trinh`,
`tuyen_xe`, `xe`, `danh_gia`, `tep_danh_gia`, `voucher_khach_hang`, `khuyen_mai`.

Danh mục vai trò thật: `VT001 KhachHang`, `VT002 NhanVienBanVe`,
`VT003 NhanVienDieuPhoi`, `VT004 BanQuanLy`, `VT005 QuanTriVien`.
**Chưa có vai trò Nhân viên CSKH** như frontend. Nếu cần chọn vai trò riêng này,
nhóm cần bổ sung một dòng vào `vai_tro`; backend chưa tự thêm.

36 quyền thực tế `Q001`–`Q036` đã tồn tại. Các checkbox module của frontend
(`datve`, `baocao`, ...) là nhóm UI, không phải mã quyền database. Phải lấy danh
mục qua endpoint `options` và gửi mã `Qxxx`, không lưu nguyên checkbox alias.

Không thiếu bảng OTP; phần còn thiếu để đăng ký/quên mật khẩu/2FA hoạt động là
**dịch vụ gửi SMS** và các biến cấu hình adapter, không phải schema Supabase.
Chưa có kênh OTP email trong triển khai này; không giả lập email/OTP trên client.

## Khởi động và kiểm tra

Tại `viago-backend`, sau khi điền `.env`:

```powershell
npm.cmd ci
npm.cmd run prisma:generate
npm.cmd run start:dev
```

`PrismaService` tự thêm `pgbouncer=true` trong bộ nhớ khi URL dùng cổng `6543`,
khắc phục lỗi prepared statement `42P05` của transaction pooler. Không sửa `.env`.

```powershell
npm.cmd run test:accounts             # build + HTTP/security, database giả lập
npm.cmd run accounts:schema:audit     # chỉ đọc metadata và danh mục Supabase
npm.cmd run test:accounts:readonly    # build + SELECT dữ liệu Supabase thực tế
```

Hai lệnh cuối cần kết nối mạng/database và chỉ đọc dữ liệu. Kiểm tra trình duyệt
tùy chọn `npm.cmd run test:accounts:browser` dùng bản ghi QA tạm trong database thật
và dọn sạch trong `finally`, không sửa tài khoản có sẵn, không gửi SMS/email.

## Quy ước API

API backend: `http://localhost:3000`. Từ Angular dùng `/api/...`, ví dụ
`/api/customer/auth/login`; proxy hiện có bỏ `/api` khi chuyển tới backend.

API được bảo vệ nhận `Authorization: Bearer <token>`. Token ngẫu nhiên chỉ trả
khi đăng nhập thành công, database chỉ lưu SHA-256 của token. Không gửi
`passwordHash` hay mật khẩu từ dữ liệu mẫu frontend vào API profile.
Đăng ký/đăng nhập nhận password thật; server băm scrypt. Khi deploy phải dùng HTTPS.

Các giá trị enum gửi về/gửi lên theo database:

| Trường               | Giá trị API                                            | Nhãn UI                  |
| -------------------- | ------------------------------------------------------ | ------------------------ |
| `gender`             | `Nam`, `Nu`, `Khac`                                    | Nam, Nữ, Khác            |
| `status`             | `HoatDong`, `DaKhoa`                                   | Đang hoạt động, Đã khóa  |
| `result` của nhật ký | `ThanhCong`, `ThatBai`                                 | Thành công, Thất bại     |
| `contractType`       | `KhongXacDinhThoiHan`, `XacDinhThoiHan1Nam`, `ThuViec` | Ba loại hợp đồng trên UI |

Query danh sách: `page=1&pageSize=10&search=...`; `pageSize` tối đa 100.
Kết quả `{ items, total, page, pageSize }`; danh sách quản trị có thêm `active`,
`locked` là tổng số toàn bộ. Nhân viên lọc thêm `roleId`, `gender`, `status`;
khách hàng lọc `gender`, `status`. Ngày sinh/ngày vào làm dùng `YYYY-MM-DD`.
Mã tài khoản/khách hàng/nhân viên do server sinh, không lấy mã tăng dần từ UI.
Email tùy chọn phải bỏ trường nếu không có; `null` và chuỗi email rỗng bị từ chối.

Lỗi trả status 400/401/403/404/409/503 và `message`. Không lộ thông báo SQL.
Thông tin profile/nhân viên/khách hàng không chứa password, hash hay token phiên.

## Customer auth

| Method | Endpoint                        | Body / kết quả                                                                                                                 |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/customer/auth/login`          | `{ username, password, verificationToken? }` → `{ token, expiresAt, account }` hoặc `{ requiresTwoFactor: true, phoneNumber }` |
| POST   | `/customer/auth/otp/request`    | `{ phoneNumber, purpose }` → `{ challengeId, expiresAt, message }`                                                             |
| POST   | `/customer/auth/otp/verify`     | `{ challengeId, code }` → `{ verificationToken, expiresIn: 300 }`                                                              |
| POST   | `/customer/auth/register`       | `{ phoneNumber, password, verificationToken, name?, email?, gender?, birthday?, occupation?, avatar? }`                        |
| POST   | `/customer/auth/reset-password` | `{ phoneNumber, newPassword, verificationToken }`                                                                              |
| GET    | `/customer/auth/me`             | Hồ sơ khách hàng hiện tại                                                                                                      |
| POST   | `/customer/auth/logout`         | Thu hồi phiên hiện tại                                                                                                         |

`purpose`: `DangKy`, `QuenMatKhau`, `XacThucHaiLop`. Mã xác thực ràng buộc với số
điện thoại, mục đích, tài khoản (nếu đã có); proof chỉ dùng một lần. OTP 6 chữ số,
hết hạn 3 phút; tối đa 5 lần đoán; tối thiểu 60 giây giữa lần gửi, tối đa 5 lần/giờ
cho một số điện thoại. Không trả/log mã OTP hoặc lưu mã rõ trong database.

Đăng ký: request OTP `DangKy` → verify → register với proof → login. Nếu chưa nhập
tên, server dùng tên hồ sơ khách vãng lai đã có hoặc số điện thoại; sửa sau qua
profile. Hồ sơ khách vãng lai cùng số điện thoại được liên kết sau khi chứng minh
quyền sở hữu số, không tạo hồ sơ trùng và không chuyển lịch sử từ số khác.

Quên mật khẩu: request OTP `QuenMatKhau` → verify → reset-password. Reset thu hồi
tất cả phiên và xóa bộ đếm đăng nhập sai. Không dùng OTP đăng ký để reset.

Đăng nhập 2FA: login đúng password trả `requiresTwoFactor`; request OTP
`XacThucHaiLop` → verify → login lại với password và proof. Không phát phiên
trước khi kiểm tra đủ hai yếu tố. 5 lần sai password khóa tạm 15 phút.

### Adapter SMS

Điền riêng trên server (xem `.env.example`):

```env
ACCOUNT_SMS_WEBHOOK_URL=https://your-sms-adapter.example/send
ACCOUNT_SMS_WEBHOOK_TOKEN=your-private-adapter-secret
```

Backend POST JSON `{ phoneNumber, code, purpose, expiresAt }`, header
`Authorization: Bearer <ACCOUNT_SMS_WEBHOOK_TOKEN>`, timeout 10 giây. Adapter phải
gửi SMS và chỉ trả 2xx sau khi nhà cung cấp chấp nhận tin. Thiếu cấu hình trả 503;
gửi lỗi thì challenge bị hủy. Token này đồng thời làm bí mật băm OTP; đổi token sẽ
làm các OTP chưa verify trước đó không còn dùng được.

## Customer profile

Tất cả endpoint chỉ dùng danh tính trong bearer token, không nhận customerId do
client tự chọn.

| Method | Endpoint                            | Chức năng                                                                              |
| ------ | ----------------------------------- | -------------------------------------------------------------------------------------- |
| GET    | `/customer/profile`                 | Tên, liên hệ, giới tính, ngày sinh, nghề, avatar, hạng/điểm, tổng chi tiêu, số vé, 2FA |
| PATCH  | `/customer/profile`                 | `{ name?, email?, gender?, birthday?, occupation?, avatar? }`                          |
| POST   | `/customer/profile/change-password` | `{ currentPassword, newPassword }`; thu hồi mọi phiên, yêu cầu đăng nhập lại           |
| GET    | `/customer/profile/sessions`        | Thiết bị, IP, userAgent, thời gian và `isCurrent`; không trả token                     |
| DELETE | `/customer/profile/sessions/:id`    | Đăng xuất thiết bị thuộc tài khoản mình                                                |
| DELETE | `/customer/profile/sessions`        | Đăng xuất tất cả thiết bị                                                              |
| POST   | `/customer/profile/lock`            | `{ password }`; tự khóa hồ sơ và tài khoản, thu hồi phiên                              |
| PATCH  | `/customer/profile/two-factor`      | `{ enabled, password, verificationToken }`; proof SMS mục đích XacThucHaiLop           |
| GET    | `/customer/profile/tickets`         | Vé từ đơn hàng thuộc khách hàng, không từ dữ liệu localStorage                         |
| GET    | `/customer/profile/vouchers`        | Ví voucher thật, gồm trạng thái và hạn dùng                                            |

Ticket query thêm `ticketStatus=pending|upcoming|completed|reviewed|cancelled`,
`routeId`, `date`, `sort=newest|oldest|priceAsc|priceDesc`. Item trả các trường
`ProfileTicket` trên frontend: `id`, `orderId`, `status`, `date`, `dateLabel`,
`bookedAt`, `depTime`, `depLoc`, `arrTime`, `arrLoc`, `duration`, `seat`, `type`,
`price`, `priceLabel`, cùng timestamp ISO và `route`. Ngày/giờ hiển thị Việt Nam.
Trạng thái đánh giá đọc `danh_gia`; vé/đơn đã hủy hoặc hết hạn được xem là đã hủy.
Chi tiêu hiện là tổng đơn `DaThanhToan`, không phải doanh thu sau đối soát hoàn tiền.

## Admin auth

Giữ nguyên `/admin/auth/login`, `/admin/auth/me`, `/admin/auth/logout` để tương
thích `AdminSessionService`. `/me` thêm `permissions` (tên quyền thật), `roleName`.
Login cũng ghi nhật ký, nâng hash SHA-256 cũ sang scrypt sau khi kiểm tra password.

Thêm `/admin/auth/otp/request`, `/admin/auth/otp/verify` cho 2FA SMS; request OTP
chỉ nhận `purpose: XacThucHaiLop`. Login nhận `verificationToken?` như customer.
Thêm `POST /admin/auth/change-password`, `GET /admin/auth/sessions`,
`DELETE /admin/auth/sessions`, `DELETE /admin/auth/sessions/:id` với body/quy tắc
tương tự phần bảo mật customer. API này luôn yêu cầu phiên nhân viên.

## Quản trị nhân viên

Yêu cầu quyền `QuanLyTaiKhoanNhanVien` (`Q026`) hoặc vai trò hoạt động
`QuanTriVien`. Ban quản lý không tự động có mọi quyền; kiểm tra từng cấp quyền.

| Method | Endpoint                      | Chức năng                                                           |
| ------ | ----------------------------- | ------------------------------------------------------------------- |
| GET    | `/admin/employees/options`    | Danh mục vai trò và quyền thật                                      |
| GET    | `/admin/employees`            | Tìm/lọc/phân trang                                                  |
| GET    | `/admin/employees/:id`        | Chi tiết, roleId, permissions (mã Qxxx)                             |
| POST   | `/admin/employees`            | Tạo đồng thời tài khoản, nhân viên, quyền                           |
| PUT    | `/admin/employees/:id`        | Thay thế các trường nhân viên có thể sửa                            |
| PATCH  | `/admin/employees/:id/status` | `{ status, reason }`; khóa/mở khóa đồng bộ tài khoản, thu hồi phiên |
| GET    | `/admin/employees/:id/logs`   | Nhật ký liên quan nhân viên/tài khoản; cần Q029                     |

POST body:

```json
{
  "username": "employee.test",
  "firstName": "An",
  "lastName": "Nguyễn Văn",
  "phoneNumber": "0900000000",
  "email": "employee@example.com",
  "gender": "Nam",
  "birthday": "1995-01-15",
  "startDate": "2026-11-09",
  "roleId": "VT002",
  "contractType": "KhongXacDinhThoiHan",
  "permissions": ["Q014", "Q016"],
  "password": "replace-with-a-strong-password"
}
```

PUT gửi cùng bộ trường trừ `password`; `username`, `avatar`, `address`, `notes`
tùy chọn. Không đặt/reset mật khẩu của nhân viên khác qua PUT. Không tự thay đổi
vai trò/quyền của mình; không cấp vai trò quản trị hoặc quyền vượt quá quyền
người thực hiện; không khóa chính mình hoặc làm mất quản trị viên cuối cùng.

## Quản trị khách hàng

Yêu cầu `QuanLyTaiKhoanKhachHang` (`Q027`) hoặc `QuanTriVien`.

| Method | Endpoint                       | Chức năng                                                                            |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------ |
| GET    | `/admin/customers/options`     | Danh mục hạng thành viên thật                                                        |
| GET    | `/admin/customers`             | Tìm/lọc/phân trang, số lượng active/locked                                           |
| GET    | `/admin/customers/:id`         | Chi tiết hồ sơ                                                                       |
| POST   | `/admin/customers`             | `{ name, phoneNumber, password?, email?, gender?, birthday?, occupation?, avatar? }` |
| PATCH  | `/admin/customers/:id`         | Trường profile, `phoneNumber?`, `memberTierId?`                                      |
| PATCH  | `/admin/customers/:id/status`  | `{ status, reason }`; khóa/mở khóa, thu hồi phiên                                    |
| GET    | `/admin/customers/:id/tickets` | Lịch sử vé, query giống profile                                                      |
| GET    | `/admin/customers/:id/logs`    | Nhật ký hồ sơ và tài khoản liên kết; cần Q029                                        |

POST không có password tạo hồ sơ khách vãng lai, không tạo tài khoản có password
mặc định. Có password tạo đồng thời tài khoản hội viên. Đổi số điện thoại tài
khoản từ quản trị sẽ thu hồi phiên và hủy OTP cũ. Hạng thành viên lấy từ
`bang_hang_thanh_vien`, không đoán theo số vé như dữ liệu mẫu frontend.

## Nhật ký

Yêu cầu `QuanLyNhatKyHoatDong` (`Q029`) hoặc `QuanTriVien`.

- `GET /admin/activity-logs`: danh sách và phân trang.
- `GET /admin/activity-logs/statistics`: tổng/thành công/thất bại/tạo tài khoản hôm
  nay theo múi giờ Việt Nam, không chỉ tính trên trang dữ liệu hiện tại.
- `GET /admin/activity-logs/:id`: chi tiết, actor, target, IP, userAgent,
  `before`, `after`, `changes`; che các khóa password/token/OTP trong snapshot cũ.

Query thêm `action`, `result`, `startDate`, `endDate`, `accountId`, `roleId`.
Khoảng ngày tính theo giờ Việt Nam, bao gồm hết ngày kết thúc. Không cho client
tự POST nhật ký hoặc khai báo actor/IP. Mutation ghi nhật ký trong cùng transaction.
Không có endpoint xóa/sửa nhật ký. UI xuất CSV có thể đọc từng trang API theo bộ
lọc và dùng hàm CSV hiện có, giữ xử lý chống công thức CSV.

## Frontend đã kết nối

- `AuthService` đăng nhập, đăng ký, verify OTP, reset mật khẩu và nạp hồ sơ qua API.
  Chỉ lưu token trong sessionStorage; tải lại trang gọi server để khôi phục hồ sơ.
  Không lưu hoặc kiểm tra password/hash trên client.
- Hồ sơ lưu thông tin cá nhân/avatar qua PATCH. Xóa email hoặc ngày sinh gửi chuỗi
  rỗng và backend chuyển thành NULL. Thiết bị, vé và voucher lấy từ Supabase.
- Đăng xuất thiết bị thu hồi phiên trên server. Đổi mật khẩu kiểm tra password cũ
  trên server rồi thu hồi tất cả phiên; đăng nhập lại bằng password mới.
- Bật/tắt 2FA cần password hiện tại và SMS OTP thật. Chưa cấu hình SMS sẽ hiển thị
  lỗi, không tự sinh OTP hoặc tự báo bật/tắt thành công.
- Nhân viên/khách hàng tạo, sửa, khóa, mở khóa qua API. Vai trò, mã quyền Qxxx và
  hạng thành viên lấy từ database. UI chỉ cập nhật sau khi server xác nhận đã lưu;
  khi lỗi vẫn giữ form. Nhật ký đọc server thay cho log localStorage.
- Form admin/customer xử lý `requiresTwoFactor`, chỉ lưu token sau xác thực đầy đủ.
- `POST /customer/profile/tickets/:id/review` lưu nhận xét, chỉ cho vé đã hoàn thành
  thuộc tài khoản hiện tại. Body `{ scores, comment? }`: 6 điểm nguyên 0–5 theo thứ
  tự an toàn, sạch sẽ, thái độ, đúng giờ, thông tin, tiện nghi; ít nhất một điểm > 0.
  Unique mave chống đánh giá trùng. Không tự cấp voucher thưởng giả.
- Ví voucher đọc `voucher_khach_hang`, không tự chèn voucher mẫu theo hạng.

Avatar nhận HTTPS URL, asset path hoặc data URL png/jpeg/webp tối đa 600.000 ký tự;
frontend thu nhỏ ảnh WebP 512px, backend nhận JSON tối đa 1 MB.

## Sửa mật khẩu khách hàng từ quản trị

Trang `/admin/customers/accounts` đánh dấu **Cần đặt lại mật khẩu** nếu hash lưu
trong tài khoản không tương thích. Mở hồ sơ → **Bảo mật đăng nhập** → nhập mật
khẩu mới cho khách hàng và mật khẩu quản trị hiện tại → **Đặt mật khẩu mới**.
Không đặt mật khẩu mặc định chung và không tự đổi 10 tài khoản có sẵn.

`POST /admin/customers/:id/password`, body `{ adminPassword, newPassword }`, cần
quyền Q027 hoặc Quản trị viên. Xác nhận lại mật khẩu quản trị; 5 lần sai khóa tạm
15 phút. Mật khẩu mới được băm scrypt, thu hồi phiên/OTP cũ, ghi nhật ký không
chứa mật khẩu. Giữ nguyên trạng thái khóa vĩnh viễn. Hồ sơ chưa có `tai_khoan`
được liên kết tài khoản mới sau xác nhận quản trị, không mất lịch sử mua vé.

## Tệp đính kèm đánh giá

Endpoint review chấp nhận cả JSON không tệp và multipart/form-data gồm `scores`
(JSON array), `comment`, tối đa 3 trường file cùng tên `files`. JPG/PNG/WebP tối
đa 5 MB/tệp; MP4/WebM tối đa 20 MB/tệp. Kiểm tra chữ ký nhị phân và MIME, không
dùng tên do khách gửi làm đường dẫn. Chỉ chủ vé đã hoàn thành được gửi đánh giá.

Tệp lưu trên ổ đĩa **backend**, mặc định `uploads/private/reviews`, đổi bằng
`REVIEW_UPLOAD_DIR`; `tep_danh_gia` trên Supabase lưu loại, MIME, dung lượng, URL,
thứ tự và liên kết đánh giá. Không cần thêm bảng hay cấu hình Supabase Storage.
Khi deploy phải gắn volume bền vững cho thư mục này; các instance dùng chung kho
tệp. Không đưa tệp upload vào Git.

`GET /customer/review-media/:id` phục vụ ảnh/video của đánh giá đang hiển thị,
không nhận đường dẫn tùy ý; tệp/đánh giá bị ẩn trả 404. Có nosniff và CSP sandbox.
Nếu transaction thất bại, tệp chưa được tham chiếu bị dọn; nếu không xác định
được COMMIT do mất kết nối, giữ tệp để tránh xóa nhầm dữ liệu đã lưu.

`npm.cmd run test:accounts:repairs`: kiểm tra độc lập mật khẩu và upload HTTP.
Kiểm thử trình duyệt bổ sung: build frontend test rồi chạy
`node test/accounts-browser.cjs --test-build --repairs`; tạo lịch/vé/tài khoản QA
biệt lập, đối chiếu Supabase và dọn cả bản ghi lẫn tệp QA trong finally.

OTP không được triển khai thêm trong lượt sửa này theo yêu cầu người dùng;
các kiểm tra xác thực sẵn có vẫn giữ nguyên, không tự tạo mã hoặc bỏ qua xác thực.

[Rà soát chi tiết frontend và Supabase](accounts-review.md).
