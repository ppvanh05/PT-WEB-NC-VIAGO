require('dotenv/config');
const { PrismaClient, Prisma } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL);
if (url.port === '6543') url.searchParams.set('pgbouncer', 'true');
const prisma = new PrismaClient({ datasourceUrl: url.toString() });
async function main() {
  const names = [
    'tai_khoan',
    'khach_hang',
    'nhan_vien',
    'vai_tro',
    'quyen_han',
    'nhan_vien_quyen_han',
    'phien_dang_nhap',
    'otp',
    'nhat_ky_he_thong',
    'bang_hang_thanh_vien',
    'dac_quyen_hang_thanh_vien',
    'tep_danh_gia',
    'don_hang',
    've_xe',
    'ghe_chuyen',
    'ghe',
    'lich_trinh',
    'tuyen_xe',
    'xe',
    'danh_gia',
    'voucher_khach_hang',
    'khuyen_mai',
  ];
  const columns =
    await prisma.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`;
  for (const name of names) {
    const model = Prisma.dmmf.datamodel.models.find((m) => m.name === name);
    const actual = new Set(
      columns.filter((c) => c.table_name === name).map((c) => c.column_name),
    );
    const missing = model.fields
      .filter((f) => f.kind !== 'object' && !actual.has(f.dbName || f.name))
      .map((f) => f.dbName || f.name);
    console.log(
      JSON.stringify({ table: name, exists: actual.size > 0, missing }),
    );
  }
  console.log(
    JSON.stringify({
      roles: await prisma.vai_tro.findMany({
        select: { mavaitro: true, tenvaitro: true, trangthai: true },
      }),
      permissions: await prisma.quyen_han.findMany({
        select: { maquyen: true, tenquyen: true, nhomchucnang: true },
      }),
    }),
  );
  const passwordFormats =
    await prisma.$queryRaw`SELECT CASE WHEN matkhauhash ~ '^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$' THEN 'scrypt' WHEN matkhauhash ~ '^[a-fA-F0-9]{64}$' THEN 'sha256-legacy' WHEN left(matkhauhash, 4) IN ('$2a$', '$2b$', '$2y$') THEN 'bcrypt' WHEN left(matkhauhash, 8) = '$argon2i' THEN 'argon2' ELSE 'unsupported' END AS format, vaitrotaikhoan::text AS role, count(*)::int AS count, min(length(matkhauhash))::int AS min_length, max(length(matkhauhash))::int AS max_length FROM tai_khoan GROUP BY 1, 2`;
  console.log(JSON.stringify({ passwordFormats }));
}
main()
  .catch((e) => {
    console.error(
      JSON.stringify({
        error: e.code || e.name,
        reason: e.meta?.code || 'Database access or schema audit failed',
      }),
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
