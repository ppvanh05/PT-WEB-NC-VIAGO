// Recovery for an interrupted accounts-browser.cjs run; selects only its exact QA naming format.
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL);
if (url.port === '6543') url.searchParams.set('pgbouncer', 'true');
const db = new PrismaClient({ datasourceUrl: url.toString() });
const fs = require('node:fs/promises');
const path = require('node:path');
async function main() {
  const roots = await db.tai_khoan.findMany({
    where: {
      mataikhoan: { startsWith: 'QA_TK_' },
      tendangnhap: { startsWith: 'qa_' },
    },
    select: { tendangnhap: true, email: true },
  });
  for (const root of roots) {
    const run = /^qa_([a-f0-9]{10})$/.exec(root.tendangnhap || '')?.[1];
    if (!run || root.email !== `qa-${run}-root@example.com`) continue;
    await db.$transaction(
      async (tx) => {
        const accounts = await tx.tai_khoan.findMany({
          where: {
            OR: [
              {
                mataikhoan: { startsWith: 'QA_TK_' },
                khach_hang: { ghichu: `QA_BROWSER:${run}` },
              },
              {
                mataikhoan: { startsWith: 'QA_TK_' },
                email: {
                  in: [
                    `qa-${run}-root@example.com`,
                    `qa-${run}-customer@example.com`,
                  ],
                },
              },
              {
                tendangnhap: `qa_emp_${run}`,
                email: `qa-${run}-employee@example.com`,
              },
            ],
          },
          select: { mataikhoan: true },
        });
        const ids = accounts.map((a) => a.mataikhoan);
        const customers = await tx.khach_hang.findMany({
          where: {
            OR: [
              { mataikhoan: { in: ids } },
              {
                hotenkhachhang: `QA Guest ${run}`,
                mataikhoan: null,
                makhachhang: { startsWith: 'KH_' },
              },
            ],
          },
          select: { makhachhang: true },
        });
        const employees = await tx.nhan_vien.findMany({
          where: { mataikhoan: { in: ids } },
          select: { manhanvien: true },
        });
        const schedules = await tx.lich_trinh.findMany({
          where: {
            malichtrinh: { startsWith: 'QA_LT_' },
            ghichu: `QA_BROWSER:${run}`,
          },
          select: { malichtrinh: true },
        });
        const scheduleIds = schedules.map((row) => row.malichtrinh);
        const orders = await tx.don_hang.findMany({
          where: {
            madonhang: { startsWith: 'QA_DH_' },
            makhachhang: { in: customers.map((row) => row.makhachhang) },
            ghichu: `QA_BROWSER:${run}`,
          },
          select: { madonhang: true },
        });
        const orderIds = orders.map((row) => row.madonhang);
        const tickets = await tx.ve_xe.findMany({
          where: {
            mave: { startsWith: 'QA_VE_' },
            madonhang: { in: orderIds },
          },
          select: { mave: true },
        });
        const ticketIds = tickets.map((row) => row.mave);
        await tx.tep_danh_gia.deleteMany({
          where: { danh_gia: { mave: { in: ticketIds } } },
        });
        await tx.danh_gia.deleteMany({ where: { mave: { in: ticketIds } } });
        await tx.ve_xe.deleteMany({ where: { mave: { in: ticketIds } } });
        await tx.don_hang.deleteMany({
          where: { madonhang: { in: orderIds } },
        });
        await tx.ghe_chuyen.deleteMany({
          where: {
            maghechuyen: { startsWith: 'QA_GC_' },
            malichtrinh: { in: scheduleIds },
          },
        });
        await tx.lich_trinh.deleteMany({
          where: { malichtrinh: { in: scheduleIds } },
        });
        const entities = [
          ...scheduleIds,
          ...orderIds,
          ...ticketIds,
          ...ids,
          ...customers.map((c) => c.makhachhang),
          ...employees.map((e) => e.manhanvien),
        ];
        await tx.nhat_ky_he_thong.deleteMany({
          where: {
            OR: [{ mataikhoan: { in: ids } }, { madoituong: { in: entities } }],
          },
        });
        await tx.phien_dang_nhap.deleteMany({
          where: { mataikhoan: { in: ids } },
        });
        await tx.nhan_vien_quyen_han.deleteMany({
          where: { manhanvien: { in: employees.map((e) => e.manhanvien) } },
        });
        await tx.khach_hang.deleteMany({
          where: { makhachhang: { in: customers.map((c) => c.makhachhang) } },
        });
        await tx.nhan_vien.deleteMany({
          where: { manhanvien: { in: employees.map((e) => e.manhanvien) } },
        });
        await tx.tai_khoan.deleteMany({ where: { mataikhoan: { in: ids } } });
      },
      { timeout: 30000 },
    );
    const artifacts = path.resolve(__dirname, '../../artifacts');
    for (const entry of await fs
      .readdir(artifacts, { withFileTypes: true })
      .catch(() => [])) {
      if (
        !entry.isDirectory() ||
        !entry.name.startsWith(`review-browser-${run}-`)
      )
        continue;
      const directory = path.resolve(artifacts, entry.name);
      if (path.dirname(directory) !== artifacts)
        throw new Error('Invalid QA directory');
      const names = await fs.readdir(directory);
      if (
        !names.every((name) =>
          /^TDG_[a-f0-9]{32}\.(png|jpg|webp|mp4|webm)$/.test(name),
        )
      )
        throw new Error('Unexpected QA file');
      for (const name of names) await fs.unlink(path.join(directory, name));
      await fs.rmdir(directory);
    }
    console.log('Removed interrupted browser-test QA fixture.');
  }
}
main()
  .catch((e) => {
    console.error('QA recovery failed:', e.code || e.name);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
