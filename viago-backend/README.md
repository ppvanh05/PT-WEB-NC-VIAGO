<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

`src/featured/admin` and `src/featured/customer` mirror the frontend's
`src/app/featured` directory structure. Policies, news and promotions are
implemented in `src/featured/admin/content/`. Other feature directories are
reserved for later implementation.

## API quản lý chính sách

Chạy lệnh từ `viago-backend/`. Với máy mới, tạo `.env` theo `.env.example`,
điền kết nối Supabase, rồi chạy:

```powershell
npm ci
npm run prisma:generate
npm run start:dev
```

`DATABASE_URL` dùng transaction pooler cổng 6543 với `pgbouncer=true`;
`DIRECT_URL` dùng session pooler cổng 5432 cho Prisma CLI. Mật khẩu có ký tự
đặc biệt cần URL encode. `.env` không được đưa vào Git.

API tổng quan trang chủ đọc từng nhóm dữ liệu lần lượt và dùng chung lượt đọc
cho các yêu cầu đồng thời. Kết quả không được lưu cache sau khi tải xong.
Prisma chờ tối đa 10 giây để lấy transaction; thời gian thực thi và isolation
của các transaction đặt vé vẫn giữ nguyên. Kiểm tra với Supabase bằng
`npm run test:home`: chỉ đọc dữ liệu, giới hạn một kết nối, mô phỏng kết nối
bận hơn 2 giây và gọi đồng thời 8 yêu cầu trang chủ.
Module dùng các bảng sẵn có, không cần thay đổi schema hay chạy migration.
Server mặc định ở `http://localhost:3000`; CORS cho `http://localhost:4200`,
có thể đổi bằng `FRONTEND_ORIGIN` trong `.env`.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | `/admin/policies` | Danh sách, tìm kiếm, lọc và phân trang |
| GET | `/admin/policies/statistics` | Tổng số, đang áp dụng, đã khóa, số lượng theo loại |
| GET | `/admin/policies/:id` | Chi tiết chính sách và phiên bản phí hủy mới nhất |
| POST | `/admin/policies` | Tạo chính sách |
| PATCH | `/admin/policies/:id` | Sửa nội dung, loại, ngày áp dụng, mốc phí hủy |
| PATCH | `/admin/policies/:id/status` | Khóa hoặc mở khóa |

Query danh sách: `page` (mặc định 1), `pageSize` (mặc định 10, tối đa 100),
`search` (tên/mã, không phân biệt hoa thường), `loaiChinhSach`, `trangThai`,
`sort` (`newest`, `oldest`, `name`). Trả về `{ data, pagination }`;
`pagination` gồm `page`, `pageSize`, `total`, `totalPages`.
Thống kê được tính trên toàn bộ chính sách, độc lập với bộ lọc danh sách.

Loại chính sách nhận enum `DatVe`, `ChinhSuaVe`, `HoanHuy`,
`DieuKhoanDichVu`, `BaoMat`, hoặc nhãn tiếng Việt tương ứng trên frontend.
Trạng thái nhận `DangApDung` / `DaKhoa` hoặc `Đang áp dụng` / `Đã khóa`.

Ví dụ body tạo chính sách hoàn hủy:

```json
{
  "tenChinhSach": "Chính sách hoàn hủy vé",
  "loaiChinhSach": "HoanHuy",
  "ngayApDung": "2026-11-02",
  "noiDungChinhSach": "<p>Phí hủy được tính theo thời gian trước khởi hành.</p>",
  "maNhanVien": "MA_NHAN_VIEN_DANG_HOAT_DONG",
  "mocThoiGianHuyVe": [
    { "truocGio": 24, "phiHuy": 10 },
    { "truocGio": 12, "phiHuy": 30 },
    { "truocGio": 0, "phiHuy": 100 }
  ]
}
```

`maNhanVien` phải là mã có thật trong bảng `nhan_vien` và đang hoạt động;
API lấy tài khoản tương ứng để ghi nhật ký. Backend hiện chưa triển khai
đăng nhập/phân quyền: trường này là thông tin người thực hiện, không phải cơ chế
xác thực. Cần nối guard đăng nhập/phân quyền admin trước khi đưa API ra môi trường
công khai. Frontend hiện vẫn dùng mock, chưa gọi API này.

Khi tạo chính sách khác `HoanHuy`, bỏ `mocThoiGianHuyVe` hoặc gửi mảng rỗng.
`trangThai` khi tạo là tùy chọn, mặc định `DangApDung`.
Mã chính sách do server sinh bằng UUID có tiền tố `CS`.
Ngày áp dụng nhận đúng `YYYY-MM-DD`, tính theo múi giờ Việt Nam.
Các trường `maCS`, `capNhatCuoi`, `nguoiThucHien` là dữ liệu trả về;
không gửi lại toàn bộ đối tượng đọc được khi tạo/sửa.

Body sửa chứa `maNhanVien` và các trường muốn đổi. Trường bị bỏ qua giữ giá trị
cũ; `null`, chuỗi rỗng, ngày sai, trường ngoài DTO bị từ chối. Đổi trạng thái dùng
endpoint riêng với body `{ "maNhanVien": "NV...", "trangThai": "DaKhoa" }`.
Gửi lại cùng trạng thái không tạo thêm nhật ký. Module dùng khóa/mở khóa thay cho
xóa chính sách.

### Lưu phiên bản phí hủy

- `truocGio` là số nguyên không âm; các mốc không trùng và phải có mốc 0 giờ.
  `phiHuy` là phần trăm từ 0–100, tối đa hai chữ số thập phân.
- API sắp xếp các mốc thành khoảng `[giờ tối thiểu, giờ tối đa)`;
  mốc lớn nhất không có giới hạn trên. Tỷ lệ hoàn là `100 - phiHuy`.
- `choPhepHuy` là tùy chọn; mặc định `false` khi phí 100%, còn lại `true`.
  Nếu gửi `false` thì phí phải là 100%.
- Bảng `chinh_sach` chưa có quan hệ tới nhóm phí hủy. Với chính sách do API
  quản lý, `chinh_sach_huy.manhomchinhsach` dùng chính `maCS` làm khóa nhóm.
  API không tự ghép các nhóm phí hủy cũ với một chính sách nội dung theo tên.
  Chính sách cũ chưa có nhóm tương ứng trả `mocThoiGianHuyVe: []`;
  khi gửi các mốc phí hủy lần đầu, API tạo nhóm cho chính sách đó.
- Mỗi lần sửa chính sách hoàn hủy tạo phiên bản và mã mốc mới. Các bản ghi
  và chi tiết cũ được giữ để `lich_su_huy_ve` tiếp tục tham chiếu.
- Thời điểm bắt đầu phiên bản mới là ngày áp dụng hoặc thời điểm cập nhật,
  lấy mốc muộn hơn. Quy tắc hiện hành tiếp tục tới mốc hiệu lực mới.
  Phiên bản đang chờ áp dụng bị thay thế được giữ với khoảng hiệu lực rỗng;
  mở khóa không kích hoạt lại phiên bản đã bị thay thế.
- Chính sách, phiên bản phí hủy và nhật ký được ghi trong cùng transaction.
  Xung đột đồng thời được thử lại; lỗi không để lại thay đổi dở dang.

Response dùng tên trường của giao diện như `maCS`, `tenChinhSach`,
`loaiChinhSach`, `trangThai`, `ngayApDung`, `capNhatCuoi`, `nguoiThucHien`,
`noiDungChinhSach`, `mocThoiGianHuyVe`; kèm các mã enum và thông tin phiên bản
`phienBanHuy`, `ngayApDungPhiHuy`. `capNhatCuoi` là ISO timestamp.
Lỗi dữ liệu trả 400, không tìm thấy trả 404, xung đột ghi trả 409.

Kiểm tra cấu hình và biên dịch:

```powershell
npm run prisma:validate
npm run build
```

## API quản lý tin tức

Module NestJS nằm tại `src/featured/admin/content/news/`, được nạp trong
`AppModule`. Dùng kết nối Prisma/Supabase đã cấu hình như phần policies;
không cần thay đổi schema. Base URL: `http://localhost:3000/admin/news`.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | `/admin/news` | Danh sách, tìm kiếm, lọc, phân trang |
| GET | `/admin/news/statistics` | Thống kê loại bài, trạng thái và tin nổi bật |
| GET | `/admin/news/:id` | Chi tiết gồm toàn bộ nội dung |
| POST | `/admin/news` | Tạo bài viết |
| PATCH | `/admin/news/:id` | Sửa bài, tags, ảnh, trạng thái và lịch đăng |
| PATCH | `/admin/news/:id/status` | Đăng ngay, ẩn, chuyển bản nháp hoặc hẹn đăng |
| GET | `/admin/news/:id/comments` | Bình luận có phân trang |
| DELETE | `/admin/news/:id/comments/:commentId` | Ẩn bình luận, giữ bản ghi và phản hồi |
| PATCH | `/admin/news/:id/comments/:commentId/status` | Ẩn hoặc khôi phục bình luận |

Query danh sách: `page` (1), `pageSize` (10, tối đa 100), `search`
(mã/tiêu đề/tóm tắt/nội dung), `loai`, `trangThai`, `thang` (`YYYY-MM`),
`noiBat` (`true`/`false`), `sort` (`newest`, `oldest`, `title-az`, `title-za`).
Lọc tháng theo ngày đăng/hẹn đăng, dùng ngày tạo nếu bài chưa có ngày đăng,
tính trong múi giờ Việt Nam. Sắp xếp mới/cũ dựa trên thời gian tạo bài.
Response danh sách là `{ data, pagination }`, không tải toàn bộ nội dung HTML
hay mọi bình luận của từng bài. Thống kê tính trên toàn bộ tin tức, độc lập
với bộ lọc danh sách.

`loai` nhận enum hoặc nhãn UI: `TinTucNhaXe` (Tin tức nhà xe), `KhuyenMai`
(Khuyến mãi), `CamNangDiChuyen` (Cẩm nang di chuyển), `SuKien` (Sự kiện),
`TuyenDung` (Tuyển dụng). `trangThai` nhận `DangHienThi`, `LichHenDang`,
`BanNhap`, `DaAn` hoặc nhãn tiếng Việt trên giao diện.

Ví dụ tạo bản nháp:

```json
{
  "tieuDe": "VIAGO khai trương tuyến mới",
  "moTa": "Thông tin lịch trình và ưu đãi cho hành trình mới.",
  "loai": "TinTucNhaXe",
  "image": "/assets/customer/xe.png",
  "noiDung": "<p>Nội dung chi tiết của bài viết.</p>",
  "noiBat": true,
  "tags": ["VIAGO", "Tuyến mới"],
  "maNhanVien": "MA_NHAN_VIEN_DANG_HOAT_DONG"
}
```

Tiêu đề, mô tả (tối đa 200 ký tự), loại, ảnh, nội dung và mã nhân viên là
bắt buộc khi tạo. Mặc định bài ở `BanNhap`. Có thể gửi `trangThai` để đăng ngay
hoặc hẹn giờ. `nguoiDang` là nhãn bộ phận hiển thị, mặc định theo loại bài;
nhân viên thực sự được lưu bằng mã từ `maNhanVien`. Khi sửa, giữ nguyên mã
nhân viên đăng gốc; nhật ký ghi nhân viên thực hiện lần sửa.
Như policies, backend chưa nối đăng nhập/phân quyền admin; `maNhanVien`
không thay thế xác thực. Frontend vẫn đang dùng mock, chưa gọi API news.

Server sinh mã `TT` + UUID và đường dẫn không dấu có hậu tố duy nhất.
Sửa tiêu đề giữ đường dẫn cũ. Có thể gửi `duongDan` riêng bằng chữ thường,
số và dấu gạch ngang (tối đa 200 ký tự); đường dẫn trùng trả 409.
Tags được trim và loại trùng không phân biệt hoa thường; gửi `[]` để xóa tags.
Trường bỏ qua khi sửa giữ nguyên dữ liệu; `null`, trường lạ và dữ liệu sai
trả 400. Không có API xóa cứng bài viết, dùng trạng thái `DaAn`.

`image` nhận URL HTTP(S) hoặc đường dẫn asset như `/assets/customer/xe.png`.
Đây là lưu tham chiếu ảnh, chưa có API upload file hay tích hợp Supabase Storage;
không gửi data URL base64 từ phần upload mock của frontend.

### Hẹn giờ đăng tin

Gửi `trangThai: "LichHenDang"` và `henDangLuc` là ISO timestamp có múi giờ,
ở tương lai, ví dụ `2026-12-01T09:00:00+07:00`. Chỉ gửi `henDangLuc` khi
trạng thái là hẹn đăng. Ngày và giờ tách riêng ở form frontend cần được ghép
thành timestamp này khi nối API.

Khi backend đang chạy, module kiểm tra mỗi 30 giây, xử lý tối đa 25 bài đến hạn
mỗi lần; trạng thái tự đổi thành `DangHienThi`, giữ thời điểm hẹn làm ngày đăng.
Bài đến hạn khi server tắt sẽ được xử lý trong các đợt kiểm tra sau khi khởi động.
Đặt `NEWS_SCHEDULER_ENABLED=false` để tắt worker trong môi trường test hoặc
tiến trình không phụ trách xuất bản. Các tiến trình cùng chạy worker sử dụng
conditional update và transaction để tránh ghi nhật ký xuất bản hai lần.

Ẩn hoặc chuyển bản nháp sẽ hủy lịch đăng đang chờ. Chọn đăng ngay cho một bài
đang hẹn sẽ dùng thời điểm hiện tại. Khi ẩn rồi đăng lại bài đã xuất bản,
giữ nguyên ngày xuất bản gốc. Endpoint đổi trạng thái nhận body như:

```json
{ "maNhanVien": "MA_NHAN_VIEN_DANG_HOAT_DONG", "trangThai": "DaAn" }
```

### Quản lý bình luận tin tức

GET comments nhận `page`, `pageSize` và `trangThai`: `HienThi` (mặc định)
hoặc `DaAn`. Mỗi bình luận trả `id`, `parentId`, `author`, `date`, `content`,
thời điểm ISO, lượt thích và trạng thái; không trả mã tài khoản khách hàng.
`soBinhLuan` trên bài viết đếm bình luận đang hiển thị.

DELETE nhận body `{ "maNhanVien": "NV..." }` và chuyển bình luận thành `DaAn`.
PATCH status nhận thêm `trangThai: "HienThi"` hoặc `"DaAn"` để khôi phục/ẩn.
Mỗi thao tác kiểm tra bình luận thuộc đúng bài; không xóa bản ghi hay phản hồi
con. Gửi lại cùng trạng thái không tạo thêm nhật ký. Thay đổi bài/bình luận
và nhật ký được ghi trong cùng transaction.

## API quản lý khuyến mãi và vouchers

Module nằm tại `src/featured/admin/content/promotions/`, dùng schema hiện có,
không cần migration. Base URL: `http://localhost:3000/admin/promotions`.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | `/admin/promotions` | Danh sách, tìm kiếm, lọc và phân trang |
| GET | `/admin/promotions/options` | Hạng thành viên, đặc quyền và tuyến đang hoạt động |
| GET | `/admin/promotions/statistics` | Thống kê toàn bộ chương trình và lượt dùng |
| GET | `/admin/promotions/:id` | Chi tiết chương trình |
| GET | `/admin/promotions/:id/statistics` | Hiệu quả và hạn mức của một chương trình |
| GET | `/admin/promotions/:id/usages` | Lịch sử sử dụng thành công, có phân trang |
| POST | `/admin/promotions` | Tạo chương trình, cấp voucher nếu chọn khách riêng |
| PATCH | `/admin/promotions/:id` | Sửa chương trình và điều kiện |
| PATCH | `/admin/promotions/:id/status` | Hoạt động, tạm dừng hoặc ngừng hoạt động |
| DELETE | `/admin/promotions/:id` | Ngừng hoạt động, giữ lịch sử và ví khách |

Các endpoint ghi nhận `maNhanVien` đang hoạt động như policies/news. Mã tài khoản
được lấy từ nhân viên để lưu người tạo/cập nhật, người cấp và nhật ký.
Module chưa nối đăng nhập/phân quyền admin hoặc frontend hiện đang dùng mock.

### Tạo và sửa chương trình

Ví dụ body tạo chương trình:

```json
{
  "maNhanVien": "MA_NHAN_VIEN_DANG_HOAT_DONG",
  "code": "VIAGO10",
  "name": "Ưu đãi cho hội viên",
  "description": "Giảm 10% cho các hạng được chọn.",
  "discountType": "percentage",
  "discountValue": 10,
  "maxDiscount": 50000,
  "minOrderValue": 150000,
  "memberTiers": ["SILVER", "GOLD"],
  "routesType": "all",
  "startDate": "2026-11-02",
  "endDate": "2026-12-31",
  "limitPerUser": 1,
  "maxUsage": 1000,
  "priority": "normal",
  "status": "running"
}
```

Khi tạo, bắt buộc mã, tên, loại giảm, giá trị giảm, ngày bắt đầu/kết thúc và mã
nhân viên. `code` được trim, viết hoa, nhận 3–50 ký tự chữ/số/`_`/`-`, duy nhất
không phân biệt hoa thường. Server sinh `id` riêng có tiền tố `KM`; mọi endpoint
`:id` dùng mã này, không dùng `code`. Không đổi mã voucher đã cấp hoặc phát sinh
lượt giữ/sử dụng. Cập nhật bằng PATCH giữ các trường bị bỏ qua; từ chối trường
ngoài DTO như `usageCount`, `revenueGenerated` và `assignedCustomer.used`.

- `discountType`: `percentage` (1–100%), `fixed` (số tiền lớn hơn 0),
  `gift` (giá trị bằng 0). `maxDiscount` chỉ dùng cho phần trăm.
- Các số tiền không âm, tối đa 1.000.000.000.000 và tối đa hai chữ số thập phân.
  `description` mô tả quyền lợi; `benefitConfig` là JSON cấu hình tùy chọn,
  tối đa 20.000 ký tự JSON, giữ nguyên khi sửa trường khác. Ví dụ điều kiện đặt
  trước trong dữ liệu cũ không bị mất khi sửa tên.
- `startDate`/`endDate` nhận `YYYY-MM-DD` theo múi giờ Việt Nam. Ngày kết thúc
  bao gồm đến 23:59:59.999; không được trước ngày bắt đầu. Tạo mới không nhận
  ngày bắt đầu trong quá khứ. Sửa chương trình cũ có thể giữ/chỉnh khoảng ngày.
- `minOrderValue` mặc định 0; `serviceScope` nhận `DatVe` (mặc định), `ThueXe`,
  `TatCa`. `priority` nhận `normal`/`high`.
- `maxUsage` và `limitPerUser` là số nguyên dương; `null` bỏ giới hạn.
  Mặc định tổng không giới hạn và mỗi khách một lượt. `limitSubject` là
  `KhachHang` (mặc định) hoặc `SoDienThoai`. Không giảm hạn mức xuống dưới số
  lượt đã dùng/đang giữ; giới hạn theo khách bỏ qua lịch sử không có mã khách.
- `referralRequired`/`emailFollowRequired` là cờ điều kiện bổ sung, mặc định false.

### Đối tượng và tuyến áp dụng

`memberTiers` nhận mã hoặc tên hạng lấy từ `/options`, ví dụ `SILVER` hoặc `Bạc`.
`["Tất cả"]` là mặc định; không trộn với hạng cụ thể. API đồng bộ cả mảng
`hangkhachapdung` và bảng `khuyen_mai_hang` bằng mã hạng.

Chỉ chọn một nhóm mục tiêu: hạng thành viên, `firstOrderOnly=true`,
`birthdayMonthOnly=true` hoặc `assignedCustomer`. Khi đổi nhóm qua PATCH,
gửi lại các cờ cần tắt, `memberTiers: ["Tất cả"]` nếu bỏ hạng, và
`assignedCustomer: null` nếu bỏ cấp riêng. `birthdayMonths` nhận các tháng
`"01"`–`"12"`, chỉ dùng khi bật sinh nhật; mảng rỗng nghĩa là không giới hạn
tháng trong năm. Tắt sinh nhật tự xóa các tháng cấu hình.

`routesType`: `all` (mặc định), `specific`, `exclude`. Hai loại sau bắt buộc
`selectedRoutes`; ưu tiên gửi các mã tuyến từ `/options`. Tên tuyến chỉ được
nhận khi khớp duy nhất với database, không suy đoán cặp tuyến hai chiều từ nhãn
`↔` của dữ liệu mock. `daysOfWeek` nhận `Mon`–`Sun`, lưu thứ ISO 1–7;
mảng rỗng nghĩa là cả tuần. Gửi `maxDiscount`, `maxUsage`, `limitPerUser`,
`benefitConfig` bằng `null` để xóa cấu hình tương ứng.

### Cấp riêng cho khách

```json
{
  "assignedCustomer": {
    "emailOrPhone": "MA_KHACH_HANG_HOAC_SO_DIEN_THOAI_EMAIL",
    "reason": "complaint",
    "note": "Lý do cấp bù"
  }
}
```

Đây là phần body bổ sung khi tạo/sửa. Khách phải tồn tại và đang hoạt động;
nếu email không duy nhất, dùng mã khách hoặc số điện thoại. `reason` nhận
`complaint`, `delay_cancel`, `system_error`, `custom_compensation`.
API tạo bản ghi `voucher_khach_hang` nguồn `CapBu`, thời gian theo chương trình
và lưu tài khoản người cấp. Không nhận `used` từ client; trạng thái dùng lấy từ ví.

Đổi người nhận hoặc bỏ cấp riêng chỉ thu hồi voucher chưa dùng/chưa giữ,
giữ bản ghi `ThuHoi` thay vì xóa. Không thay đổi người nhận khi voucher đang giữ
hoặc đã dùng; không chuyển chương trình công khai đã có người lưu sang cấp riêng
bằng form một khách. Dữ liệu cấp riêng cũ có nhiều voucher chưa thu hồi cần được
quản lý bằng quy trình cấp hàng loạt, module này không tự gộp/xóa các bản ghi đó.
Chính sách, điều kiện, ví và nhật ký được ghi trong cùng transaction.

### Trạng thái và báo cáo

Khi ghi, `status` nhận `running`, `paused`, `locked` (mặc định `running`).
`running` nghĩa là cho phép hoạt động; trạng thái trả về được tính theo thời gian:
`upcoming` trước ngày bắt đầu, `running` trong khoảng hiệu lực, `expired` sau hạn.
`paused`/`locked` giữ trạng thái thủ công. Không gửi `upcoming`/`expired` để ép
trạng thái; sửa ngày hiệu lực nếu muốn gia hạn. Không cần worker để đổi trạng thái.

DELETE và PATCH status nhận body có `maNhanVien`; PATCH cần thêm `status`.
Ngừng hoạt động không xóa chương trình, lần sử dụng hoặc ví đã cấp. Danh sách
mặc định ẩn `locked`; dùng `status=locked` để xem và có thể mở lại bằng
`status=running`. Thống kê tổng vẫn bao gồm các chương trình ngừng hoạt động.

GET danh sách nhận `page`, `pageSize` (tối đa 100), `search`, `status`, `tier`,
`discountType`, `sort` (`newest`, `oldest`, `code`). `tier` nhận mã/tên hạng và
bao gồm cả các mã áp dụng cho mọi hạng. Response `{ data, pagination }` dùng
các trường tương ứng frontend như `code`, `name`, `discountType`, `discountValue`,
`memberTiers`, `selectedRoutes`, `status`; kèm `id`, mã hạng, nhãn tuyến và thông tin ví.

`usageCount`/`totalVoucherUsages` là bộ đếm lưu tại `khuyen_mai.soluongdadung`.
`confirmedUsageCount` đếm các bản ghi `su_dung_khuyen_mai` có trạng thái `DaSuDung`;
hai số có thể khác với dữ liệu import cũ. `revenueGenerated` là tổng giá trị
trước giảm của các lần dùng thành công, `totalDiscount` là tổng giảm,
`netRevenue` là hiệu số; đây không phải báo cáo thu tiền/hoàn tiền ngân hàng.
Các tổng tiền trả chuỗi decimal để giữ độ chính xác. Lịch sử `/usages` chỉ trả
lần dùng thành công, có thông tin đơn/khách phục vụ màn thống kê admin.

Module này quản lý cấu hình/cấp voucher và báo cáo. Việc kiểm tra điều kiện,
giữ hạn mức, áp mã và chốt lượt dùng trong checkout cần được nối ở luồng đặt vé/
thuê xe. Cấu hình quà tặng/miễn phí hủy chưa tự thực thi quyền lợi tại checkout.

## API customer/about

Module công khai nằm tại `src/featured/customer/about/`, được nạp trong
`AppModule`, dùng database sẵn có và không cần migration.
Base URL: `http://localhost:3000/customer/about`.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | `/customer/about` hoặc `/customer/about/about-us` | Giới thiệu, liên hệ, ảnh và số liệu tổng hợp |
| GET | `/customer/about/contact` | Thông tin liên hệ và các chủ đề hỗ trợ |
| POST | `/customer/about/contact` | Lưu yêu cầu liên hệ |
| GET | `/customer/about/faq/categories` | Nhóm câu hỏi đang hiển thị và số lượng |
| GET | `/customer/about/faq` | Tìm kiếm, lọc và phân trang FAQ |
| GET | `/customer/about/faq/:id` | Chi tiết FAQ đang hoạt động |
| GET | `/customer/about/policies/types` | Mã và nhãn các loại chính sách dùng cho bộ lọc |
| GET | `/customer/about/policies` | Chính sách đang có hiệu lực, mặc định là bảo mật |
| GET | `/customer/about/policies/:id` | Chi tiết chính sách công khai |
| GET | `/customer/about/terms/types` | Mã và nhãn 4 loại điều khoản |
| GET | `/customer/about/terms` | Điều khoản và chính sách đặt/sửa/hoàn hủy vé |
| GET | `/customer/about/terms/:id` | Chi tiết một điều khoản công khai |
| GET | `/customer/about/guide` | Ba hướng dẫn mua/nhận vé |
| GET | `/customer/about/guide/:slug` | Nội dung hướng dẫn |
| GET | `/customer/about/careers/options` | Bộ lọc tuyển dụng từ các vị trí còn nhận hồ sơ |
| GET | `/customer/about/careers` | Danh sách vị trí còn tuyển |
| GET | `/customer/about/careers/:id` | Chi tiết vị trí còn tuyển |
| POST | `/customer/about/careers/:id/applications` | Nộp hồ sơ multipart có CV |

Frontend chưa được nối API: trang liên hệ hiện dùng `mailto`, FAQ/tuyển dụng
và các trang nội dung hiện dùng dữ liệu trong frontend. Module backend cung cấp
API thay thế, không tự gửi email, SMS hay thông báo ra bên ngoài.

### Nguồn nội dung công khai

- FAQ lấy từ `faq`, chỉ trả `HoatDong`. Query: `search`, `category` (ví dụ
  `booking`, `payment`, `refund`, `info`, `member`, `support`), `page`, `pageSize`.
- Chính sách lấy từ `chinh_sach`, chỉ trả `DangApDung` và `ngayapdung` không
  nằm trong tương lai. Query `type` nhận enum/nhãn như API admin, cùng `search`,
  `page`, `pageSize`. `/policies` mặc định `BaoMat`; có thể chỉ rõ `type` khác.
  `/terms` gồm `DatVe`, `ChinhSuaVe`, `HoanHuy`, `DieuKhoanDichVu` và không nhận
  `BaoMat`. Các API này chỉ trả nội dung công khai, không trả mã người tạo/cập nhật.
- Chính sách hoàn hủy kèm phiên bản phí hủy đang thực sự có hiệu lực, không lấy
  phiên bản còn hẹn áp dụng. Nhóm phí hủy dùng quy ước `manhomchinhsach = maCS`
  của module admin; chính sách cũ chưa có nhóm tương ứng trả mảng quy tắc rỗng.
- Tin tuyển dụng chỉ trả `DangTuyen` và hạn nộp từ ngày hiện tại trở đi theo
  múi giờ Việt Nam; đến hết ngày hạn vẫn được nộp. Query: `search`, `department`,
  `location`, `workType` (enum hoặc nhãn `Toàn thời gian`, `Bán thời gian`,
  `Thời vụ`, `Thực tập`), `page`, `pageSize`. Lấy giá trị bộ lọc thật từ `/options`;
  giờ làm xoay ca nằm trong `workHours`, không phải một enum hình thức làm việc.
- Giới thiệu, thông tin liên hệ và hướng dẫn dùng nội dung tương ứng frontend.
  GET `/about-us` trả thêm `story`, `coreValues`, `vision`, và `galleries`
  gồm 3 loại xe, mỗi loại 2 trang ảnh với tiêu đề/mô tả để dựng thư viện ảnh.
  Cấu hình liên hệ qua `COMPANY_HOTLINE`, `COMPANY_EMAIL`, `COMPANY_ADDRESS`.
  Số liệu `activeRoutes`, `activeVehicles`, `tripsToday` được đếm từ database,
  không dùng số lượt khách/tỷ lệ đúng giờ giả lập trên giao diện.

Các danh sách trả `{ data, pagination }`, `page` mặc định 1, `pageSize` mặc định
10 và tối đa 100. FAQ sắp xếp theo thứ tự hiển thị, chính sách theo ngày áp dụng
mới nhất, tuyển dụng theo hạn nộp gần nhất. ID dùng mã database, không dùng số
thứ tự của mảng mock frontend. Hướng dẫn nhận ba slug `dat-ve-online`,
`dat-ve-hotline`, `nhan-ve-tai-ben`. Điều khoản dùng chung service đọc chính sách,
các hướng dẫn dùng chung service hướng dẫn để tránh tạo lớp khung trùng lặp.

GET `/policies/types` trả `{ data: [{ code, label }] }` cho cả 5 loại;
GET `/terms/types` chỉ trả 4 loại thuộc điều khoản. Các endpoint loại không
phụ thuộc vào việc database hiện có nội dung cho loại đó hay chưa; danh sách
và chi tiết vẫn chỉ trả nội dung đang có hiệu lực.

GET `/careers/options` trả `departments`, `locations`, `workTypes` và
`application` mô tả file CV (`field`, `required`, `maxSizeBytes`, `extensions`),
yêu cầu đồng ý điều khoản (`consentRequired`) và `termsPath`. Danh sách việc
làm cũng trả `description` để hiển thị phần mô tả trên thẻ tuyển dụng.

### Gửi liên hệ

```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "a@example.com",
  "subject": "HoTroDatVe",
  "message": "Tôi cần hỗ trợ thông tin chuyến xe."
}
```

`fullName`, `phone`, `message` bắt buộc; email có thể bỏ qua hoặc gửi chuỗi rỗng.
`subject` nhận enum hoặc nhãn từ GET `/contact`, mặc định `HoTroDatVe`.
API chuẩn hóa số điện thoại, email và lưu `yeu_cau_lien_he` ở trạng thái `Moi`.
Không nhận mã khách hay mã nhân viên từ client để tự gán người gửi/xử lý.
Response 201 chỉ xác nhận `{ received: true, message }`, không trả dữ liệu cá
nhân hoặc mã hồ sơ để tra cứu công khai.

### Nộp hồ sơ tuyển dụng và CV

Gửi `multipart/form-data` tới `/careers/:id/applications`. Các field theo form
frontend: `fullName`, `phoneNumber`, `email` (bắt buộc), `dateOfBirth`
(`YYYY-MM-DD`, không ở tương lai), `address`, `education`, `experience`,
`portfolioLink`, `introduction` (tùy chọn), `agreeTerms=true` (bắt buộc).
Field file tên `cv`, bắt buộc PDF/DOC/DOCX, tối đa 5 MB. Chọn vị trí bằng ID
trên URL; không gửi `position` là chuỗi tên từ form mock.

Ví dụ PowerShell (thay mã tuyển dụng bằng giá trị GET `/careers`):

```powershell
curl.exe -X POST "http://localhost:3000/customer/about/careers/TD001/applications" `
  -F "fullName=Nguyen Van A" `
  -F "phoneNumber=0901234567" `
  -F "email=a@example.com" `
  -F "agreeTerms=true" `
  -F "cv=@C:\duong-dan\cv.pdf"
```

API kiểm tra nội dung file theo magic bytes, không chỉ tin tên/MIME do client
gửi. File được đặt tên ngẫu nhiên và lưu riêng tại `CV_UPLOAD_DIR`, mặc định
`uploads/private/cv` trong thư mục backend. Thư mục này bị Git bỏ qua và không
được mở làm static assets. Khi triển khai, cấu hình ổ lưu bền vững riêng tư để
CV không mất khi thay tiến trình/container. Database chỉ lưu tên file, không lưu
đường dẫn tuyệt đối hay URL công khai.

Hồ sơ lưu trong `ho_so_ung_tuyen` ở trạng thái `Moi`. CV được xóa nếu yêu cầu
bị từ chối hoặc database ghi thất bại. Nếu đã có hồ sơ chưa bị từ chối cho cùng
vị trí và email/số điện thoại, không tạo bản trùng, xóa CV gửi lại và trả cùng
thông báo tiếp nhận để không tiết lộ tình trạng hồ sơ. Module không có endpoint
công khai liệt kê/tra cứu hồ sơ ứng viên hoặc tải CV; chức năng nhân sự xem CV
cần được triển khai ở API admin có phân quyền.

Hai form POST giới hạn 20 yêu cầu/IP/endpoint trong 10 phút; vượt mức trả 429
kèm `Retry-After`. Bộ giới hạn lưu trong bộ nhớ từng tiến trình và dùng IP kết
nối Express, không tự tin header `X-Forwarded-For` do client gửi.

## API customer/news

Module nằm trong `src/featured/customer/news/`, dùng chung `tin_tuc` và
`binh_luan_tin_tuc` với API admin. Base URL: `http://localhost:3000/customer/news`.

| Method | Endpoint (sau base URL) | Chức năng |
| --- | --- | --- |
| GET | `/` | Danh sách, tìm kiếm tiêu đề không phân biệt dấu, lọc và phân trang |
| GET | `/categories` | 5 danh mục và mục tổng hợp, kèm số bài công khai |
| GET | `/featured?category=all` | Các khối `main`, `grid`, `subHighlight`, `subGrid` |
| GET | `/:id` | Chi tiết theo mã database hoặc slug |
| GET | `/:id/related?limit=4` | Bài cùng danh mục, loại trừ bài hiện tại |
| POST | `/:id/views` | Tăng lượt xem, trả `{ viewCount }`, HTTP 200 |
| GET | `/:id/comments` | Phân trang bình luận gốc, mỗi bình luận kèm tối đa 3 trả lời |
| POST | `/:id/comments` | Gửi bình luận |
| GET | `/:id/comments/:commentId/replies` | Phân trang toàn bộ trả lời đang hiển thị |
| POST | `/:id/comments/:commentId/replies` | Trả lời bình luận gốc |
| PUT | `/:id/comments/:commentId/like` | Thích bình luận/trả lời, gửi lại không tăng trùng |
| DELETE | `/:id/comments/:commentId/like` | Bỏ thích, gửi lại không giảm trùng |

Chỉ bài `DangHienThi` có `thoigiandang <= hiện tại` được đọc/tương tác. Bản nháp,
bài ẩn, lịch hẹn chưa được xuất bản, bài có ngày đăng rỗng hoặc ở tương lai
trả 404. GET chi tiết không tự tăng lượt xem; frontend gọi POST `/views` khi
người dùng mở bài. API không trả mã hoặc thông tin riêng của nhân viên đăng.

Query danh sách: `category` (`all`, `news`, `promotion`, `guide`, `event`,
`recruitment`; cũng nhận mã enum hoặc nhãn Việt), `search` (tiêu đề), `tag`
(khớp chính xác), `time` (`all`, `today`, `week`, `month`, `year`), `sort`
(`newest`, `oldest`, `popular`), `page` (mặc định 1), `pageSize` (mặc định 12,
tối đa 100). `today` tính từ đầu ngày Việt Nam; week/month/year là 7/30/365 ngày
gần nhất. Kết quả trả `{ data, pagination: { page, pageSize, total, totalPages } }`.
Thứ tự có mã bài làm khóa phụ để phân trang ổn định. Bài nổi bật ưu tiên vị trí
`vitrinoibat` của admin; thiếu vị trí thì lấy bài nổi bật/mới nhất còn lại,
không lặp bài giữa các khối. Khi không có bài, hai khối đơn trả `null`.

Các trường bài viết theo frontend: `id`, `slug`, `title`, `category`,
`categoryLabel`, `image`, `summary`, `author`, `tags`, `viewCount`, `commentCount`,
`isFeatured`, `featuredPosition`, `date` (`DD/MM/YYYY`), `publishedAt`, `updatedAt`,
`path`. Chi tiết có thêm `content` HTML. Bình luận được tải riêng để phân trang;
không nhúng toàn bộ bình luận vào response bài viết.

Body gửi bình luận/trả lời:

```json
{ "authorName": "Nguyễn Văn A", "content": "Tôi muốn tìm hiểu thêm về tuyến xe này." }
```

`authorName` tùy chọn (rỗng dùng `Hành khách Viago`), tối đa 150 ký tự;
`content` bắt buộc, trim, tối đa 5000 ký tự, được xem là văn bản thuần.
Bình luận lưu `HienThi`, không tự gán mã khách hàng; admin có thể ẩn qua API
admin hiện có. Chỉ hỗ trợ một cấp trả lời. Bình luận ẩn, trả lời của bình luận
ẩn và bình luận thuộc bài khác đều không đọc/tương tác được. Response bình luận
có `id`, `parentId`, `authorName`, `content`, `createdAt`, `likes`, `isLiked`;
danh sách thêm `replyCount` và `replies`. Bộ đếm bình luận của bài bao gồm cả
trả lời công khai; tổng phân trang `/comments` chỉ đếm bình luận gốc.

### Lưu lượt thích theo trình duyệt

Chạy SQL bổ sung một lần trên database hiện có (không cần reset hoặc db push):

```powershell
npx prisma db execute --file prisma/sql/customer-news-likes.sql
npm run prisma:generate
```

Bảng `luot_thich_binh_luan` lưu cặp bình luận và hash định danh ngẫu nhiên của
trình duyệt. SQL chỉ thêm bảng này, bật RLS và giữ nguyên các bảng/dữ liệu cũ.
Không cấp quyền truy cập trực tiếp qua Supabase client; API backend dùng kết nối
server hiện có. Cookie `viago_news_visitor` là HttpOnly, SameSite=Lax, Secure khi
`NODE_ENV=production`, có hạn 1 năm. Đây là lượt thích theo trình duyệt, không
phải xác thực tài khoản; xóa cookie hoặc đổi trình duyệt tạo định danh mới.
Số lượt thích cũ vẫn được giữ. Thao tác dùng transaction và khóa duy nhất để
chống tăng/giảm trùng. Frontend cần `withCredentials: true` cho API tin tức để
lưu cookie và đọc đúng `isLiked`; CORS cho phép credentials từ `FRONTEND_ORIGIN`.
Frontend/API nên được triển khai cùng site để cookie SameSite=Lax hoạt động.

Bình luận/trả lời giới hạn chung 20 yêu cầu/IP/10 phút; lượt xem và thích/bỏ
thích giới hạn chung 120 yêu cầu/IP/phút, vượt mức trả 429 với `Retry-After`.
Bộ giới hạn nằm trong bộ nhớ mỗi tiến trình, dùng IP kết nối Express.
Frontend hiện vẫn dùng dữ liệu cục bộ; module này cung cấp API để nối sau.
Không có API đăng ký nhận email vì database chưa có bảng lưu đăng ký và giao
diện hiện tại không triển khai luồng này.

## Hộp thư hỗ trợ khách hàng

Admin → Khách hàng → **Hộp thư hỗ trợ** (`/admin/customers/support`) tiếp
nhận hội thoại chuyển từ chatbot, phân công nhân viên và phản hồi trực
tiếp cho khách. Dùng lại các bảng chatbot và tài khoản hiện có.

Đăng nhập tại `/admin/login` bằng tài khoản nhân viên trong CSDL; hộp thư
lấy người thao tác từ phiên đã xác thực. Phân quyền chi tiết cấu hình sau.
Xem [nghiệp vụ, API và tổ chức thư mục](docs/admin-customer-support.md).

## API customer/home

Luồng trang chủ đã nối API thay cho dữ liệu mẫu. Xem
[cấu trúc home, khuyến mãi/voucher, xác thực và giới hạn cấu hình thanh toán](docs/customer-home.md).

Module nằm nguyên trong `src/featured/customer/home/`. Base URL:
`http://localhost:3000/customer/home`. Dữ liệu tuyến, lịch trình, ghế, giá,
khuyến mãi, đơn hàng và vé lấy từ database; tin tức dùng lại service customer/news.
Module dùng schema hiện có, không cần thêm bảng.

| Method | Endpoint sau base URL | Chức năng |
| --- | --- | --- |
| GET | `/` | Banner, thành phố, tuyến nổi bật, ưu đãi, tin mới, đánh giá và cấu hình đặt vé |
| GET | `/options` | Loại xe, giới hạn ghế, cách sắp xếp, trạng thái cấu hình thanh toán |
| GET | `/cities` | Thành phố từ các tuyến đang hoạt động |
| GET | `/routes` | Tìm tuyến, phân trang theo `search`, `page`, `pageSize` |
| GET | `/news?limit=3` | Tin mới đã xuất bản, limit tối đa 20 |
| GET | `/reviews` | Đánh giá công khai, phân trang, số lượng và điểm trung bình thật |
| GET | `/promotions` | Ưu đãi đang có hiệu lực cho đặt vé, phân trang |
| GET | `/customer` | Thông tin của chính khách đang đăng nhập |
| GET | `/vouchers` | Ví voucher khả dụng của chính khách đang đăng nhập |
| POST | `/promotions/:code/claim` | Lưu ưu đãi công khai vào ví, gửi lại không tạo trùng |
| GET | `/destination/weather?city=TP.HCM&date=YYYY-MM-DD` | Dự báo điểm đến |
| GET | `/trips` | Tìm chuyến một chiều/khứ hồi |
| GET | `/trips/:id` | Chi tiết chuyến, điểm đón/trả, tiện nghi và ghế |
| GET | `/trips/:id/seats` | Trạng thái từng ghế, không lộ định danh người đang giữ |
| GET | `/holds` | Ghế còn được giữ bởi phiên trình duyệt hiện tại |
| POST | `/holds` | Giữ/thay danh sách ghế của phiên hiện tại, HTTP 200 |
| DELETE | `/holds` | Trả ghế khi chưa tạo đơn |
| POST | `/quote` | Tính lại giá và kiểm tra voucher trên server, HTTP 200 |
| POST | `/orders` | Tạo đơn có khóa chống gửi trùng, HTTP 201 |
| GET | `/orders/pending` | Khôi phục đơn đang chờ thanh toán của phiên hiện tại |
| GET | `/orders/:id` | Chi tiết và trạng thái đơn thuộc phiên hiện tại |
| POST | `/orders/:id/cancel` | Hủy đơn chưa thanh toán và trả ghế/voucher, HTTP 200 |
| POST | `/orders/:id/print` | Ghi nhận lần mở in vé đã thanh toán, HTTP 200 |
| GET | `/tickets/:token` | Đọc một vé bằng token ngẫu nhiên trong QR, không dùng mã đơn/SĐT |

Frontend hiện vẫn dùng booking/localStorage và thanh toán mô phỏng; cần nối
các API này để chuyển sang dữ liệu backend. Mọi request Home từ Angular cần
`withCredentials: true`. Cookie `viago_home` là HttpOnly, SameSite=Lax, hạn
30 ngày, Secure khi production; định danh giữ ghế trong DB là hash của cookie.
Frontend và API nên triển khai cùng site. Response Home đặt `Cache-Control:
no-store` để tránh cache thông tin đặt vé. Không truyền `owner`, `session`,
`makhachhang`, giá tiền hoặc trạng thái thanh toán từ client để tự gán.

### Tìm chuyến và giữ ghế

GET `/trips` nhận `from`, `to`, `date` (`YYYY-MM-DD` theo Việt Nam), `count`
(1–5), `roundTrip=true/false`, `returnDate` khi khứ hồi, `type` (mã enum hoặc
nhãn loại xe), `time` (`all`, `morning` 06–12, `afternoon` 12–18, `evening`
18–24, `night` 00–06), `minPrice`, `maxPrice`, `sort` (`early`, `late`, `price`),
`page`, `pageSize`. Ngày đi/về nằm trong 365 ngày tới. Các tên TP.HCM/Hồ Chí
Minh được quy về cùng thành phố. API trả `{ outbound: { data, pagination },
inbound?: { data, pagination }, serverTime }`; trang/bộ lọc áp dụng cho mỗi chiều.
Khứ hồi tối đa 2 ghế mỗi chiều, tổng tối đa 5 ghế/đơn.

Chỉ tuyến/xe đang hoạt động và lịch trình `DangMoBan` trong cửa sổ mở bán,
chưa qua giờ đóng bán/khởi hành được đặt. Chuyến phải đủ ghế hợp lệ còn trống.
Giá trong bộ lọc là giá cơ sở lịch trình; giá từng ghế được trả trong
`seatDetails`. `seats` chứa **mã ghế chuyến `maghechuyen`**, không phải nhãn
`1A`/`2B`; dùng `seatDetails[].label` để hiển thị. Trạng thái ghế:
`available`, `selected` (phiên hiện tại), `held`, `sold`, `locked`.

Body giữ ghế (lấy ID từ GET `/trips/:id`):

```json
{
  "legs": [{
    "tripId": "MA_LICH_TRINH",
    "seats": ["MA_GHE_CHUYEN"],
    "doubleSeats": [],
    "pickupId": "MA_DIEM_DON",
    "dropoffId": "MA_DIEM_TRA"
  }]
}
```

`pickupId`/`dropoffId` tùy chọn khi giữ ghế, bắt buộc khi quote/tạo đơn.
Phải thuộc đúng chuyến, còn hoạt động, đón trước trả và chưa qua giờ đón.
Chỉ ghế `CabinDoi` mới nhận `doubleSeats`; chọn phòng đôi tính gấp đôi giá ghế.
Khứ hồi gửi hai legs đúng chiều ngược nhau, cùng số ghế; chuyến về phải khởi
hành sau khi chuyến đi đến nơi. POST `/holds` thay toàn bộ lựa chọn của phiên.
Giữ tối đa 10 phút, có thể ngắn hơn theo lịch trình và giờ đóng bán; đổi ghế
không kéo dài mốc giữ ban đầu. API trả `expiresAt` ISO và `serverTime`.
Khi đã tạo đơn, phải hủy đơn đó trước khi thay/trả ghế.

### Tính tiền, tạo và khôi phục đơn

POST `/quote` gửi cùng `legs`, thêm:

```json
{
  "passenger": { "name": "Nguyễn Văn A", "phone": "0901234567", "email": "a@example.com" },
  "voucher": "MA_GIAM_GIA"
}
```

Tên và SĐT di động Việt Nam bắt buộc; email tùy chọn. POST `/orders` dùng
cùng body quote, thêm `key` là UUID do client tạo một lần cho lần đặt đó và
`terms: true`. Gửi lại cùng key và nội dung trả lại cùng đơn; đổi nội dung
với cùng key trả 409. Mỗi phiên chỉ có một đơn đang chờ thanh toán.
Không cần migration: khứ hồi dùng hai `don_hang` liên kết, thanh toán một lần
cho tổng hai chiều và phát hành vé cho cả hai. Giá ghế, tiền giảm được chốt
khi tạo đơn và dùng khi phát hành vé, kể cả sau đó giá danh mục thay đổi.

Response đơn có `id`, `status` (`pending`, `paid`, `expired`, `cancelled`,
`partially_cancelled`), `expiresAt`, `serverTime`, `passenger`, `legs`,
`subtotal`, `discount`, `total`, `method`, `paymentCode`, `paymentStatus`,
`tickets`. Chỉ phiên đã đặt được đọc/hủy/in đơn; phiên khác nhận 404.
Vé chỉ xuất hiện sau xác nhận thanh toán; `tickets[].token/qrValue` là mã truy
cập ngẫu nhiên 256 bit của từng vé. Bảo quản token như thông tin vé.
POST `/print` ghi số lần in, thời điểm in; frontend tự dựng và in tài liệu.
Hủy đơn chờ thanh toán và hết hạn trả lại ghế/voucher. Đơn đã trả tiền cần đi
qua quy trình hủy vé/hoàn tiền, không dùng endpoint hủy giữ chỗ này.

Voucher được kiểm tra thời gian, tuyến, giá tối thiểu, mức giảm tối đa, hạn
mức tổng, hạn mức mỗi khách/SĐT, hạng thành viên, đơn đầu, tháng sinh và ví
được cấp. Tiền giảm làm tròn về VND nguyên. Lượt đang giữ được tính vào hạn
mức; chỉ tăng số đã dùng khi thanh toán thành công; hủy/hết hạn giải phóng
lượt giữ. Mã quà tặng hoặc mã yêu cầu xác minh giới thiệu/theo dõi email chưa
được dùng để tự giảm tiền trực tiếp. Đơn tổng 0 sau ưu đãi hợp lệ phát hành
vé ngay, không yêu cầu chuyển khoản.

Các API thành viên dùng `Authorization: Bearer <session-token>` từ luồng
đăng nhập backend: `phien_dang_nhap.tokenphien` lưu **SHA-256 của token**,
phiên phải còn hạn/hoạt động, tài khoản phải là khách hàng đang hoạt động.
Home không tin user ID trong localStorage và không cung cấp tra cứu hành
khách công khai bằng SĐT. Nếu chưa có luồng đăng nhập backend tương ứng,
đặt vé vãng lai vẫn hoạt động; API ví/hồ sơ trả 401.

### Đặt vé và thanh toán

Customer có hai phương thức: VietQR/SePay (`vietqr`) và tại quầy (`counter`).
Khi chưa cấu hình ngân hàng/webhook, online vẫn hiển thị là chưa sẵn sàng;
khách có thể chọn tại quầy để đặt. Không xác nhận thanh toán hoặc phát vé giả.

Chuyển khoản dùng `GET /customer/home/orders/:id/payment` lấy QR và
`POST /customer/home/payments/sepay` nhận webhook API Key. Chỉ webhook đúng
ngân hàng, tài khoản, mã, tiền, thời gian và ghế mới xuất vé. API trả HTTP 201
với `success: true`; webhook gửi lặp không tạo vé hai lần.

Tại quầy dùng `GET /admin/counter-orders` và
`POST /admin/counter-orders/:id/confirm`; yêu cầu phiên nhân viên, ghi nhận
nhân viên thu tiền và xuất vé trong cùng transaction. Khách không tự xác nhận
thu tiền. Giữ chỗ vẫn tối đa 10 phút theo cấu hình chuyến; hủy/hết hạn trả ghế.

Xem [hướng dẫn tạo tài khoản, cấu hình ngân hàng và webhook SePay](docs/sepay-setup.md)
và [tài liệu API đặt vé](docs/customer-home.md). Chạy `npm run test:booking`
để kiểm tra code với DB trong transaction rollback và webhook mô phỏng,
không phát sinh chuyển tiền thật.

### Dữ liệu bổ trợ và giới hạn

Đánh giá chỉ trả `HienThi` của vé chưa bị hủy; tên được viết tắt phần họ,
không trả SĐT/email, mã khách/nhân viên hoặc ghi chú nội bộ. Thời tiết dùng
Open-Meteo, cache 10 phút và timeout 8 giây, chỉ hỗ trợ các thành phố có tọa
độ của frontend và ngày trong 16 ngày dự báo. Không trả dự báo giả khi nguồn
ngoài lỗi. Banner dùng ảnh hiện có của frontend.

Cookie phiên không thay thế đăng nhập thành viên. Các thay đổi ghế/đơn/voucher
dùng transaction Serializable và phát hiện xung đột; hết hạn được dọn khi đọc
giữ chỗ/đơn hoặc thực hiện thao tác đặt vé. Giới hạn theo IP kết nối Express:
300 GET/phút, 120 thao tác thay đổi/phút; vượt mức trả 429 với `Retry-After`.
Bộ giới hạn và cache thời tiết nằm trong bộ nhớ mỗi tiến trình.

## Project setup

### Chatbot realtime và chuyển CSKH

Module `/customer/chatbot`, `/admin/support`, `/admin/knowledge` có bộ nhớ,
RAG, công cụ chỉ đọc và ba nhánh hỗ trợ: AI xử lý, hỏi xác nhận hoặc chuyển
nhân viên ngay. Bảng/cột/enum trong CSDL dùng quy ước tiếng Việt của VIAGO;
migration giữ lịch sử chat cũ. Mặc định gọi OpenAI API với model `gpt-6-luna`,
không cần cài model. Xem [cấu hình API key, SQL setup và hợp đồng API](docs/customer-support.md).
API key và bảng support cần được thiết lập trước khi chạy đầy đủ tính năng.

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run build
$ npm run start:prod
```

`start:dev` và `start:debug` dùng `tsconfig.dev.json`, xuất vào `dist-dev/`.
`npm run build` xuất vào `dist/`; chạy production bằng
`npm run build` rồi `npm run start:prod`. Mỗi cấu hình lưu cache TypeScript
trong thư mục đầu ra tương ứng để build không xóa file của server watch.

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It installs `@nestjs/observe`, wires it into `AppModule` and `main.ts`, and writes the app key and secret into `.env`, which every `nest start` script (`start`, `start:dev`, `start:debug`) then loads. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/sdk) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
