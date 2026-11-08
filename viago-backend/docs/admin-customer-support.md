# Hộp thư hỗ trợ khách hàng

Mở **Admin → Khách hàng → Hộp thư hỗ trợ**, đường dẫn
`/admin/customers/support`. Giao diện dùng API thật `/admin/support` và
các bảng chatbot hiện có, không thêm bảng hoặc hội thoại mẫu.

## Đăng nhập admin

Đăng nhập chính tại `/admin/login` dùng `POST /admin/auth/login`, kiểm tra
mật khẩu trong `tai_khoan` và nhân viên/tài khoản hoạt động. Hỗ trợ scrypt
và SHA-256 của luồng cũ; sai mật khẩu 5 lần khóa tạm 15 phút. Tài khoản
bật 2FA chưa dùng luồng chỉ có mật khẩu. Không tự cấp quyền nghiệp vụ.

Backend tạo token ngẫu nhiên, chỉ lưu hash trong `phien_dang_nhap`, hết
hạn sau 8 giờ. Frontend giữ `viago_admin_access_token` và
`viago_admin_account` trong sessionStorage. Guard kiểm tra phiên bằng
`GET /admin/auth/me`; phiên hết hạn chuyển về đăng nhập chính, giữ đường
dẫn để quay lại sau đăng nhập. Đăng xuất thu hồi phiên trong CSDL.

Hộp thư không có đăng nhập riêng hay ô chọn người phản hồi. Backend chỉ
nhận danh tính từ Bearer đã xác thực; header mã tài khoản phía trình duyệt
không thể dùng thay phiên đăng nhập. Phân quyền chi tiết làm sau.

Các mật khẩu seed dạng `HASH_MAU_...` được chuyển một lần sang hash scrypt
bằng `npm run admin:seed-passwords -- --apply`, vẫn dùng chuỗi seed tương
ứng làm mật khẩu đăng nhập. Công cụ chỉ xử lý đúng dạng seed, giữ mật khẩu
thật đã có. Đặt mật khẩu riêng cho tài khoản hiện có bằng
`npm run admin:password` (nhập ẩn trong terminal).

## Quy tắc ưu tiên yêu cầu

Nhãn là mức ưu tiên xử lý, không phải xếp hạng khách hàng. Quy tắc
`uu-tien-cskh-v1` trong `chatbot.priority.ts`:

- **Khẩn cấp**: dấu hiệu sự cố/đe dọa an toàn.
- **Cao**: tranh chấp tiền/thanh toán, yêu cầu hoàn/trả tiền, cáo buộc
  lừa đảo, khiếu nại chính thức hoặc vấn đề chưa giải quyết lặp lại.
- **Trung bình**: yêu cầu hỗ trợ thông thường, chưa có các dấu hiệu trên.

Mỗi nhãn kèm cơ sở đọc được trong chi tiết hội thoại. Đây là quy tắc
nghiệp vụ và tín hiệu từ nội dung, không phải xác suất đã được hiệu chỉnh
hay kết luận khách cáo buộc đúng/sai. Cách chuyển ngay/chờ xác nhận độc
lập với mức ưu tiên: yêu cầu gặp nhân viên thông thường không tự thành Cao.

`npm run chatbot:priority:sync -- --apply` cập nhật lại dữ liệu dẫn xuất
cho các yêu cầu đang mở theo cùng quy tắc, ghi sự kiện thay đổi; không đổi
nội dung, người phụ trách hoặc trạng thái xử lý.

Bốn card chỉ hiển thị thống kê toàn bộ, không bấm để lọc và không thay đổi
theo từ khóa/bộ lọc. Các tab phía dưới mới điều khiển danh sách.

## Giao diện dùng shared

Component tại `viago-frontend/src/app/featured/admin/customers/support/`:

- `Card`: khối tiêu đề/thống kê và khối hộp thư, bo góc `sm` giống các trang quản lý.
- `Button`: thao tác tiếp nhận, gửi tin, chuyển nhân viên, gợi ý AI, làm mới.
- `Input`, `Select`, `Textarea`: tìm kiếm, bộ lọc, chuyển người phụ trách và nội dung phản hồi.
- `Badge`: loại yêu cầu, mức ưu tiên, trạng thái hội thoại.
- `Pagination`: phân trang 20 hội thoại.
- `Modal`: xác nhận hoàn tất, quản lý focus và phím Escape bằng shared.
- `Toast`: thông báo thành công/thất bại.

Không sao chép lại CSS nút, trường nhập, badge, modal và toast trong feature.
CSS tại feature chỉ bố trí khối thống kê, bộ lọc, danh sách, khung trò chuyện
và thông tin xử lý. Các màu, font, border dùng token chung của dự án.

## Nghiệp vụ

### Hỗ trợ nhiều khách đồng thời

Dải **Đang mở** giữ các hội thoại độc lập với bộ lọc danh sách. Hội thoại
đã tiếp nhận vẫn có tab để quay lại, dù biến khỏi nhóm Chờ tiếp nhận.
Backend cho phép một nhân viên tiếp nhận nhiều cuộc và API
`GET /admin/support/workspace?ids=...` trả thông tin các tab đang xem cùng
các cuộc nhân viên đang phụ trách (tối đa 100 tab).

Mỗi cuộc có bản nháp, tùy chọn dịch, gợi ý AI, mã gửi chống trùng và vị trí
đọc riêng. Frontend giữ trong sessionStorage theo **tài khoản admin**;
đổi khách hoặc tải lại trang trong cùng phiên không làm mất nội dung đang
soạn. Đăng xuất xóa workspace của tài khoản đó.

Đang gửi/tạo gợi ý cho A vẫn chuyển sang B được. Phản hồi bất đồng bộ chỉ
cập nhật trạng thái/bản nháp của A, không xóa hoặc ghi đè nội dung của B.
Nếu mất phản hồi sau khi backend đã lưu tin, thử lại vẫn dùng cùng mã gửi.

Tab hiển thị **Chờ khách / Cần trả lời / Tin mới**. Thăm dò workspace mỗi
5 giây giúp phát hiện khách trả lời ở cuộc khác. Dấu tin mới được xóa khi
người dùng mở và xem phần tin mới. Lịch sử vẫn lưu trong CSDL.

Nút × chỉ **ẩn tab**, giữ bản nháp và phân công hiện tại; không đóng hay
giải quyết yêu cầu. Có thể mở lại từ nhóm Của tôi. Tab đã ẩn không tự bật
lại khi khách chưa gửi thêm; tin khách mới sẽ đưa cuộc đang phụ trách trở
lại dải Đang mở.

Frontend chia phần này vào `services/support-workspace.service.ts`; trạng
thái server, định danh người trả lời và quyền thao tác vẫn do backend kiểm
tra trên từng hội thoại.

1. Khách yêu cầu hoặc đồng ý gặp nhân viên → yêu cầu vào **Chờ tiếp nhận**.
2. Nhân viên **Tiếp nhận** → lưu người phụ trách và lịch sử phân công.
   Hai người nhận đồng thời chỉ một người thành công.
3. **Của tôi** lọc theo tài khoản admin đang đăng nhập. Chỉ người đang phụ trách được
   phản hồi, chuyển ca, trả về hàng chờ, giải quyết hoặc đóng. Đây là điều
   kiện nghiệp vụ để tránh hai người trả lời chồng nhau.
4. **Chuyển người phụ trách** chỉ nhận nhân viên/tài khoản đang hoạt động.
   **Trả về hàng chờ** kết thúc phân công cũ và giữ yêu cầu mở.
5. **Giải quyết** cần kết quả nội bộ, kết thúc yêu cầu/phân công. Khách có
   thể tiếp tục dùng AI. **Đóng** kết thúc hẳn hội thoại.

Phản hồi lưu chung `tin_nhan_chatbot`, phát cùng SSE để widget khách nhận
được. AI không trả lời khi chờ/được nhân viên hỗ trợ. Mã gửi tin giữ lại khi
thử lại để chống trùng; UUID của client chỉ là mã idempotency, khóa CSDL
vẫn dùng varchar có tiền tố.

Danh sách có tìm theo mã/nội dung, bộ lọc loại/mức ưu tiên của yêu cầu đã
xác nhận và bộ đếm theo từng nhóm. Lịch sử tải 100 tin mới nhất, xem thêm
các tin trước đó. Hiển thị tóm tắt AI, lý do chuyển, phân công và kết quả.
Mẫu trả lời/gợi ý AI chỉ chèn vào ô soạn; nhân viên phải chủ động gửi.
Không suy đoán danh tính tài khoản từ phiên chat ẩn danh.

Admin cập nhật hội thoại mỗi 5 giây, danh sách mỗi 15 giây, dừng khi tab
ẩn. Không cần chạy thêm backend thứ hai. Nếu thay proxy thì chạy lại
frontend một lần để Angular nhận cấu hình.

Kiểm tra Origin dùng chung tại `src/shared/http/frontend-origin.ts`:
chấp nhận nguồn được cấu hình và yêu cầu cùng nguồn đi qua proxy; ở môi
trường phát triển cho phép localhost/127.0.0.1 ở các cổng khác nhau (ví dụ
53494). Nguồn website bên ngoài vẫn bị từ chối. CORS và guard dùng cùng
quy tắc, tránh việc CORS cho qua nhưng thao tác tiếp nhận/gửi tin bị chặn.

## API

| API | Chức năng |
| --- | --- |
| `GET /admin/support/context` | Nhân viên của tài khoản admin và danh sách người có thể nhận chuyển |
| `GET /admin/support/agents` | Nhân viên có thể nhận chuyển |
| `GET /admin/support/workspace?ids=...` | Các tab đang mở và các cuộc đang phụ trách |
| `GET /admin/support/conversations` | Danh sách, bộ đếm và phân trang |
| `GET /admin/support/conversations/:id?before=<sequence>` | Tin nhắn, yêu cầu, phân công, kết quả |
| `POST .../:id/claim` | Tiếp nhận |
| `POST .../:id/reassign` | Chuyển người phụ trách, `{staffId}` |
| `POST .../:id/release` | Trả về hàng chờ |
| `POST .../:id/messages` | Phản hồi, `{text, clientMessageId, translate}` |
| `POST .../:id/draft` | Gợi ý AI, không tự gửi |
| `POST .../:id/resolve` | Giải quyết, `{resolution}` |
| `POST .../:id/close` | Đóng, `{resolution}` |

Backend tại `src/featured/admin/customers/support/`, chia `controllers/`,
`dto/`, `services/`; dùng lại module chatbot cho các transaction thay đổi
trạng thái. Frontend chia `components/`, `models/`, `services/`.
