# VIAGO

Frontend Angular và backend NestJS được tổ chức thành hai thư mục ngang cấp.

```text
VIAGO/
├── .vscode/                 # Cấu hình chạy/debug từ thư mục gốc
├── viago-backend/           # NestJS, Prisma và API
│   ├── prisma/
│   ├── src/
│   ├── test/
│   └── package.json
├── viago-frontend/          # Angular
│   ├── docs/
│   ├── public/
│   ├── scripts/
│   ├── src/
│   ├── angular.json
│   └── package.json
├── .gitignore
└── README.md
```

Mỗi ứng dụng có `package.json`, `package-lock.json` và `node_modules` riêng. Chạy các lệnh npm trong đúng thư mục ứng dụng.

## Chạy frontend

```bash
cd viago-frontend
npm ci
npm start
```

Mở `http://localhost:4200`. Build bằng `npm run build`, chạy kiểm thử bằng `npm test -- --watch=false`.

## Chạy backend

```bash
cd viago-backend
npm ci
```

Tạo file `.env` trong `viago-backend` và cấu hình `DATABASE_URL` cho cơ sở dữ liệu phù hợp với `prisma/schema.prisma`, sau đó chạy:

```bash
npx prisma generate
npm run start:dev
```

Backend mặc định chạy tại `http://localhost:3000`. Build bằng `npm run build`.

## VS Code

Mở thư mục gốc của repository. Các task `frontend: start`, `frontend: test` và `backend: start` đã trỏ đến từng ứng dụng. Cấu hình debug `ng serve` dùng frontend trong `viago-frontend`.

Chi tiết: [Frontend](viago-frontend/README.md), [Backend](viago-backend/README.md), [luồng đặt vé](viago-frontend/docs/customer-booking.md).
