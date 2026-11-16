# Rà soát chức năng tài khoản ngày 10/11/2026

Phạm vi: `customer/auth`, `customer/profile`, `admin/auth`, `admin/employees`,
`admin/customers/accounts`, `admin/activity-logs`. Các mục lặp trong yêu cầu được
kiểm tra một lần. Không mở rộng OTP hoặc sửa mật khẩu/quyền của tài khoản thật.

## Thiết lập và chạy local

- `AccountsModule` và `AdminAuthModule` đã được đăng ký trong `AppModule`.
- Backend cổng 3000 đang phản hồi. Frontend cổng 4200 proxy `/api` sang backend.
- GET `/admin/auth/me` không có token trả 401 là kết quả đúng, không phải lỗi kết nối.
- Build backend thành công; build frontend development thành công.
- Schema Supabase: kiểm tra 22 bảng, không thiếu bảng/cột so với Prisma.
- Sau khi tắt server, chạy `npm run start:dev` trong `viago-backend` và
  `npm start -- --host 127.0.0.1 --port 4200 --hmr=false` trong `viago-frontend`.
- Đăng nhập seed admin chỉ được bật khi `NODE_ENV=development`,
  `ADMIN_ALLOW_LOCAL_SEED_LOGIN=true` và request tới backend qua loopback.
  Backend không tự viết lại hash admin khi đăng nhập. Production không chấp nhận seed.

## Kết quả kiểm tra

- `npm run test:accounts`: wiring HTTP, DTO, phân quyền, phiên, khóa tạm,
  kiểm tra mật khẩu, giới hạn thao tác theo tài khoản và che dữ liệu nhạy cảm: đạt.
- `node test/accounts-repairs.cjs`: xác nhận mật khẩu, thu hồi phiên và xử lý
  tệp đánh giá/rollback: đạt với mock và tệp tạm.
- `node test/accounts-readonly.cjs`: danh mục nhân viên, quyền, khách hàng,
  hạng thành viên, vé, voucher, hồ sơ và nhật ký trên Supabase thật: đạt, chỉ đọc.
- Frontend trong phạm vi: 26 kiểm thử, 10 file: đạt.
- Oxlint các thư mục backend trong phạm vi: đạt.
- Lượt toàn bộ frontend trước đó có hai lỗi ngoài phạm vi: kỳ vọng demo cũ
  trong `app.spec.ts` và vị trí lịch trong `admin/profile/profile.spec.ts`.
  Không sửa các phần đó trong đợt này.

## Giới hạn còn lại

1. Theo xác nhận đây là dữ liệu demo, đã hỗ trợ 10 tài khoản khách hàng dùng đúng
   giá trị `HASH_MAU_ddd` trong cột `matkhauhash` để đăng nhập local. Cần
   `NODE_ENV=development`, `CUSTOMER_ALLOW_LOCAL_SEED_LOGIN=true` và request loopback.
   Đăng nhập seed không đổi giá trị trong Supabase. Production không chấp nhận seed.
2. OTP nằm ngoài yêu cầu triển khai. Đăng ký, quên mật khẩu và tài khoản bật 2FA
   vẫn cần bằng chứng OTP hợp lệ; chưa dùng trọn luồng khi chưa có dịch vụ SMS.
   Không bỏ qua xác thực và không trả thành công giả.
3. TK006 là nhân viên bán vé, chưa có quyền quản lý khách hàng, nhân viên hoặc
   nhật ký. Backend trả 403 đúng; UI hiển thị lỗi trong bảng. Vai trò QuanTriVien
   được phép truy cập. Không tự cấp thêm quyền cho tài khoản thật.
4. Danh mục Supabase chưa có vai trò NhanVienCSKH riêng. UI dùng vai trò thực tế,
   không tự thêm vào cơ sở dữ liệu.
5. Tệp đánh giá lưu ở đĩa backend; metadata lưu trong Supabase. Khi triển khai
   nhiều instance hoặc máy chủ tạm thời cần cấu hình nơi lưu tệp bền vững.
6. Dữ liệu qua Supabase vẫn có độ trễ mạng. Danh mục và danh sách được tải đồng
   thời; UI hiện trạng thái đang tải và phân biệt lỗi với kết quả rỗng.

## Kết quả browser trên bản build rà soát

Lệnh `ACCOUNTS_TEST_FRONTEND=../../artifacts/accounts-review-20261110/browser`
kết hợp `node test/accounts-browser.cjs --test-build` đã chạy thành công:

- Đăng nhập admin và tạo phiên thật.
- Tạo/sửa khách hàng, khóa/mở khóa, tải lại vẫn đúng dữ liệu Supabase.
- Tạo/sửa nhân viên, tài khoản mới lưu hash mật khẩu; tải lại vẫn đúng dữ liệu.
- Có bản ghi audit thật và giao diện nhật ký tải được.
- Cập nhật email hồ sơ khách hàng, giữ nghề nghiệp tùy chỉnh và đồng bộ tài khoản.
- Lưu/tải lại hồ sơ từ frontend dùng Supabase.
- Cuối lượt, tài khoản, khách hàng, phiên và audit QA đã được dọn thành công.

Kiểm thử ghi dùng tài khoản QA riêng, không chỉnh sửa người dùng, quyền hay
mật khẩu có sẵn. Sáu endpoint đang chạy đều trả 401 đúng khi không có token,
xác nhận route đã được đăng ký và có bảo vệ truy cập.


## Full recheck after customer seed support

- Backend and development frontend builds passed.
- 26 focused frontend tests passed in 10 files.
- Accounts HTTP/security, customer seed login, review media/password repair, and session-activity tests passed.
- Live read-only Supabase checks passed.
- Browser E2E on accounts-full-recheck-20261110 passed: customer create/edit/lock/unlock, employee create/edit, audit records, customer profile save/reload. QA cleanup completed successfully.
- Protected requests still revalidate identity and permissions; session activity writes now occur only when the last known activity is over 60 seconds old.
- Running server customer demo login: 1928 ms; profile read: 3456 ms in the observed run. Logout revoked the session, and the stored sample password was unchanged. These are observations, not a latency guarantee.
- No real-account permissions or passwords were reset by this recheck. OTP remains out of scope.
