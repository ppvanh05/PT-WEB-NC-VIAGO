# Chuẩn giao diện quản trị

- Tiêu đề trang dùng `AdminPageHeader` trong `shared/components/admin-page-header`.
  Component bọc `Card`, dùng font Inter qua `--font-family-base`, tiêu đề 24px,
  cùng khoảng cách và màu chữ trên các màn hình quản lý.
  Luôn truyền `section` có nội dung để giữ đủ hai dòng nhóm quản lý và tiêu đề.
  Font Inter được đóng gói trong `public/assets/fonts`, gồm ký tự tiếng Việt;
  không nạp lại Inter từ CDN hoặc dùng độ đậm 800/900 riêng ở từng trang.
- Tạo mới: đặt nút `type="button"`, class `admin-create-action` vào vùng nội dung
  chiếu của header. Dùng biểu tượng dấu cộng trong vòng tròn, tên thao tác và
  một dòng mô tả. Đây là ô xanh nhạt, không dùng nút xanh dương thay thế.
- Mỗi dòng cần chỉnh sửa/xử lý dùng một nút `admin-edit-action`, có SVG bút chì,
  `title` và `aria-label`. Đưa thao tác khóa, trạng thái và lịch sử vào màn hình
  mở từ nút đó. Giữ nguyên quyền hạn và xác nhận nghiệp vụ hiện có.
- Các nhóm tab dùng `AdminTabs` trong `shared/components/admin-tabs`. Chiếu
  các nút hiện có, giữ binding `.active` và handler của từng trang. Không dùng
  card thống kê làm tab hoặc bộ lọc.
- Khóa/mở khóa: dùng class `admin-lock-action` trên button hoặc `app-button`,
  đặt đầu footer có class `admin-modal-actions`. Nhóm bên trái dùng
  `admin-modal-actions-start`, nhóm lưu/hủy dùng `admin-modal-actions-end`.
  Icon ổ khóa lấy từ CSS dùng chung; không chèn thêm icon thứ hai. Trạng thái
  mở khóa thêm `admin-lock-action--unlock`. Nền mặc định trắng, hover và focus
  dùng màu đỏ. Modal xác nhận shared truyền `lockAction`; truyền `lockUnlocked`
  khi xác nhận mở khóa. Giữ nguyên handler, quyền hạn và điều kiện disabled.
- Bộ lọc phải xuống hàng theo chiều rộng vùng nội dung. Đặt nhóm xóa lọc/làm mới
  ở hàng riêng, cho phép wrap; không ép toàn bộ ô lọc và nút vào một hàng hẹp.
- Phân trang dùng `Pagination` trong `shared/components/pagination`, đặt cuối
  danh sách. `admin-ui.css` căn cụm điều khiển về bên phải, gồm cả trên màn hình nhỏ.
  `pageSize` phải trỏ tới đúng biến kích thước trang của component.
- Bảng danh sách tăng chiều cao theo số dòng của trang hiện tại. Wrapper chỉ
  cuộn ngang khi thiếu chiều rộng, không đặt chiều cao cố định hay header sticky.
  Khung hội thoại, dropdown và phần thân modal vẫn có thể cuộn riêng.
  Host của route, card chứa bảng và wrapper bảng phải có `flex-shrink: 0`
  (hoặc `flex: 0 0 auto`). Chỉ bỏ `max-height` không đủ nếu flex vẫn ép chiều cao.
- Lớp modal dùng `--z-modal` (1200), luôn trên `--z-sticky` (1100) của top bar
  và sidebar. Xác nhận tự viết dùng mức cộng 10/20; modal `shared` quản lý
  thứ tự mở trong stack và bắt đầu ở mức cộng 40. Không đặt số lớp riêng 60/1000.
  Modal admin dùng `fixedLayout` và `fitContent`: chỉ thân nội dung cuộn,
  còn tiêu đề, nút đóng và footer giữ trong viewport.

`admin-ui.css` được import một lần trong `src/styles.css`, giới hạn các quy tắc
trong `.admin-layout` để giữ giao diện customer độc lập. Không thêm font riêng
hoặc viết thêm một bộ phân trang ở từng trang quản trị.
