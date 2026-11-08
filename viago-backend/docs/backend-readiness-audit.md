# Kiểm tra backend và Supabase — 08/11/2026

Các trang trong phạm vi dưới đây đã kết nối API và Supabase. Có dữ liệu trong Supabase không đồng nghĩa dữ liệu đó đã phát sinh từ vận hành thực tế: các hồ sơ và liên hệ bổ sung là dữ liệu khởi tạo theo yêu cầu, dùng email `.invalid`.

## Nguồn dữ liệu theo trang

| Trang                            | Trạng thái hiện tại                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Admin khuyến mãi                 | API thật: danh sách, lọc, thống kê, tạo/sửa, điều kiện áp dụng, cấp voucher và lịch sử sử dụng                                |
| Admin tin tức                    | API thật: tạo/sửa, hẹn đăng, trạng thái và kiểm duyệt bình luận                                                               |
| Admin chính sách                 | API thật: nội dung, hiệu lực, khóa và phiên bản mức phí hủy                                                                   |
| Customer tin tức                 | API thật: danh mục, danh sách, chi tiết, lượt xem, bình luận, trả lời và lượt thích; đã xóa nguồn ARTICLES mẫu                |
| Customer chính sách / điều khoản | Đọc chính sách đang áp dụng từ cùng dữ liệu admin; không thay bằng nội dung mẫu khi API lỗi                                   |
| Customer FAQ                     | Đọc câu hỏi hoạt động từ Supabase                                                                                             |
| Customer về chúng tôi            | Nội dung giới thiệu và ảnh tĩnh theo quyết định đã chốt; các số tuyến, xe, chuyến lấy thống kê DB                             |
| Customer hướng dẫn mua vé        | Nội dung frontend tĩnh theo quyết định đã chốt                                                                                |
| Customer tuyển dụng              | API danh sách/chi tiết vị trí đang tuyển còn hạn, nộp CV multipart; tải lại danh sách khi quay lại tab                        |
| Customer liên hệ                 | POST thật vào `yeu_cau_lien_he`, chỉ báo tiếp nhận khi server thành công                                                      |
| Customer trang chủ / voucher     | Các dữ liệu nghiệp vụ qua API; điều kiện và số tiền giảm được tính lại phía server. Banner và ảnh trình bày vẫn là asset tĩnh |

Backend có bản nội dung `noi_dung_trang` phục vụ cấu hình và chatbot. Điều này không thay đổi quyết định giữ nội dung giới thiệu và hướng dẫn trên frontend ở dạng tĩnh.

## Quản lý liên hệ và tuyển dụng

- `/admin/customers/contacts`: bảng gọn có mã, khách hàng/email/điện thoại, chủ đề/nội dung, trạng thái, ưu tiên, người phụ trách và cập nhật gần nhất. Mở chi tiết để phân công, đổi trạng thái, ghi chú, soạn phản hồi và xem lịch sử.
- `/admin/staff/applications`: bảng có mã hồ sơ, ứng viên, vị trí, kinh nghiệm đã thu thập, trạng thái, người phụ trách, ngày nộp/lịch phỏng vấn và thao tác CV. Chi tiết có CV PDF xem trực tiếp, CV Word tải xuống, đánh giá, lịch phỏng vấn theo giờ Việt Nam, kết quả và lịch sử.
- `/admin/staff/jobs`: tạo/sửa vị trí, nội dung, yêu cầu, quyền lợi, thời hạn, hình thức và thông tin liên hệ tuyển dụng. Tin `DangTuyen` còn hạn xuất hiện trên customer ngay từ lần tải API tiếp theo. Tạm dừng, đóng hoặc hết hạn thì không nhận hồ sơ mới; hồ sơ cũ được giữ nguyên.
- Card thống kê là dữ liệu hiển thị tĩnh, không có hành vi lọc. Các bộ lọc tách riêng. Card, modal, nút, input, select, textarea, lịch, badge và phân trang dùng component shared. Danh sách dùng bảng HTML có tiêu đề cột, hỗ trợ cuộn ngang. Phân trang đặt bên phải.
- API yêu cầu phiên admin thực; danh tính nhân viên lấy từ phiên. Đổi trạng thái và metadata ghi cùng transaction với lịch sử. Phiên bản ngăn bản chỉnh sửa cũ ghi đè thay đổi mới, kể cả khi trạng thái không thay đổi. Đăng tuyển cũng kiểm tra phiên bản.

Bảng mới `quan_ly_tiep_nhan` lưu phân công, ưu tiên, đánh giá, lịch phỏng vấn, bản nháp phản hồi, thời gian cập nhật và phiên bản. Bảng bật RLS và không cấp quyền trực tiếp cho `anon`/`authenticated`; frontend dùng API có xác thực.

**Phản hồi liên hệ:** hiện lưu bản nháp và mở ứng dụng email để nhân viên kiểm tra rồi gửi. Dự án chưa cấu hình dịch vụ gửi email; giao diện không đánh dấu bản nháp là “đã gửi”. Đặt lịch phỏng vấn cũng chưa tự gửi email/SMS hoặc lời mời lịch.

## Dữ liệu thực tế và khóa

| Nhóm               | Số bản ghi đã kiểm tra                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| Tin tức / danh mục | 75 / 6                                                                    |
| Chính sách         | 5                                                                         |
| Khuyến mãi         | 22 bản ghi admin; API công khai lọc theo điều kiện                        |
| FAQ                | 7                                                                         |
| Vị trí tuyển dụng  | 4 tin đang có; admin đã có chức năng tạo mới                              |
| Hồ sơ ứng tuyển    | 15, gồm 12 hồ sơ thêm `UV001`–`UV012`; giữ nguyên 3 mã `HS001`–`HS003` cũ |
| Liên hệ            | 12, gồm 9 liên hệ thêm `LH004`–`LH012`; giữ nguyên `LH001`–`LH003`        |

Hồ sơ bổ sung tham chiếu các tin `TD001`–`TD004` đang có. Mã mới được cấp qua sequence PostgreSQL: `UV`, `LH`, `TD`, `TT`, `CS` và các tiền tố nghiệp vụ khác; không đổi khóa đang tồn tại sang UUID. Sequence có thể có khoảng trống do transaction thử/rollback. UUID trong tên file CV cũ là tham chiếu kho riêng, không phải khóa nghiệp vụ.

## Kiểm tra và giới hạn

- Build backend và production frontend thành công. Bundle initial sau tải lười khoảng 345 kB, không tăng giới hạn budget. Còn hai cảnh báo CSS cũ ở đặt vé mới và báo cáo hủy vé.
- 48 test frontend trong phạm vi nội dung/intake và 7 unit test backend đạt.
- Prisma schema hợp lệ. Integration intake đạt 11 nhóm với Supabase: xác thực, gửi liên hệ, phân công/ưu tiên/bản nháp, xung đột phiên bản, nộp/tải CV, chống trùng, xử lý hồ sơ, đánh giá/lịch phỏng vấn và chu trình đăng/sửa/đóng vị trí. Dữ liệu thử nằm trong transaction rollback; file thử và phiên thử được dọn.
- Integration nội dung đạt 7 nhóm: phân quyền/danh tính, tạo/sửa tin hiển thị công khai, bình luận/trả lời/thích, kiểm duyệt, hiệu lực/khóa chính sách, phiên bản phí hủy, khuyến mãi và tính giảm giá phía server.
- Đã kiểm tra API qua chính proxy `http://localhost:4200`: hồ sơ 15, liên hệ 12, vị trí 4; các API admin trả 401 khi thiếu phiên. CV `UV001` tải được.
- Lần chạy bộ frontend tổng trước đó còn 4 lỗi ngoài phạm vi: kỳ vọng demo của `app.spec.ts`, logger đăng ký tài khoản, định vị lịch profile và chuẩn hóa ngày ở quản lý nhân viên. Không thay kỳ vọng để che lỗi. Các kiểm tra phạm vi nội dung/intake được chạy riêng.
- Chưa kiểm tra trực quan trong trình duyệt: Computer Use đã từ chối quyền điều khiển Google Chrome. Build và test DOM/API không thay thế kiểm tra trực quan.
- CV nằm trong `CV_UPLOAD_DIR` riêng tư trên backend, chưa chuyển sang Supabase Storage. Cần volume bền vững hoặc bucket riêng tư khi triển khai. Tham chiếu CV cũ thiếu file trả 404 trung thực.
- Đăng nhập khách hàng mock trong `AuthService` là phần còn lại ngoài phạm vi này. Ví voucher cá nhân cần phiên backend thật; không kết luận toàn bộ xác thực khách hàng đã hoàn thiện.
- Chưa tách quyền HR/CSKH riêng; API theo cơ chế phiên nhân viên đang có. Không suy diễn đã đánh giá toàn bộ RLS, backup hoặc tải hệ thống.

Xem [hướng dẫn thiết lập và chạy kiểm tra](intake-content-setup.md). Các thay đổi hiện ở workspace, chưa thực hiện một lần push GitHub mới cho đợt bổ sung này.
