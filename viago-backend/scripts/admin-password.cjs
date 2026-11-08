require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('node:crypto');
const { createInterface } = require('node:readline/promises');
const { Writable } = require('node:stream');
const db = new PrismaClient();
let muted = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!muted) process.stdout.write(chunk);
    done();
  },
});
const rl = createInterface({
  input: process.stdin,
  output,
  terminal: !!process.stdin.isTTY,
});
async function secret(prompt) {
  process.stdout.write(prompt);
  muted = true;
  try {
    return await rl.question('');
  } finally {
    muted = false;
    process.stdout.write('\n');
  }
}
async function main() {
  if (!process.stdin.isTTY)
    throw new Error('Chạy lệnh trong terminal để nhập mật khẩu an toàn.');
  const username =
    process.argv[2] ||
    (
      await rl.question(
        'Email hoặc tên đăng nhập của tài khoản nhân viên hiện có: ',
      )
    ).trim();
  const account = await db.tai_khoan.findFirst({
    where: {
      OR: [
        { email: username },
        { tendangnhap: username },
        { sodienthoai: username },
      ],
      vaitrotaikhoan: 'NhanVien',
      trangthai: 'HoatDong',
      nhan_vien: { trangthai: 'HoatDong' },
    },
    select: { mataikhoan: true, nhan_vien: { select: { hoten: true } } },
  });
  if (!account)
    throw new Error(
      'Không tìm thấy tài khoản nhân viên hoạt động. Không tạo tài khoản hoặc cấp quyền tự động.',
    );
  console.log(
    `Thiết lập mật khẩu cho ${account.nhan_vien.hoten}. Các phiên cũ của tài khoản này sẽ bị thu hồi.`,
  );
  const password = await secret('Mật khẩu mới (12–200 ký tự): ');
  if (password.length < 12 || password.length > 200)
    throw new Error('Mật khẩu phải từ 12 đến 200 ký tự.');
  if (password !== (await secret('Nhập lại mật khẩu mới: ')))
    throw new Error('Mật khẩu xác nhận không khớp.');
  const salt = randomBytes(16).toString('hex'),
    hash =
      'scrypt:' + salt + ':' + scryptSync(password, salt, 64).toString('hex');
  await db.$transaction(async (tx) => {
    await tx.tai_khoan.update({
      where: { mataikhoan: account.mataikhoan },
      data: {
        matkhauhash: hash,
        solandangnhapsai: 0,
        khoatamden: null,
        thoigiancapnhat: new Date(),
      },
    });
    await tx.phien_dang_nhap.updateMany({
      where: { mataikhoan: account.mataikhoan, trangthai: 'DangHoatDong' },
      data: { trangthai: 'DaDangXuat' },
    });
  });
  console.log(
    'Đã đặt mật khẩu. Đăng nhập tại /admin/login bằng tài khoản này. Không thay đổi phân quyền.',
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await db.$disconnect();
  });
