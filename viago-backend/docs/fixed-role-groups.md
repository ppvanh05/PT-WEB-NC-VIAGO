# Nhóm vai trò cố định

Người quản lý chọn một nhóm vai trò, không chọn từng quyền hoặc từng nhóm chức
năng. Danh sách chức năng bên dưới trong tab Phân quyền chỉ để xem.

| Vai trò | Nhóm chức năng | Số quyền hiện tại |
|---|---|---|
| Nhân viên bán vé | Vé và Báo cáo | 14 |
| Nhân viên điều phối | Điều hành, Báo cáo, Nhật ký | 13 |
| Ban quản lý | Báo cáo | 7 |
| Quản trị viên | Toàn bộ 13 nhóm cùng quyền dùng chung | 36 |

Các nhóm nhân viên kèm quyền đăng nhập nội bộ và hồ sơ cá nhân. Nguồn định nghĩa
duy nhất là `src/shared/accounts/fixed-role-permissions.ts` ở backend. FE nhận
`roleGroups` qua `GET /admin/employees/options`, không tự quyết định mã quyền.
Chỉ các vai trò đang tồn tại và hoạt động trong Supabase được trả về.

## Lưu dữ liệu

- POST nhân viên: gửi roleId; backend tự xác định toàn bộ mã quyền của nhóm.
- PUT nhân viên: chọn nhóm trên FE gửi `applyRolePermissions: true`. Backend
  thay bộ quyền trong cùng transaction với cập nhật vai trò và audit.
- PUT chỉ sửa thông tin: `applyRolePermissions: false` hoặc bỏ trường này.
  Vai trò phải giữ nguyên; các quyền cũ và metadata cấp quyền được bảo toàn.
- FE không gửi danh sách permissions. Trường legacy nếu được gửi phải đúng bộ
  quyền backend xác định; thêm/bớt quyền riêng lẻ bị từ chối 400.
- Thiếu mã quyền cần thiết trong catalog: từ chối áp dụng nhóm, không cấp nhóm thiếu.
- Người không phải quản trị không được cấp nhóm vượt quyền của mình. Giữ quy
  tắc không tự thay vai trò/quyền và không làm mất quản trị cuối cùng.

## Tài khoản hiện có

Không có migration tự động. Tài khoản cũ giữ quyền đang lưu. Khi cần chuyển sang
bộ cố định, người có quyền chọn lại nhóm và bấm Lưu thay đổi. Đăng nhập lại hoặc
tải lại trang để lấy quyền mới. FE lọc menu từ quyền thực tế BE trả về, gồm alias
và chặn truy cập URL trái quyền. Ngoại lệ quản trị của AccountsGuard vẫn giữ nguyên.

Không thay bảng, thêm vai trò, đổi mật khẩu hay quyền của tài khoản thật để kiểm thử.
Các API khác chưa có guard quyền riêng không được mở rộng trong thay đổi này.
Quyền hộp thư CSKH vẫn có quy tắc riêng hiện hữu.

## Kiểm thử

- `node test/fixed-role-permissions.cjs`: bộ quyền đúng theo nhóm, từ chối quyền
  lẻ/cấp vượt quyền/catalog thiếu; sửa thông tin không đổi quyền cũ.
- `node test/fixed-role-browser.cjs`: build FE development vào
  `../artifacts/fixed-role-build`, rồi thử chọn nhóm/lưu Supabase/đăng nhập/menu
  với dữ liệu QA riêng và tự dọn.
