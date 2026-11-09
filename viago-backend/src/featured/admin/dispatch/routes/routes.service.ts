import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface RoutePayload {
  name: string; startPoint: string; endPoint: string; distanceNum: number;
  durationNum: number; tripsPerDay: number; price: number; status?: 'active' | 'locked';
  pickupPoints?: string[]; dropoffPoints?: string[];
}

@Injectable()
export class AdminRoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.tuyen_xe.findMany({ orderBy: { thoigiantao: 'desc' }, include: { tuyen_diem: { include: { diem_don_tra: true }, orderBy: { thutu: 'asc' } } } });
    return rows.map((r) => this.toDto(r));
  }

  async create(payload: RoutePayload) {
    this.validate(payload);
    const id = `TD-${Date.now()}`;
    const row = await this.prisma.tuyen_xe.create({ data: { matuyenduong: id, tentuyen: payload.name, diemdi: payload.startPoint, diemden: payload.endPoint, khoangcach: payload.distanceNum, thoigiandichuyenphut: Math.round(payload.durationNum * 60), giacoso: payload.price, sochuyenmoingay: payload.tripsPerDay, trangthai: payload.status === 'locked' ? 'NgungHoatDong' : 'HoatDong', thoigiantao: new Date(), thoigiancapnhat: new Date() } });
    await this.syncPoints(id, payload);
    return this.findOne(id);
  }

  async update(id: string, payload: RoutePayload) {
    this.validate(payload);
    await this.ensure(id);
    await this.prisma.tuyen_xe.update({ where: { matuyenduong: id }, data: { tentuyen: payload.name, diemdi: payload.startPoint, diemden: payload.endPoint, khoangcach: payload.distanceNum, thoigiandichuyenphut: Math.round(payload.durationNum * 60), giacoso: payload.price, sochuyenmoingay: payload.tripsPerDay, trangthai: payload.status === 'locked' ? 'NgungHoatDong' : 'HoatDong', thoigiancapnhat: new Date() } });
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
    return this.toDto(row);
  }

  private async ensure(id: string) { if (!(await this.prisma.tuyen_xe.findUnique({ where: { matuyenduong: id }, select: { matuyenduong: true } }))) throw new NotFoundException('Không tìm thấy tuyến xe'); }
  private validate(p: RoutePayload) { if (!p.name || !p.startPoint || !p.endPoint || p.startPoint === p.endPoint || p.distanceNum <= 0 || p.durationNum <= 0 || p.tripsPerDay <= 0 || p.price <= 0) throw new BadRequestException('Dữ liệu tuyến xe không hợp lệ'); }
  private toDto(r: any) { const points = r.tuyen_diem || []; return { id: r.matuyenduong, name: r.tentuyen, startPoint: r.diemdi, endPoint: r.diemden, distanceNum: Number(r.khoangcach), durationNum: r.thoigiandichuyenphut / 60, duration: `${r.thoigiandichuyenphut / 60} tiếng`, tripsPerDay: r.sochuyenmoingay, price: Number(r.giacoso), carTypesList: [], carTypes: '', status: r.trangthai === 'HoatDong' ? 'active' : 'locked', pickupPoints: points.filter((p: any) => p.loaidiemtuyen === 'Don').map((p: any) => p.diem_don_tra.tendiem), dropoffPoints: points.filter((p: any) => p.loaidiemtuyen === 'Tra').map((p: any) => p.diem_don_tra.tendiem), stops: [], shuttles: [] }; }
  private async syncPoints(routeId: string, p: RoutePayload) {
    await this.prisma.tuyen_diem.deleteMany({ where: { matuyenduong: routeId } });
    const values = [...(p.pickupPoints || []).map((name, i) => ({ name, type: 'Don' as const, i })), ...(p.dropoffPoints || []).map((name, i) => ({ name, type: 'Tra' as const, i }))];
    for (const value of values) { const pointId = `DDT-${Buffer.from(`${routeId}-${value.type}-${value.name}`).toString('base64url').slice(0, 30)}`; await this.prisma.diem_don_tra.upsert({ where: { madiem: pointId }, update: { tendiem: value.name, thoigiancapnhat: new Date() }, create: { madiem: pointId, tendiem: value.name, diachi: value.name, tinhthanh: value.name, loaidiem: 'DonTra', trangthai: 'HoatDong', thoigiantao: new Date(), thoigiancapnhat: new Date() } }); await this.prisma.tuyen_diem.create({ data: { matuyenduong: routeId, madiem: pointId, loaidiemtuyen: value.type, thutu: value.i + 1, thoigiantudiemdau: 0, phuphidiem: 0, thoigiantao: new Date() } }); }
  }
}
