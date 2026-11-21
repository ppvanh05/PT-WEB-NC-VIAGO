import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class AdminSchedulesService {
  constructor(private readonly prisma: PrismaService) {}
  private include = { tuyen_xe: true, xe: true, tai_xe_phu_xe_lich_trinh_mataixechinhTotai_xe_phu_xe: true, tai_xe_phu_xe_lich_trinh_maphuxeTotai_xe_phu_xe: true } as const;
  async findAll() { return (await this.prisma.lich_trinh.findMany({ include: this.include, orderBy: { ngaykhoihanh: 'desc' } })).map((r) => this.toDto(r)); }
  async create(p: SchedulePayload) {
    const id = `LT-${Date.now()}`;
    return this.prisma.$transaction(async (tx) => {
      const data = await this.toData(p, id, tx);
      const row = await tx.lich_trinh.create({ data });
      if (row.maxe) await this.ensureTripSeats(tx, row.malichtrinh, row.maxe, row.giavecoso);
      await this.copyRoutePoints(tx, row.malichtrinh, row.matuyenduong, row.thoigiankhoihanh);
      return this.toDto(await tx.lich_trinh.findUniqueOrThrow({ where: { malichtrinh: row.malichtrinh }, include: this.include }));
    });
  }
  async generateRange(input: { startDate: string; endDate: string; tripsPerDay?: number; departureTimes?: string[]; routeIds?: string[] }) {
    const count = Math.min(20, Math.max(1, input.tripsPerDay ?? 5));
    const times = (input.departureTimes?.length ? input.departureTimes : ['08:00', '10:00', '12:00', '14:00', '16:00']).slice(0, count);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate) || input.startDate > input.endDate) throw new BadRequestException('Khoảng ngày không hợp lệ.');
    const routes = await this.prisma.tuyen_xe.findMany({ where: { trangthai: 'HoatDong', ...(input.routeIds?.length ? { matuyenduong: { in: input.routeIds } } : {}) }, orderBy: { matuyenduong: 'asc' } });
    if (!routes.length) throw new BadRequestException('Không có tuyến đang hoạt động.');
    const configs: any[] = await this.prisma.$queryRaw`SELECT matuyenduong, ngaybatdauapdung, ngayketthucapdung, thutrongtuan, giokhoihanh FROM tuyen_xe WHERE matuyenduong IN (${Prisma.join(routes.map((r) => r.matuyenduong))})`;
    const configByRoute = new Map(configs.map((r) => [r.matuyenduong, r]));
    const cars = await this.prisma.xe.findMany({ where: { trangthai: 'DangHoatDong', masodoghe: { not: null } }, orderBy: { maxe: 'asc' } });
    const drivers = await this.prisma.tai_xe_phu_xe.findMany({ where: { vaitro: 'TaiXe', trangthai: 'DangHoatDong' }, orderBy: { manhansu: 'asc' } });
    if (!routes.length) throw new BadRequestException('Không có tuyến đang hoạt động.');
    let created = 0, skipped = 0, cursor = 0;
    for (let day = new Date(`${input.startDate}T00:00:00+07:00`); day <= new Date(`${input.endDate}T00:00:00+07:00`); day = new Date(day.getTime() + 86400000)) {
      const date = day.toISOString().slice(0, 10);
      for (const route of routes) {
        const config = configByRoute.get(route.matuyenduong);
        const start = config?.ngaybatdauapdung ? new Date(config.ngaybatdauapdung).toISOString().slice(0, 10) : input.startDate;
        const end = config?.ngayketthucapdung ? new Date(config.ngayketthucapdung).toISOString().slice(0, 10) : input.endDate;
        const weekday = ((day.getDay() + 6) % 7) + 1;
        const activeDays = this.parseList(config?.thutrongtuan).map(Number);
        const days = activeDays.length ? activeDays : [1,2,3,4,5,6,7];
        if (date < start || date > end || !days.includes(weekday)) continue;
        const routeTimes = this.parseList(config?.giokhoihanh).map((x) => this.formatTimeValue(x)).filter(Boolean);
        const departureTimes = routeTimes.length ? routeTimes : times;
        for (let i = 0; i < departureTimes.length; i++) {
        const time = departureTimes[i];
        const departure = new Date(`${date}T${time}:00+07:00`);
        const car = cars.length ? cars[cursor % cars.length] : null;
        const driver = drivers.length ? drivers[cursor % drivers.length] : null;
        cursor++;
        const id = `LT-${date.replaceAll('-', '')}-${route.matuyenduong}-${time.replace(':', '')}`;
        const exists = await this.prisma.lich_trinh.findFirst({ where: { matuyenduong: route.matuyenduong, thoigiankhoihanh: departure }, select: { malichtrinh: true } });
        const existingId = await this.prisma.lich_trinh.findUnique({ where: { malichtrinh: id }, select: { malichtrinh: true } });
        if (exists || existingId) { skipped++; continue; }
        try {
          await this.prisma.$transaction(async (tx) => {
            const now = new Date(), arrival = new Date(departure.getTime() + route.thoigiandichuyenphut * 60000);
            await tx.lich_trinh.create({ data: ({ malichtrinh: id, matuyenduong: route.matuyenduong, maxe: car?.maxe || null, mataixechinh: driver?.manhansu || null, ngaykhoihanh: new Date(`${date}T00:00:00Z`), giokhoihanh: departure, thoigiankhoihanh: departure, thoigiandendukien: arrival, thoigiandenthucte: null, songaymobantruoc: 365, sophutdongbantruoc: 30, thoigiandongbanve: new Date(departure.getTime() - 30 * 60000), thoigiangiuchophut: 10, giavecoso: route.giacoso, trangthai: 'DangMoBan', ghichu: 'Tự sinh lịch trình', thoigiantao: now, thoigiancapnhat: now } as any) });
            if (car?.maxe) await this.ensureTripSeats(tx, id, car.maxe, route.giacoso);
            await this.copyRoutePoints(tx, id, route.matuyenduong, departure);
          });
          created++;
        } catch (error: any) {
          if (error?.code === 'P2002' && error?.meta?.target?.includes('malichtrinh')) { skipped++; continue; }
          throw error;
        }
        }
      }
    }
    return { created, skipped, routes: routes.length, tripsPerDay: times.length, startDate: input.startDate, endDate: input.endDate };
  }
  async generateFromRouteConfig(routeIds?: string[]) {
    const rows: any[] = await this.prisma.$queryRaw`SELECT matuyenduong, ngaybatdauapdung, ngayketthucapdung FROM tuyen_xe WHERE trangthai = 'HoatDong' ${routeIds?.length ? Prisma.sql`AND matuyenduong IN (${Prisma.join(routeIds)})` : Prisma.empty}`;
    const dates = rows.flatMap((row) => [row.ngaybatdauapdung, row.ngayketthucapdung].filter(Boolean).map((value) => new Date(value).toISOString().slice(0, 10)));
    if (!dates.length) throw new BadRequestException('Chưa có ngày áp dụng trong cấu hình tuyến xe.');
    return this.generateRange({ startDate: dates.sort()[0], endDate: dates.sort().at(-1)!, routeIds });
  }
  async syncFutureRoutePoints(routeIds?: string[]) {
    const schedules = await this.prisma.lich_trinh.findMany({ where: { thoigiankhoihanh: { gt: new Date() }, ...(routeIds?.length ? { matuyenduong: { in: routeIds } } : {}) }, select: { malichtrinh: true, matuyenduong: true, thoigiankhoihanh: true } });
    let synced = 0, skipped = 0;
    for (const schedule of schedules) {
      const order = await this.prisma.don_hang.findFirst({ where: { malichtrinh: schedule.malichtrinh }, select: { madonhang: true } });
      if (order) { skipped++; continue; }
      await this.prisma.$transaction(async (tx) => {
        await tx.lich_trinh_diem.deleteMany({ where: { malichtrinh: schedule.malichtrinh } });
        await this.copyRoutePoints(tx, schedule.malichtrinh, schedule.matuyenduong, schedule.thoigiankhoihanh);
      });
      synced++;
    }
    return { synced, skipped, total: schedules.length, routeIds: routeIds || [] };
  }
  async update(id: string, p: SchedulePayload) { await this.ensure(id); const data = await this.toData(p, id); return this.toDto(await this.prisma.lich_trinh.update({ where: { malichtrinh: id }, data, include: this.include })); }
  async setStatus(id: string, status: string) { await this.ensure(id); return this.toDto(await this.prisma.lich_trinh.update({ where: { malichtrinh: id }, data: { trangthai: this.statusToDb(status), thoigiancapnhat: new Date() }, include: this.include })); }
  private async ensure(id: string) { if (!(await this.prisma.lich_trinh.findUnique({ where: { malichtrinh: id }, select: { malichtrinh: true } }))) throw new NotFoundException('Không tìm thấy lịch trình'); }
  private async toData(p: SchedulePayload, id: string, db: any = this.prisma) {
    if (!p.routeName || !p.carName || !p.driverName || !p.departureDate || !p.departureTime) throw new BadRequestException('Thiếu thông tin lịch trình');
    const route = await db.tuyen_xe.findFirst({ where: { tentuyen: p.routeName } });
    const car = await db.xe.findFirst({ where: { OR: [{ tenxe: p.carName }, { biensoxe: p.licensePlate }] } });
    const driver = await db.tai_xe_phu_xe.findFirst({ where: { hoten: p.driverName, vaitro: 'TaiXe' } });
    const codriver = p.codriverName ? await db.tai_xe_phu_xe.findFirst({ where: { hoten: p.codriverName, vaitro: 'PhuXe' } }) : null;
    if (!route || !car || !driver || (p.codriverName && !codriver)) throw new BadRequestException('Tuyến, xe hoặc nhân sự không tồn tại');
    const departure = this.combineDateTime(p.departureDate, p.departureTime); const duration = Number.parseFloat(p.duration || '0'); const arrival = new Date(departure.getTime() + duration * 3600000); const now = new Date();
    return { malichtrinh: id, matuyenduong: route.matuyenduong, maxe: car.maxe, mataixechinh: driver.manhansu, maphuxe: codriver?.manhansu || null, ngaykhoihanh: this.dateOnly(p.departureDate), giokhoihanh: departure, thoigiankhoihanh: departure, thoigiandendukien: arrival, thoigiandenthucte: null, songaymobantruoc: 10, sophutdongbantruoc: 30, thoigiandongbanve: new Date(departure.getTime() - 30 * 60000), thoigiangiuchophut: 15, giavecoso: p.price || route.giacoso, trangthai: this.statusToDb(p.status || 'waiting'), ghichu: null, thoigiantao: now, thoigiancapnhat: now };
  }
  private async ensureTripSeats(db: Prisma.TransactionClient, tripId: string, vehicleId: string, fare: Prisma.Decimal | number) {
    const vehicle = await db.xe.findUnique({ where: { maxe: vehicleId }, select: { masodoghe: true } });
    if (!vehicle?.masodoghe) throw new BadRequestException(`Xe ${vehicleId} chưa được gán sơ đồ ghế.`);
    const seats = await db.ghe.findMany({ where: { masodoghe: vehicle.masodoghe, trangthai: 'HoatDong' }, orderBy: { thutuhienthi: 'asc' }, select: { maghe: true } });
    if (!seats.length) throw new BadRequestException(`Sơ đồ ${vehicle.masodoghe} chưa có ghế hoạt động.`);
    await db.ghe_chuyen.createMany({ data: seats.map((seat) => ({ maghechuyen: `${tripId}-${seat.maghe}`, maghe: seat.maghe, malichtrinh: tripId, trangthaighe: 'Trong' as const, giaghe: fare, thoigiancapnhat: new Date() })), skipDuplicates: true });
  }
  private async copyRoutePoints(db: Prisma.TransactionClient, tripId: string, routeId: string, departure: Date) {
    const points = await db.tuyen_diem.findMany({ where: { matuyenduong: routeId }, orderBy: { thutu: 'asc' } });
    await db.lich_trinh_diem.createMany({ data: points.map((point) => ({ malichtrinh: tripId, madiem: point.madiem, loaidiemtuyen: point.loaidiemtuyen, thutu: point.thutu, thoigiandukien: new Date(departure.getTime() + point.thoigiantudiemdau * 60000) })), skipDuplicates: true });
  }
  private toDto(r: any) { return { id: r.malichtrinh, routeName: r.tuyen_xe.tentuyen, startPoint: r.tuyen_xe.diemdi, endPoint: r.tuyen_xe.diemden, licensePlate: r.xe?.biensoxe || '', carName: r.xe?.tenxe || r.xe?.biensoxe || '', driverName: r.tai_xe_phu_xe_lich_trinh_mataixechinhTotai_xe_phu_xe?.hoten || '', codriverName: r.tai_xe_phu_xe_lich_trinh_maphuxeTotai_xe_phu_xe?.hoten || '', departureDate: this.formatDate(r.ngaykhoihanh), departureTime: this.formatTime(r.giokhoihanh), duration: `${Math.max(0, (new Date(r.thoigiandendukien).getTime() - new Date(r.thoigiankhoihanh).getTime()) / 3600000)} tiếng`, status: this.statusToUi(r.trangthai), seatsCount: r.xe ? this.seats(r.xe.loaixe) : 0, price: Number(r.giavecoso) }; }
  private combineDateTime(d: string, t: string) { return new Date(`${d}T${t}:00`); }
  private dateOnly(d: string) { const x = new Date(`${d}T00:00:00Z`); return x; }
  private formatDate(d: Date) { return new Date(d).toISOString().slice(0, 10); }
  private formatTime(d: Date) { return new Date(d).toISOString().slice(11, 16); }
  private parseList(value: any): any[] { if (Array.isArray(value)) return value; if (value == null || value === '') return []; if (typeof value === 'string') { try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed; } catch {} return value.replace(/^\{|\}$/g, '').split(',').map((x) => x.trim().replace(/^"|"$/g, '')).filter(Boolean); } return []; }
  private formatTimeValue(value: any): string { if (!value) return ''; if (value instanceof Date) return value.toISOString().slice(11, 16); const text = String(value).trim(); const match = text.match(/(?:T|^)([01]\d|2[0-3]):([0-5]\d)/); return match ? `${match[1]}:${match[2]}` : text.slice(0, 5); }
  private seats(x: string) { return x === 'Limousine9Cho' ? 9 : x === 'Cabin22Cho' ? 22 : 34; }
  private statusToDb(x: string): any { return ({ waiting: 'ChuaMoBan', running: 'DangChay', completed: 'HoanThanh', locked: 'DaHuy' } as any)[x] || x; }
  private statusToUi(x: string) { return ({ ChuaMoBan: 'waiting', DangMoBan: 'waiting', DangChay: 'running', HoanThanh: 'completed', DaHuy: 'locked' } as any)[x] || 'waiting'; }
}

export interface SchedulePayload { routeName: string; carName: string; licensePlate?: string; driverName: string; codriverName?: string; departureDate: string; departureTime: string; duration?: string; price?: number; status?: string; }
