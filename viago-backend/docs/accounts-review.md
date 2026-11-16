# Rà soát frontend – backend – Supabase (09/11/2026)

Phạm vi: customer auth/profile, admin auth, quản lý nhân viên/khách hàng và nhật
ký. Đối chiếu các màn thực tế `/customer/profile`, `/admin/staff/accounts`,
`/admin/customers/accounts`, `/admin/logs`, không lấy folder placeholder làm chuẩn.

## Các lỗi dữ liệu đã sửa trong lượt rà soát

1. **Nghề nghiệp ngoài danh sách:** giữ nguyên giá trị Supabase và bổ sung lựa chọn
   tương ứng trên form; sửa email/ngày sinh không tự đổi nghề thành “Khác”.
2. **Hạng thành viên ngừng áp dụng:** lưu thông tin khác không gửi thao tác xóa hạng.
   Chỉ xóa khi người dùng chọn “Không có”; hạng mới không hợp lệ bị từ chối rõ ràng.
3. **Điểm tích lũy:** hiển thị `khach_hang.diemtichluy`, không tự tính từ chi tiêu.
4. **Điều kiện và quyền lợi hạng:** đọc `bang_hang_thanh_vien` và
   `dac_quyen_hang_thanh_vien` đang hoạt động. Không hardcode số vé, số tiền hay
   lời hứa giảm giá/quà tặng. Không suy ra hạng mới thay cho giá trị hồ sơ.
5. **Ví voucher khi đổi tài khoản:** ví gắn với customerId đã tải; không hiển thị ví
   tài khoản trước trong lúc tài khoản sau đang tải. Phân biệt chưa đến hạn, đang
   giữ, đã dùng, hết hạn và bị thu hồi; không gắn nhãn “Đã dùng” cho mọi voucher
   không khả dụng.
6. **Ngày khóa tài khoản:** backend trả `ngaykhoa`, frontend hiển thị ngày thật thay
   vì chuỗi rỗng hoặc tự tạo thời điểm hiện tại.

## Kiểm chứng

- 18 kiểm thử frontend (6 file) đã qua, gồm giữ nghề tự do/điểm/đặc quyền thật,
  không xóa hạng cũ ngoài ý muốn, cô lập ví theo tài khoản, chờ khôi phục hồ sơ,
  không báo lưu thành công khi server từ chối và không phát phiên trước 2FA.
- Bộ kiểm thử backend tài khoản/bảo mật đã qua; kiểm tra ràng buộc OTP, khóa sau
  năm lần sai, password hash, thu hồi phiên, quyền quản trị và che bí mật nhật ký.
- Đọc metadata trực tiếp: đủ **22 bảng**, không thiếu cột trong Prisma schema được
  các tính năng này sử dụng. Bao gồm bảng đặc quyền hạng thành viên.
- Kiểm tra SELECT trực tiếp trên Supabase cho nhân viên, khách hàng, hồ sơ,
  hạng/quyền, lịch sử vé, voucher và nhật ký đã qua.
- Kiểm thử trình duyệt dùng tài khoản QA riêng, đối chiếu database sau lưu và
  sau tải lại; dọn bản ghi QA theo ID/marker của chính lượt kiểm thử. Không đổi
  mật khẩu hay quyền của tài khoản đang dùng.
- Lượt chạy toàn bộ `node test/accounts-browser.cjs --test-build` đã qua: đăng nhập
  quản trị, tạo/sửa/khóa/mở khóa khách hàng, tạo/sửa nhân viên, nhật ký, đăng nhập
  khách hàng, sửa email giữ nguyên nghề nghiệp tự do và lưu/tải lại hồ sơ. Dữ liệu
  QA đã được dọn thành công.

## Phần còn cần cấu hình

- **Dữ liệu mật khẩu:** thống kê không hiển thị hash phát hiện 10 tài khoản có
  `matkhauhash` không đúng định dạng backend hỗ trợ; cũng không có định dạng
  bcrypt/argon2 tiêu chuẩn trong nhóm này. Không tự coi các giá trị đó là mật khẩu
  rõ, không reset tài khoản đang dùng. Cần dữ liệu hash hợp lệ hoặc chủ tài khoản
  đặt lại mật khẩu trước khi có thể xác nhận đăng nhập cho nhóm này. Đã bổ sung
  dấu nhận biết và nút **Bảo mật đăng nhập → Đặt mật khẩu mới** trong quản lý khách
  hàng để sửa từng tài khoản bằng xác nhận quản trị, không cần triển khai thêm OTP.

- OTP: không triển khai thêm theo yêu cầu người dùng; giữ kiểm tra xác thực cũ.
- Vai trò CSKH riêng chưa có trong danh mục Supabase; UI không tự thêm vai trò.
- Upload đánh giá đã hoạt động: tệp nằm trên backend, metadata trong
  `tep_danh_gia` trên Supabase; khi deploy cần volume bền vững. Không cần bucket
  Supabase Storage. Avatar vẫn dùng cột có sẵn.

## Kiểm chứng lượt sửa mật khẩu và upload

`node test/accounts-browser.cjs --test-build --repairs` đã qua: quản trị đặt mật
khẩu mới cho tài khoản QA có hash lỗi, khách đăng nhập thành công; gửi ảnh đánh
giá từ frontend tạo metadata thật trong Supabase và tải lại được đúng byte tệp.
Lịch, vé, tài khoản, đánh giá và tệp QA đã dọn sạch. Không đổi 10 mật khẩu đang có
sang một mật khẩu mặc định, không can thiệp vé/lịch đang dùng của nhóm.

Lệnh và hợp đồng API: [accounts-api.md](accounts-api.md).


## Integration update 2026-11-10

Frontend API bindings are enabled for customer auth/profile, admin customers, employees, and activity logs. Existing layouts are preserved. Customer password reset UI is not included in this integration.

The admin route uses one child guard. A successful login validates the in-memory session for 30 seconds; simultaneous restores share one request. This cache is only for routing: backend endpoints still validate sessions and permissions on each protected request. A reload revalidates the stored token.

Existing Supabase permissions are unchanged. TK006 (NhanVienBanVe) does not have account-management or audit-log permissions. TK009 (QuanTriVien) can access the management screens. No staff passwords or permissions are changed by API wiring.

For local seed login, set NODE_ENV=development and ADMIN_ALLOW_LOCAL_SEED_LOGIN=true. The backend accepts an exact HASH_MAU_ddd match only for loopback requests in that mode and never rewrites the stored admin hash. The example configuration disables this feature. Production rejects seed values.

Focused frontend verification: 23 tests across 9 files passed. The earlier whole-suite run had two unrelated failures in app.spec.ts (old demo expectation) and admin/profile/profile.spec.ts (calendar layout).
