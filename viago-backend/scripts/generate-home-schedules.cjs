require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

const url = new URL(process.env.DATABASE_URL);
if (url.port === '6543') url.searchParams.set('pgbouncer', 'true');
const db = new PrismaClient({ datasourceUrl: url.toString(), transactionOptions: { maxWait: 10000 } });
const dates = ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25'];
const times = ['06:00', '09:00', '13:00', '17:00', '21:00'];

async function main() {
  const [routes, cars, drivers] = await Promise.all([
    db.tuyen_xe.findMany({ where: { trangthai: 'HoatDong' }, orderBy: { matuyenduong: 'asc' } }),
    db.xe.findMany({ where: { trangthai: 'DangHoatDong', masodoghe: { not: null } }, orderBy: { maxe: 'asc' } }),
    db.tai_xe_phu_xe.findMany({ where: { vaitro: 'TaiXe', trangthai: 'DangHoatDong' }, orderBy: { manhansu: 'asc' } }),
  ]);
  if (!routes.length || !cars.length || !drivers.length) throw new Error(`Thiếu dữ liệu: routes=${routes.length}, cars=${cars.length}, drivers=${drivers.length}`);
  let created = 0, skipped = 0, cursor = 0;
  for (const date of dates) for (const route of routes) for (let i = 0; i < times.length; i++) {
    const departure = new Date(`${date}T${times[i]}:00+07:00`);
    const exists = await db.lich_trinh.findFirst({ where: { matuyenduong: route.matuyenduong, thoigiankhoihanh: departure }, select: { malichtrinh: true } });
    if (exists) { skipped++; continue; }
    const car = cars[cursor % cars.length];
    const driver = drivers[cursor % drivers.length];
    cursor++;
    const id = `LT-${date.replaceAll('-', '')}-${route.matuyenduong}-${i + 1}`;
    await db.$transaction(async (tx) => {
      const now = new Date();
      const arrival = new Date(departure.getTime() + route.thoigiandichuyenphut * 60000);
      await tx.lich_trinh.create({ data: {
        malichtrinh: id, matuyenduong: route.matuyenduong, maxe: car.maxe, mataixechinh: driver.manhansu,
        ngaykhoihanh: new Date(`${date}T00:00:00Z`), giokhoihanh: departure, thoigiankhoihanh: departure,
        thoigiandendukien: arrival, thoigiandenthucte: null, songaymobantruoc: 365, sophutdongbantruoc: 30,
        thoigiandongbanve: new Date(departure.getTime() - 30 * 60000), thoigiangiuchophut: 10,
        giavecoso: route.giacoso, trangthai: 'DangMoBan', ghichu: 'Tự sinh lịch trình 20-25/11/2026',
        thoigiantao: now, thoigiancapnhat: now,
      }});
      const seats = await tx.ghe.findMany({ where: { masodoghe: car.masodoghe, trangthai: 'HoatDong' }, orderBy: { thutuhienthi: 'asc' }, select: { maghe: true } });
      if (!seats.length) throw new Error(`Sơ đồ ${car.masodoghe} của xe ${car.maxe} chưa có ghế`);
      await tx.ghe_chuyen.createMany({ data: seats.map((seat) => ({ maghechuyen: `${id}-${seat.maghe}`, maghe: seat.maghe, malichtrinh: id, trangthaighe: 'Trong', giaghe: route.giacoso, thoigiancapnhat: now })) });
      const points = await tx.tuyen_diem.findMany({ where: { matuyenduong: route.matuyenduong }, orderBy: { thutu: 'asc' } });
      if (points.length) await tx.lich_trinh_diem.createMany({ data: points.map((point) => ({ malichtrinh: id, madiem: point.madiem, loaidiemtuyen: point.loaidiemtuyen, thutu: point.thutu, thoigiandukien: new Date(departure.getTime() + point.thoigiantudiemdau * 60000) })) });
    });
    created++;
  }
  console.log(JSON.stringify({ created, skipped, routes: routes.length, days: dates.length, tripsPerDay: times.length }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
