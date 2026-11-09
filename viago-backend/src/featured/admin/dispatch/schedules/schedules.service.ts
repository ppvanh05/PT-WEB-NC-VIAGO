import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class AdminSchedulesService {
  constructor(private readonly prisma: PrismaService) {}
  private include = { tuyen_xe: true, xe: true, tai_xe_phu_xe_lich_trinh_mataixechinhTotai_xe_phu_xe: true, tai_xe_phu_xe_lich_trinh_maphuxeTotai_xe_phu_xe: true } as const;
  async findAll() { return (await this.prisma.lich_trinh.findMany({ include: this.include, orderBy: { ngaykhoihanh: 'desc' } })).map((r) => this.toDto(r)); }
  async create(p: SchedulePayload) { const data = await this.toData(p, `LT-${Date.now()}`); return this.toDto(await this.prisma.lich_trinh.create({ data, include: this.include })); }
  async update(id: string, p: SchedulePayload) { await this.ensure(id); const data = await this.toData(p, id); return this.toDto(await this.prisma.lich_trinh.update({ where: { malichtrinh: id }, data, include: this.include })); }
  async setStatus(id: string, status: string) { await this.ensure(id); return this.toDto(await this.prisma.lich_trinh.update({ where: { malichtrinh: id }, data: { trangthai: this.statusToDb(status), thoigiancapnhat: new Date() }, include: this.include })); }
  private async ensure(id: string) { if (!(await this.prisma.lich_trinh.findUnique({ where: { malichtrinh: id }, select: { malichtrinh: true } }))) throw new NotFoundException('Không tìm thấy lịch trình'); }
  private async toData(p: SchedulePayload, id: string) {
    if (!p.routeName || !p.carName || !p.driverName || !p.departureDate || !p.departureTime) throw new BadRequestException('Thiếu thông tin lịch trình');
    const route = await this.prisma.tuyen_xe.findFirst({ where: { tentuyen: p.routeName } });
    const car = await this.prisma.xe.findFirst({ where: { OR: [{ tenxe: p.carName }, { biensoxe: p.licensePlate }] } });
    const driver = await this.prisma.tai_xe_phu_xe.findFirst({ where: { hoten: p.driverName, vaitro: 'TaiXe' } });
    const codriver = p.codriverName ? await this.prisma.tai_xe_phu_xe.findFirst({ where: { hoten: p.codriverName, vaitro: 'PhuXe' } }) : null;
    if (!route || !car || !driver || (p.codriverName && !codriver)) throw new BadRequestException('Tuyến, xe hoặc nhân sự không tồn tại');
    const departure = this.combineDateTime(p.departureDate, p.departureTime); const duration = Number.parseFloat(p.duration || '0'); const arrival = new Date(departure.getTime() + duration * 3600000); const now = new Date();
    return { malichtrinh: id, matuyenduong: route.matuyenduong, maxe: car.maxe, mataixechinh: driver.manhansu, maphuxe: codriver?.manhansu || null, ngaykhoihanh: this.dateOnly(p.departureDate), giokhoihanh: departure, thoigiankhoihanh: departure, thoigiandendukien: arrival, thoigiandenthucte: null, songaymobantruoc: 10, sophutdongbantruoc: 30, thoigiandongbanve: new Date(departure.getTime() - 30 * 60000), thoigiangiuchophut: 15, giavecoso: p.price || route.giacoso, trangthai: this.statusToDb(p.status || 'waiting'), ghichu: null, thoigiantao: now, thoigiancapnhat: now };
  }
  private toDto(r: any) { return { id: r.malichtrinh, routeName: r.tuyen_xe.tentuyen, startPoint: r.tuyen_xe.diemdi, endPoint: r.tuyen_xe.diemden, licensePlate: r.xe.biensoxe, carName: r.xe.tenxe || r.xe.biensoxe, driverName: r.tai_xe_phu_xe_lich_trinh_mataixechinhTotai_xe_phu_xe.hoten, codriverName: r.tai_xe_phu_xe_lich_trinh_maphuxeTotai_xe_phu_xe?.hoten || '', departureDate: this.formatDate(r.ngaykhoihanh), departureTime: this.formatTime(r.giokhoihanh), duration: `${Math.max(0, (new Date(r.thoigiandendukien).getTime() - new Date(r.thoigiankhoihanh).getTime()) / 3600000)} tiếng`, status: this.statusToUi(r.trangthai), seatsCount: this.seats(r.xe.loaixe), price: Number(r.giavecoso) }; }
  private combineDateTime(d: string, t: string) { return new Date(`${d}T${t}:00`); }
  private dateOnly(d: string) { const x = new Date(`${d}T00:00:00Z`); return x; }
  private formatDate(d: Date) { return new Date(d).toISOString().slice(0, 10); }
  private formatTime(d: Date) { return new Date(d).toISOString().slice(11, 16); }
  private seats(x: string) { return x === 'Limousine9Cho' ? 9 : x === 'Cabin22Cho' ? 22 : 34; }
  private statusToDb(x: string): any { return ({ waiting: 'ChuaMoBan', running: 'DangChay', completed: 'HoanThanh', locked: 'DaHuy' } as any)[x] || x; }
  private statusToUi(x: string) { return ({ ChuaMoBan: 'waiting', DangMoBan: 'waiting', DangChay: 'running', HoanThanh: 'completed', DaHuy: 'locked' } as any)[x] || 'waiting'; }
}

export interface SchedulePayload { routeName: string; carName: string; licensePlate?: string; driverName: string; codriverName?: string; departureDate: string; departureTime: string; duration?: string; price?: number; status?: string; }
