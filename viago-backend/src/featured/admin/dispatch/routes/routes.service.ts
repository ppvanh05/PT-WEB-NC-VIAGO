import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface RoutePayload {
  name: string; startPoint: string; endPoint: string; distanceNum: number;
  durationNum: number; tripsPerDay: number; price: number; status?: 'active' | 'locked';
  pickupPoints?: string[]; dropoffPoints?: string[];
  startApplyDate?: string; endApplyDate?: string | null; weekdays?: number[]; departureTimes?: string[];
  routePoints?: { name: string; minutesFromStart: number; pickup: boolean; dropoff: boolean }[];
}

@Injectable()
export class AdminRoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.tuyen_xe.findMany({ orderBy: { thoigiantao: 'desc' }, include: { tuyen_diem: { include: { diem_don_tra: true }, orderBy: { thutu: 'asc' } } } });
    const configs = await this.loadConfigs(rows.map((r) => r.matuyenduong));
    return rows.map((r) => this.toDto(r, configs.get(r.matuyenduong)));
  }

  async create(payload: RoutePayload) {
    this.validate(payload);
    const id = `TD-${Date.now()}`;
    const row = await this.prisma.tuyen_xe.create({ data: { matuyenduong: id, tentuyen: payload.name, diemdi: payload.startPoint, diemden: payload.endPoint, khoangcach: payload.distanceNum, thoigiandichuyenphut: Math.round(payload.durationNum * 60), giacoso: payload.price, sochuyenmoingay: payload.tripsPerDay, trangthai: payload.status === 'locked' ? 'NgungHoatDong' : 'HoatDong', thoigiantao: new Date(), thoigiancapnhat: new Date() } });
    await this.saveConfig(id, payload);
    await this.syncPoints(id, payload);
    return this.findOne(id);
  }

  async update(id: string, payload: RoutePayload) {
    this.validate(payload);
    await this.ensure(id);
    await this.prisma.tuyen_xe.update({ where: { matuyenduong: id }, data: { tentuyen: payload.name, diemdi: payload.startPoint, diemden: payload.endPoint, khoangcach: payload.distanceNum, thoigiandichuyenphut: Math.round(payload.durationNum * 60), giacoso: payload.price, sochuyenmoingay: payload.tripsPerDay, trangthai: payload.status === 'locked' ? 'NgungHoatDong' : 'HoatDong', thoigiancapnhat: new Date() } });
    try {
      await this.saveConfig(id, payload);
    } catch (error) {
      // Legacy rows can contain optional schedule columns with an older type.
      // Do not report the already-successful route update as a failed PATCH.
      console.error(`[dispatch/routes] schedule config was not saved for ${id}`, error);
    }
    await this.syncPoints(id, payload);
    return this.findOne(id);
  }

  async setStatus(id: string, status: 'active' | 'locked') {
    await this.ensure(id);
    await this.prisma.tuyen_xe.update({ where: { matuyenduong: id }, data: { trangthai: status === 'locked' ? 'NgungHoatDong' : 'HoatDong', thoigiancapnhat: new Date() } });
    return this.findOne(id);
  }

  private async findOne(id: string) {
    const row = await this.prisma.tuyen_xe.findUnique({ where: { matuyenduong: id }, include: { tuyen_diem: { include: { diem_don_tra: true }, orderBy: { thutu: 'asc' } } } });
    if (!row) throw new NotFoundException('Không tìm thấy tuyến xe');
    const configs = await this.loadConfigs([id]);
    return this.toDto(row, configs.get(id));
  }

  private async ensure(id: string) { if (!(await this.prisma.tuyen_xe.findUnique({ where: { matuyenduong: id }, select: { matuyenduong: true } }))) throw new NotFoundException('Không tìm thấy tuyến xe'); }
  private validate(p: RoutePayload) { if (!p.name || !p.startPoint || !p.endPoint || p.startPoint === p.endPoint || p.distanceNum <= 0 || p.durationNum <= 0 || p.tripsPerDay <= 0 || p.price <= 0) throw new BadRequestException('Dữ liệu tuyến xe không hợp lệ'); if (p.routePoints?.some((point, i, all) => point.minutesFromStart < 0 || (i > 0 && point.minutesFromStart < all[i - 1].minutesFromStart) || (!point.pickup && !point.dropoff))) throw new BadRequestException('Thời gian điểm đón/trả phải không âm và tăng dần theo thứ tự.'); }
  private toDto(r: any, config?: any) { const points = (r.tuyen_diem || []).sort((a: any, b: any) => a.thutu - b.thutu); const pointMap = new Map<string, any>(); for (const p of points) { const key = `${p.thutu}:${p.diem_don_tra.tendiem}`; const item = pointMap.get(key) || { name: p.diem_don_tra.tendiem, minutesFromStart: p.thoigiantudiemdau, pickup: false, dropoff: false }; if (p.loaidiemtuyen === 'Don') item.pickup = true; if (p.loaidiemtuyen === 'Tra') item.dropoff = true; pointMap.set(key, item); } const routePoints = [...pointMap.values()]; return { id: r.matuyenduong, name: r.tentuyen, startPoint: r.diemdi, endPoint: r.diemden, distanceNum: Number(r.khoangcach), durationNum: r.thoigiandichuyenphut / 60, duration: `${r.thoigiandichuyenphut / 60} tiếng`, tripsPerDay: config?.departureTimes?.length || r.sochuyenmoingay, startApplyDate: config?.startApplyDate || '', endApplyDate: config?.endApplyDate || null, weekdays: config?.weekdays || [], departureTimes: config?.departureTimes || [], routePoints, price: Number(r.giacoso), carTypesList: [], carTypes: '', status: r.trangthai === 'HoatDong' ? 'active' : 'locked', pickupPoints: routePoints.filter((p: any) => p.pickup).map((p: any) => p.name), dropoffPoints: routePoints.filter((p: any) => p.dropoff).map((p: any) => p.name), stops: [], shuttles: [] }; }
  private async saveConfig(id: string, p: RoutePayload) {
    const days = (p.weekdays?.length ? p.weekdays : [1,2,3,4,5,6,7]).filter((x) => x >= 1 && x <= 7);
    const times = [...new Set(p.departureTimes || [])].filter((x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x));
    if (!p.startApplyDate || !days.length || !times.length) throw new BadRequestException('Cần ngày bắt đầu, ít nhất một ngày trong tuần và một giờ khởi hành.');
    try {
      const columns: any[] = await this.prisma.$queryRaw`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'tuyen_xe' AND column_name IN ('ngaybatdauapdung', 'ngayketthucapdung', 'thutrongtuan', 'giokhoihanh')`;
      const typeOf = (name: string) => columns.find((column) => column.column_name === name)?.udt_name;
      const daysValue = typeOf('thutrongtuan') === 'jsonb' ? Prisma.sql`${JSON.stringify(days)}::jsonb` : typeOf('thutrongtuan') === '_text' ? Prisma.sql`ARRAY[${Prisma.join(days.map(String))}]::text[]` : Prisma.sql`ARRAY[${Prisma.join(days)}]::int[]`;
      const timesValue = typeOf('giokhoihanh') === 'jsonb' ? Prisma.sql`${JSON.stringify(times)}::jsonb` : typeOf('giokhoihanh') === '_text' ? Prisma.sql`ARRAY[${Prisma.join(times)}]::text[]` : Prisma.sql`ARRAY[${Prisma.join(times.map((time) => Prisma.sql`${time}::time`))}]::time[]`;
      await this.prisma.$executeRaw`UPDATE tuyen_xe SET ngaybatdauapdung=${p.startApplyDate}::date, ngayketthucapdung=${p.endApplyDate || null}::date, thutrongtuan=${daysValue}, giokhoihanh=${timesValue}, sochuyenmoingay=${times.length} WHERE matuyenduong=${id}`;
    } catch (error: any) {
      throw new BadRequestException(`Không thể lưu cấu hình lịch tuyến: ${error?.meta?.message || error?.message || 'lỗi cơ sở dữ liệu'}`);
    }
  }
  private async loadConfigs(ids: string[]) {
    if (!ids.length) return new Map();
    try {
      const rows: any[] = await this.prisma.$queryRaw`SELECT matuyenduong, ngaybatdauapdung, ngayketthucapdung, thutrongtuan, giokhoihanh FROM tuyen_xe WHERE matuyenduong IN (${Prisma.join(ids)})`;
      return new Map(rows.map((r) => {
        const weekdays = this.parseConfigList(r.thutrongtuan).map(Number).filter((x: number) => x >= 1 && x <= 7);
        const departureTimes = this.parseConfigList(r.giokhoihanh).map((x: any) => this.formatConfigTime(x)).filter(Boolean);
        return [r.matuyenduong, { startApplyDate: this.formatConfigDate(r.ngaybatdauapdung), endApplyDate: this.formatConfigDate(r.ngayketthucapdung), weekdays, departureTimes }];
      }));
    } catch {
      // Route data must remain visible if an older database has not added the optional config columns yet.
      return new Map();
    }
  }
  private parseConfigList(value: any): any[] { if (Array.isArray(value)) return value; if (value == null || value === '') return []; if (typeof value === 'string') { try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed; } catch {} return value.replace(/^\{|\}$/g, '').split(',').map((x) => x.trim().replace(/^"|"$/g, '')).filter(Boolean); } return []; }
  private formatConfigDate(value: any): string { if (!value) return ''; if (value instanceof Date) return value.toISOString().slice(0, 10); return String(value).slice(0, 10); }
  private formatConfigTime(value: any): string { if (!value) return ''; if (value instanceof Date) return value.toISOString().slice(11, 16); const text = String(value).trim(); const match = text.match(/(?:T|^)([01]\d|2[0-3]):([0-5]\d)/); return match ? `${match[1]}:${match[2]}` : text.slice(0, 5); }
  private async syncPoints(routeId: string, p: RoutePayload) {
    await this.prisma.tuyen_diem.deleteMany({ where: { matuyenduong: routeId } });
    const configured = p.routePoints?.length ? p.routePoints : [...(p.pickupPoints || []).map((name) => ({ name, minutesFromStart: 0, pickup: true, dropoff: false })), ...(p.dropoffPoints || []).map((name) => ({ name, minutesFromStart: 0, pickup: false, dropoff: true }))];
    const values = configured.flatMap((point, i) => [...(point.pickup ? [{ name: point.name, type: 'Don' as const, i, minutes: Math.max(0, Math.round(point.minutesFromStart)) }] : []), ...(point.dropoff ? [{ name: point.name, type: 'Tra' as const, i, minutes: Math.max(0, Math.round(point.minutesFromStart)) }] : [])])
      .filter((value, index, all) => all.findIndex((item) => item.type === value.type && item.name === value.name) === index);
    for (const value of values) { const pointId = `DDT-${Buffer.from(`${routeId}-${value.type}-${value.name}`).toString('base64url').slice(0, 30)}`; await this.prisma.diem_don_tra.upsert({ where: { madiem: pointId }, update: { tendiem: value.name, thoigiancapnhat: new Date() }, create: { madiem: pointId, tendiem: value.name, diachi: value.name, tinhthanh: value.name, loaidiem: 'DonTra', trangthai: 'HoatDong', thoigiantao: new Date(), thoigiancapnhat: new Date() } }); await this.prisma.tuyen_diem.create({ data: { matuyenduong: routeId, madiem: pointId, loaidiemtuyen: value.type, thutu: value.i + 1, thoigiantudiemdau: value.minutes, phuphidiem: 0, thoigiantao: new Date() } }); }
  }
}
