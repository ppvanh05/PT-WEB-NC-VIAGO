# Quyền truy cập màn hình admin

- Đăng nhập và `GET /admin/auth/me` trả `roleName`, `permissions` theo
  `nhan_vien -> vai_tro` và `nhan_vien_quyen_han -> quyen_han` trong Supabase.
- Menu lọc từng mục con theo quyền; nhóm không có mục được phép sẽ được ẩn.
- Trang tổng quan chỉ hiện lối tắt được phép và thanh trên cùng hiện đúng vai trò.
- Guard áp dụng cùng quy tắc cho URL trực tiếp và các đường dẫn alias.
  Truy cập trái quyền quay về `/admin/home?access=denied`, không đăng xuất người dùng.
- Các API tài khoản đang được bảo vệ vẫn kiểm tra quyền cho từng request;
  ẩn menu không thay thế bảo vệ API. Không thay đổi guard của các module khác.
- Không cấp quyền theo tên vai trò bán vé/điều phối/ban quản lý. Vai trò quản trị
  giữ quy tắc truy cập các màn hình quản trị hiện có.
- Hộp thư CSKH giữ quyền riêng của backend: `supportChat` dựa trên mã quyền
  `CHATBOT_SUPPORT_PERMISSION` (mặc định `CSKH_CHAT`). Danh mục hiện chưa có mã
  mặc định này, nên mục hỗ trợ sẽ ẩn nếu tài khoản chưa có quyền tương ứng,
  kể cả tài khoản quản trị. Không tự thêm mã quyền hoặc mở quyền để hiện menu.
- Hồ sơ ứng tuyển/vị trí tuyển dụng dùng quyền quản lý tài khoản nội bộ
  `QuanLyTaiKhoanNoiBo`; liên hệ khách hàng dùng `QuanLyTaiKhoanKhachHang`.
- Người dùng đã đăng nhập từ phiên bản trước nên tải lại trang để lấy metadata
  quyền. Kiểm tra phiên khi chuyển trang vẫn dùng khoảng xác thực 30 giây;
  reload đọc quyền mới, còn backend áp dụng thay đổi quyền ngay ở mỗi request.

Kiểm thử:

- Frontend: `admin-permissions.spec.ts` kiểm tra menu, quyền, alias và guard.
- Backend: `node test/admin-permission-session.cjs` kiểm tra metadata theo dữ liệu.
- Browser: build frontend development vào `../artifacts/admin-permission-build`,
  rồi chạy `node test/admin-navigation-browser.cjs` sau khi build backend.
  Test chỉ tạo/thay đổi dữ liệu QA riêng và tự dọn; không sửa quyền người dùng thật.
