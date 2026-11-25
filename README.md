# VIAGO

VIAGO là website đặt vé và hỗ trợ hành trình xe khách thông minh. Repository gồm hai ứng dụng độc lập:

- `viago-frontend`: Angular 22, TypeScript, giao diện Customer và Admin.
- `viago-backend`: NestJS 12, Prisma ORM, PostgreSQL và REST API.

## Tính năng chính

### Phân hệ khách hàng

- Tìm kiếm chuyến xe theo điểm đi, điểm đến, ngày đi và số vé.
- Xem lịch trình, loại xe, giá vé, điểm đón/trả và tiện nghi.
- Chọn ghế, giữ chỗ, nhập thông tin hành khách và đặt vé.
- Thanh toán VietQR/SePay hoặc thanh toán trực tiếp theo nghiệp vụ hỗ trợ.
- Tra cứu, chỉnh sửa, chia sẻ, in và hủy vé theo chính sách.
- Nhận vé điện tử có mã QR và tra cứu hóa đơn.
- Đăng ký, đăng nhập, OTP, hồ sơ cá nhân, lịch sử mua vé, hạng thành viên và voucher.
- Tin tức, khuyến mãi, đánh giá chuyến đi, thuê xe hợp đồng và đồ thất lạc.
- Chatbot hỗ trợ và chuyển tiếp hội thoại cho nhân viên khi cần.

### Phân hệ quản trị và nhân viên

- Đăng nhập nội bộ và kiểm soát quyền theo vai trò.
- Đặt vé tại quầy/hotline, quản lý đơn hàng, vé, đổi ghế, hủy vé và hoàn tiền.
- Quản lý tuyến xe, lịch trình, điểm đón/trả, phương tiện, tài xế và phụ xe.
- Quản lý tài khoản khách hàng, tài khoản nhân viên và hồ sơ tuyển dụng.
- Xử lý liên hệ, đánh giá, hỗ trợ khách hàng, chatbot và đồ thất lạc.
- Quản lý tin tức, chính sách, khuyến mãi và từ khóa cấm.
- Tiếp nhận thuê xe hợp đồng, báo giá và theo dõi hợp đồng.
- Báo cáo doanh thu, khách hàng, tài xế/phụ xe, tuyến xe, hoàn hủy và nhật ký hoạt động.

## Kiến trúc thư mục

```text
VIAGO/
├── .vscode/                    # Cấu hình workspace
├── viago-frontend/             # Angular application
│   ├── public/                 # Ảnh, logo và tài nguyên tĩnh
│   ├── src/app/core/           # Layout, guard, service dùng chung
│   ├── src/app/shared/         # Component, model và style dùng lại
│   ├── src/app/featured/
│   │   ├── customer/           # Phân hệ khách hàng
│   │   └── admin/              # Phân hệ quản trị/nhân viên
│   ├── scripts/                # Script kiểm tra và smoke test frontend
│   ├── docs/                   # Tài liệu frontend và luồng nghiệp vụ
│   ├── angular.json
│   ├── proxy.conf.json
│   └── package.json
├── viago-backend/              # NestJS application
│   ├── prisma/                 # Schema, dữ liệu mẫu và SQL hỗ trợ
│   ├── src/featured/customer/  # API nghiệp vụ phía khách hàng
│   ├── src/featured/admin/     # API nghiệp vụ phía quản trị
│   ├── src/integrations/       # Chatbot và tích hợp bên ngoài
│   ├── src/shared/             # Thành phần dùng chung
│   ├── test/                   # Integration, E2E và smoke test
│   ├── scripts/                # Script seed, đồng bộ và kiểm tra dữ liệu
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

Mỗi ứng dụng có `package.json`, `package-lock.json` và `node_modules` riêng. Chạy lệnh npm trong đúng thư mục ứng dụng.

## Yêu cầu môi trường

- Node.js tương thích với Angular 22 và NestJS 12.
- npm 11.x; frontend khai báo `npm@11.12.1` trong `packageManager`.
- PostgreSQL hoặc Supabase PostgreSQL.
- Git và Visual Studio Code hoặc trình soạn thảo tương đương.
- Tùy chọn: Ollama hoặc API provider được cấu hình nếu muốn chạy chatbot AI.

## Cài đặt và chạy Backend

```bash
cd viago-backend
npm ci
```

Tạo file `.env` từ file mẫu:

```powershell
Copy-Item .env.example .env
```

Điền tối thiểu `DATABASE_URL`. Nếu dùng Supabase/Prisma CLI, cấu hình thêm `DIRECT_URL`. Sau đó chạy:

```bash
npm run prisma:generate
npm run prisma:validate
npm run start:dev
```

Backend mặc định chạy tại `http://localhost:3000`.

Các lệnh thường dùng:

```bash
npm run build          # Build NestJS vào dist/
npm run start:prod     # Chạy dist/main.js
npm run lint           # Kiểm tra mã nguồn bằng Oxlint
npm test               # Unit test
npm run test:e2e       # E2E test
```

## Cấu hình Backend

File mẫu đầy đủ: [`viago-backend/.env.example`](viago-backend/.env.example).

| Biến | Mục đích |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL dùng lúc chạy ứng dụng |
| `DIRECT_URL` | Connection string trực tiếp cho Prisma CLI |
| `PORT` | Port Backend, mặc định `3000` |
| `FRONTEND_ORIGIN` | Origin được phép gọi API, mặc định `http://localhost:4200` |
| `SEPAY_MODE` | Chế độ thanh toán SePay, dùng `test` khi phát triển |
| `SEPAY_WEBHOOK_SECRET` | Secret xác minh webhook SePay |
| `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO` | Thông tin tạo mã VietQR |
| `ACCOUNT_OTP_MODE` | Dùng `test` để hiển thị OTP trong terminal khi phát triển |
| `ACCOUNT_SMS_WEBHOOK_URL` | Webhook SMS khi dùng OTP thật |
| `CHATBOT_PROVIDER` | Provider chatbot: `openai`, `groq` hoặc `ollama` |
| `OPENAI_API_KEY`, `GROQ_API_KEY` | Khóa API tương ứng nếu dùng provider online |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Địa chỉ và model khi dùng Ollama local |
| `CV_UPLOAD_DIR`, `REVIEW_UPLOAD_DIR`, `LOST_ITEM_UPLOAD_DIR` | Thư mục lưu file tải lên |
| `ADMIN_ALLOW_LOCAL_SEED_LOGIN`, `CUSTOMER_ALLOW_LOCAL_SEED_LOGIN` | Chỉ bật trong môi trường local cô lập |

Không commit `.env`, password, API key, webhook secret hoặc thông tin tài khoản thật.

## Cài đặt và chạy Frontend

Mở terminal thứ hai:

```bash
cd viago-frontend
npm ci
npm start
```

Mở `http://localhost:4200`. Frontend dùng [`proxy.conf.json`](viago-frontend/proxy.conf.json) để chuyển các request local đến Backend tại `http://127.0.0.1:3000`.

Các lệnh thường dùng:

```bash
npm run build
npm run build -- --configuration development
npm run watch
npm test -- --watch=false
```

URL chính:

```text
/customer                    # Trang khách hàng
/customer/lich-trinh         # Lịch trình
/customer/tra-cuu-ve         # Tra cứu vé
/customer/profile            # Hồ sơ cá nhân
/customer/dich-vu            # Dịch vụ
/customer/tin-tuc            # Tin tức
/admin/login                 # Đăng nhập nội bộ
/admin/home                  # Tổng quan quản trị
/admin/tickets/list          # Quản lý vé
/admin/dispatch/routes       # Tuyến xe
/admin/dispatch/schedules    # Lịch trình
/admin/reports/revenue       # Báo cáo doanh thu
/admin/logs                  # Nhật ký hoạt động
```

## Chạy local đầy đủ

1. Chuẩn bị PostgreSQL/Supabase và điền `viago-backend/.env`.
2. Chạy `npm ci` và `npm run prisma:generate` trong `viago-backend`.
3. Chạy Backend bằng `npm run start:dev` tại port 3000.
4. Chạy Frontend bằng `npm start` tại port 4200.
5. Mở `/customer` hoặc `/admin/login` để kiểm tra ứng dụng.

Nếu port đang được sử dụng, dừng tiến trình cũ bằng `Ctrl+C` rồi chạy lại.

## Prisma và dữ liệu

Schema chính nằm tại [`viago-backend/prisma/schema.prisma`](viago-backend/prisma/schema.prisma). [`prisma.config.ts`](viago-backend/prisma.config.ts) ưu tiên `DIRECT_URL`, sau đó dùng `DATABASE_URL`.

```bash
npm run prisma:generate
npm run prisma:validate
npm run db:business-ids
npm run intake:seed
npm run content:db:setup
npm run chatbot:db:setup
npm run content:migrate
```

Các lệnh seed/setup có thể ghi dữ liệu vào database. Chỉ chạy trên database local hoặc database đã sao lưu.

## Kiểm thử

Frontend sử dụng Vitest và Playwright. Backend sử dụng Jest, Supertest và các script integration.

```bash
# Frontend
cd viago-frontend
npm test -- --watch=false

# Backend
cd ../viago-backend
npm test
npm run test:booking
npm run test:admin-booking
npm run test:home
npm run test:content
npm run test:intake
npm run test:accounts
npm run test:admin:permissions
npm run test:fixed:roles
npm run test:sepay
```

Các bài kiểm thử tích hợp có thể tạo hoặc cập nhật dữ liệu. Hãy dùng database kiểm thử/local.

## Build và triển khai

Build Frontend:

```bash
cd viago-frontend
npm ci
npm run build
```

Build và chạy Backend:

```bash
cd viago-backend
npm ci
npm run prisma:generate
npm run build
npm run start:prod
```

Khi triển khai, đặt `FRONTEND_ORIGIN` bằng domain Frontend thật, cấu hình database, CORS, secret thanh toán và thư mục lưu file. Không bật `ACCOUNT_OTP_MODE=test` hoặc các cờ local seed trên production. Repository hiện không chứa pipeline CI/CD hoặc Docker Compose mặc định; cách triển khai phụ thuộc nền tảng máy chủ được chọn.

## Tài liệu liên quan

- [Frontend README](viago-frontend/README.md)
- [Backend README](viago-backend/README.md)
- [Ví dụ biến môi trường Backend](viago-backend/.env.example)
- [Luồng đặt vé](viago-frontend/docs/customer-booking.md)
- [Quy ước đường dẫn Frontend](viago-frontend/quyuocduongdan.md)
- [Quy ước thiết kế Frontend](viago-frontend/quyuocthietke.md)

## Công nghệ

Angular 22 · TypeScript 6 · RxJS · Firebase reCAPTCHA · QRCode · NestJS 12 · Express · Prisma 6 · PostgreSQL/Supabase · JWT/session authorization · SePay/VietQR · Open-Meteo · Vitest · Playwright · Jest · Supertest · Oxlint.
