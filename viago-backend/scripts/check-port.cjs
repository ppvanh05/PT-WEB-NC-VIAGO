require('dotenv/config');
const net = require('node:net');

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT phải là số nguyên từ 1 đến 65535. Kiểm tra file .env.');
  process.exitCode = 1;
} else {
  const probe = net.createServer();
  probe.once('error', (error) => {
    console.error(
      error.code === 'EADDRINUSE'
        ? `Cổng ${port} đang được sử dụng. Hãy dừng phiên backend cũ bằng Ctrl+C rồi chạy lại. Chỉ chạy một phiên npm run dev; không chạy thêm npm start cùng lúc.`
        : `Không kiểm tra được cổng ${port} (${error.code || 'unknown'}).`,
    );
    process.exitCode = 1;
  });
  probe.listen({ port, host: '::', exclusive: true }, () => probe.close());
}
