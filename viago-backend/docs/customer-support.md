# Chatbot VIAGO

Module điều phối: `src/featured/customer/chatbot/`. Provider LLM:
`src/integrations/chatbot/`. Dùng Prisma/PostgreSQL và các bảng nghiệp vụ
hiện có; không tạo lại vé, đơn, ghế, thanh toán hay tài khoản.

Thư mục chatbot được chia theo trách nhiệm:

```text
chatbot/
  chatbot.module.ts
  auth/           # Xác thực và phân quyền
  common/         # DTO, mã nghiệp vụ, trạng thái, validation
  conversation/   # API khách và điều phối hội thoại
  knowledge/      # API tài liệu, RAG, FAQ, knowledge dự án
  tools/          # Định nghĩa công cụ truy vấn chỉ đọc
  realtime/       # Luồng sự kiện SSE
```

Hộp thư nhân viên nằm tại `src/featured/admin/customers/support/`, gồm
`controllers/`, `services/`, `dto/`. Module admin dùng lại các thao tác
điều phối và sự kiện của chatbot; không có bộ bảng hội thoại thứ hai.

## CSDL và chuyển đổi từ bản cũ

Chạy từ `viago-backend`:

```bash
npm run chatbot:db:setup
npm run prisma:generate
npm run chatbot:knowledge:sync
npm run chatbot:status
```

`prisma/sql/customer-support.sql` chạy trong transaction, đổi tên ba bảng
cũ và các cột sang tiếng Việt, chuyển enum, bổ sung các bảng còn thiếu,
backfill bộ nhớ/yêu cầu/phân công cũ. Có kiểm tra số lượng hội thoại,
tin nhắn và sự kiện trước/sau. Lỗi sẽ rollback. Có thể chạy lại; nếu đồng
thời có bảng cũ và mới thì dừng để tránh gộp nhầm. Không reset database.

| Bảng | Chức năng |
| --- | --- |
| `hoi_thoai_chatbot` | Chủ sở hữu phiên, trạng thái, nhân viên, khóa xử lý |
| `tin_nhan_chatbot` | Tin nhắn khách/AI/nhân viên/hệ thống |
| `bo_nho_chatbot` | Tóm tắt và điều kiện tìm chuyến đã xác nhận |
| `yeu_cau_chuyen_tiep_chatbot` | Lý do, loại vấn đề, ưu tiên, xác nhận, kết quả |
| `phan_cong_chatbot` | Lịch sử tiếp nhận/chuyển nhân viên |
| `danh_muc_kien_thuc_chatbot` | Danh mục tài liệu |
| `tai_lieu_kien_thuc_chatbot` | Nguồn, hash, nội dung, trạng thái tài liệu |
| `doan_kien_thuc_chatbot` | Đoạn truy hồi và vector 1536 chiều |
| `su_kien_chatbot` | Nhật ký SSE để nối lại không mất tin |

Tám bảng nghiệp vụ theo tài liệu thiết kế, cộng bảng sự kiện phục vụ
streaming hiện có. `SupportConversation`, `SupportMessage`, `SupportEvent`
không còn là tên bảng sau nâng cấp; lịch sử giữ bằng đổi tên tại chỗ.
Tên bảng/cột thật và enum dùng tiếng Việt: `mahoithoai`, `trangthai`,
`thoigiantao`, `TroLyAI`, `ChoXacNhan`, `ChoNhanVien`, `NhanVienHoTro`,
`DaGiaiQuyet`, `DaDong`. Một số thuộc tính Prisma giữ alias qua `@map`
để giữ hợp đồng HTTP của widget; tên cột persisted vẫn là tiếng Việt.
Khóa nghiệp vụ dùng `varchar`, mã mới có tiền tố `HT`, `TN`, `BN`, `YCCT`,
`PCCT`, `DMKT`, `TLKT`, `DKT`. Không dùng kiểu UUID cho khóa chính/khóa ngoại.
Giá trị mã cũ giữ nguyên khi chuyển kiểu để bảo toàn lịch sử và liên kết.
`su_kien_chatbot.masukien` vẫn là số nguyên tăng dần phục vụ cursor SSE.
Mã yêu cầu từ client chỉ dùng chống gửi trùng, không phải khóa chính.

## Luồng xử lý

1. Lưu tin theo mã yêu cầu chống trùng; kiểm tra chủ sở hữu tại backend.
2. Đang chờ/được nhân viên hỗ trợ: chỉ lưu và phát tin, không gọi AI.
3. Backend kiểm tra yêu cầu gặp người thật, sự cố tiền/vé và tình huống
   nghiêm trọng trước LLM; các trường hợp này chuyển ngay.
4. Trường hợp khác: LLM phân tích JSON đã kiểm tra kiểu, đọc bộ nhớ, gọi
   công cụ chỉ đọc. Thiếu điều kiện tìm chuyến thì hỏi tiếp.
5. Không giải quyết chắc chắn, thiếu nguồn hoặc provider lỗi: đề xuất
   `ChoXacNhan`. Khách đồng ý mới vào hàng đợi. Từ chối thì tiếp tục AI.
   Đề xuất hết hạn sau 10 phút; im lặng không tự chuyển nhân viên.
6. Tiếp nhận/chuyển nhân viên dùng transaction, khóa hội thoại và partial
   unique index: một yêu cầu mở/hội thoại, một phân công mở/yêu cầu.
7. Giải quyết xong lưu kết quả và lịch sử; khách tiếp tục hỏi AI được trong
   cùng hội thoại. Đóng hẳn dùng trạng thái riêng `DaDong`.

SSE phát sự kiện từ PostgreSQL, polling 500 ms, có cursor nối lại. Chưa dùng
Supabase Realtime trực tiếp vì widget hiện nối SSE NestJS. Mọi thao tác
chuyển tiếp/phân công vẫn qua backend. RLS bật trên cả chín bảng, không
cấp frontend quyền ghi trực tiếp. Backend dùng DB owner; nếu dùng role
riêng cần cấp quyền/policy thích hợp.

## Knowledge và nguồn đã rà soát

`knowledge/project-knowledge.ts` chứa kiến thức đối chiếu nghiệp vụ và đường
dẫn nguồn từng mục. Không nạp toàn bộ code, secret, mock data hoặc transcript
của người khác cho AI. Các nguồn chính:

| Phạm vi | Nguồn | Cách sử dụng |
| --- | --- | --- |
| Chuyến/giá/ghế | `home.service.ts`, `home.dto.ts`, `lich_trinh`, `ghe_chuyen`, `tuyen_xe`, `xe` | Tra lại trong lượt hiện tại |
| Đặt vé/giữ ghế/khứ hồi | `home-booking.service.ts` | Tối đa 10 phút; theo `expiresAt` thực tế, không hứa giữ chỗ |
| Thanh toán | `home-booking.service.ts`, `home.guard.ts`, `home.service.ts` | VietQR/SePay theo cấu hình runtime; không tự xác nhận tiền/vé |
| Đơn/vé/thanh toán riêng | `home-promotions.service.ts`, `phien_dang_nhap`, `don_hang`, `ve_xe`, `thanh_toan` | Xác thực Bearer tại backend, lọc theo khách sở hữu |
| FAQ | `faq` đang `HoatDong` | Truy hồi có dấu/không dấu, dẫn nguồn |
| Chính sách | `chinh_sach` đang áp dụng và đến ngày hiệu lực | Tra trực tiếp, ưu tiên hơn FAQ/tài liệu |
| Hoàn/hủy | `chinh_sach_huy`, `chi_tiet_chinh_sach_huy` còn hiệu lực | Tra ngưỡng giờ/tỷ lệ; không áp dụng vào vé cá nhân chưa xác minh |
| Liên hệ/hướng dẫn/tuyển dụng/tin tức | `customer/about`, `customer/news`, Angular routes | Hướng dẫn đúng chức năng; liên hệ lấy cấu hình |
| Hội viên/ưu đãi | `home-promotions.service.ts`, schema hội viên/voucher | Không hứa ưu đãi khi chưa kiểm tra điều kiện trên đơn |
| Thuê xe/hóa đơn/đồ thất lạc/báo cáo/điều phối | Prisma schema và Angular | Không suy ra có API vận hành từ schema/màn hình |
| Đăng nhập/tra cứu Angular | `auth.service.ts`, `ticket-lookup.ts`, `schedule.ts`, `profile.ts`, `lost-and-found` | Có Firebase/mock/localStorage; không coi là phiên backend/dữ kiện giao dịch |

RAG lưu hướng dẫn đã rà soát và tài liệu quản trị. FAQ/chính sách/giá/ghế
truy vấn trực tiếp, không sao chép vào kho tĩnh. Khi sửa nghiệp vụ, cập
nhật mục knowledge liên quan rồi chạy `npm run chatbot:knowledge:sync`.
Hash giúp không xử lý lại nội dung không đổi.

Mặc định tìm từ khóa tiếng Việt không dấu. Bật tìm vector bằng
`CHATBOT_EMBEDDINGS_ENABLED=true` và `OPENAI_API_KEY` rồi reprocess tài liệu.
Model nhúng cố định `text-embedding-3-small`, `dimensions=1536` cho index
và query; không trộn không gian vector. Khi nhúng lỗi vẫn tìm từ khóa.
Chưa bật thì vector để NULL. API theo
[OpenAI Docs](https://developers.openai.com/api/reference/resources/embeddings/methods/create).

## API và phân quyền

Khách dùng `/customer/chatbot`, cookie HttpOnly ngẫu nhiên; backend lưu
hash. ID client gửi không thay thế kiểm tra quyền sở hữu.

| Method | Đường dẫn tương đối | Tác dụng |
| --- | --- | --- |
| POST / GET | `/conversations` | Tạo / liệt kê hội thoại của phiên |
| GET | `/conversations/:id` | Snapshot tin nhắn và cursor |
| GET / POST | `/conversations/:id/messages` | Đọc / gửi `{clientMessageId,text}` |
| GET | `/conversations/:id/events?after=0` | SSE |
| POST | `/conversations/:id/handoff` | Khách chủ động yêu cầu nhân viên |
| POST | `/conversations/:id/handoff/confirm` | Đồng ý đề xuất còn hiệu lực |
| POST | `/conversations/:id/handoff/decline` | Từ chối, tiếp tục AI |
| POST | `/conversations/:id/resume` | Quay lại AI khi chưa có nhân viên nhận |
| POST | `/conversations/:id/close` | Đóng khi không có ca đang xử lý |

HTTP giữ `BOT`, `AWAITING_CONFIRMATION`, `QUEUED`, `ASSIGNED`, `RESOLVED`,
`CLOSED`; `common/chatbot.state.ts` chuyển từ enum tiếng Việt trong DB. Widget
có hai nút xác nhận/từ chối và cập nhật trạng thái ngay qua SSE.

Hộp thư `/admin/support` xác thực bằng phiên của đăng nhập chính `/admin/login`;
phân quyền chi tiết cấu hình sau. Ngữ cảnh nhân viên lấy
từ tài khoản admin đang đăng nhập, ánh xạ nhân viên hoạt động trong CSDL. Có queue, chi tiết, `claim`, `messages`,
`draft`, `translate`, `resolve`, `close`, `reassign` với `{staffId}`. Chỉ nhân viên
phụ trách được trả lời, tạo nháp, giải quyết hoặc chuyển ca. Người nhận
chuyển cũng phải đang hoạt động. Nháp AI không tự gửi.

Màn hình **Khách hàng → Hộp thư hỗ trợ** và thiết lập tài khoản được mô tả
trong [admin-customer-support.md](admin-customer-support.md).

Knowledge `/admin/knowledge` cần quyền `CSKH_KIEN_THUC` (biến
`CHATBOT_KNOWLEDGE_PERMISSION`), tách khỏi quyền chat:

- `GET /documents`, `GET /documents/:id`.
- `POST /documents`: `{title,source,content,url?,category?}`, văn bản tối
  đa 40.000 ký tự, `source` dạng `tai-lieu:ten-tai-lieu`.
- `POST /documents/:id/reprocess`, `DELETE /documents/:id` (ẩn truy hồi).
- `POST /sync-project`: cập nhật knowledge từ dự án.

API nhận văn bản đã trích xuất, chưa upload PDF/binary hoặc tự tải URL.
`lookup_booking` không nhận customerId/SĐT/token từ AI: backend xác thực
Bearer request và lọc theo `makhachhang`, không trả tên/liên hệ/token vé
hoặc dữ liệu thanh toán nhạy cảm. Khách chưa xác thực vẫn dùng FAQ/tìm
chuyến. Repo chưa có endpoint đăng nhập backend phát hành phiên này;
Firebase/localStorage không thay thế nó. Chưa bổ sung dashboard inbox
nhân viên mới trong thay đổi này.

## Kiểm tra và giới hạn

Provider LLM giữ cấu hình hiện có: `CHATBOT_PROVIDER` openai/groq/ollama,
`OPENAI_API_KEY`, `OPENAI_MODEL`, hoặc biến của provider tương ứng. Chỉ
backend giữ khóa. Không tự đổi model; embeddings có chi phí API khi bật.

```bash
npm run prisma:validate
npm run lint
npm run build
```

Các file kiểm thử chatbot và script chạy suite riêng đã được dọn theo yêu
cầu. `chatbot:status` và `chatbot:knowledge:sync` là công cụ vận hành được giữ.
Rate limit
20 write/120 read mỗi phút và tối đa 4 SSE/phiên trong bộ nhớ tiến trình;
nhiều replica cần limiter chung. Xác nhận/khóa hết hạn được phục hồi khi
đọc/gửi/poll; chưa có worker khi không có traffic. Chưa có lịch dọn lịch
sử tự động hoặc benchmark RAG/dự báo bức xúc trên dữ liệu thật.

Chỉ chạy một backend trên cổng cấu hình. Trên Windows, Prisma generate
cần phiên backend thả khóa engine DLL; dừng đúng phiên rồi tạo client
và chạy lại. Không dừng ứng dụng khác để chiếm cổng.
