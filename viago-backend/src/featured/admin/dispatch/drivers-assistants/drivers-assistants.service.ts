import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class AdminDriversAssistantsService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return (await this.prisma.tai_xe_phu_xe.findMany({ orderBy: { thoigiantao: 'desc' } })).map((r) => this.toDto(r)); }
  async create(p: PersonnelPayload) { this.validate(p); const now = new Date(); return this.toDto(await this.prisma.tai_xe_phu_xe.create({ data: this.toData(p, `NS-${Date.now()}`, now) })); }
  async update(id: string, p: PersonnelPayload) { this.validate(p); await this.ensure(id); return this.toDto(await this.prisma.tai_xe_phu_xe.update({ where: { manhansu: id }, data: this.toData(p, id) })); }
  async setStatus(id: string, status: string) { await this.ensure(id); return this.toDto(await this.prisma.tai_xe_phu_xe.update({ where: { manhansu: id }, data: { trangthai: this.statusToDb(status), thoigiancapnhat: new Date() } })); }
  private async ensure(id: string) { if (!(await this.prisma.tai_xe_phu_xe.findUnique({ where: { manhansu: id }, select: { manhansu: true } }))) throw new NotFoundException('Không tìm thấy nhân sự'); }
  private validate(p: PersonnelPayload) { if (!p.name || !p.dob || !p.phone || !p.identityNumber || !p.role || !p.licenseExpiry) throw new BadRequestException('Dữ liệu nhân sự không hợp lệ'); }
  private toData(p: PersonnelPayload, id: string, now?: Date) { return { manhansu: id, hoten: p.name, vaitro: this.roleToDb(p.role), ngaysinh: this.parseDate(p.dob), sodienthoai: p.phone, cccd: p.identityNumber, hanggplx: p.licenseClass || null, hangplx: p.licenseExpiry ? this.parseDate(p.licenseExpiry) : null, anhchandung: p.avatar || null, anhgplxmattruoc: p.licenseFrontImage || null, anhgplxmatsau: p.licenseBackImage || null, anhcccdmattruoc: p.identityFrontImage || null, anhcccdmatsau: p.identityBackImage || null, trangthai: this.statusToDb(p.status || 'active'), thoigiantao: now || new Date(), thoigiancapnhat: new Date() }; }
  private toDto(r: any) { return { id: r.manhansu, name: r.hoten, role: this.roleToUi(r.vaitro), dob: this.formatDate(r.ngaysinh), phone: r.sodienthoai, identityNumber: r.cccd, licenseClass: r.hanggplx || '', licenseExpiry: r.hangplx ? this.formatDate(r.hangplx) : '', avatar: r.anhchandung, licenseFrontImage: r.anhgplxmattruoc, licenseBackImage: r.anhgplxmatsau, identityFrontImage: r.anhcccdmattruoc, identityBackImage: r.anhcccdmatsau, status: this.statusToUi(r.trangthai) }; }
  private parseDate(v: string) { const a = v.includes('-') ? v.split('-').map(Number) : v.split('/').map(Number).reverse(); return new Date(Date.UTC(a[0], a[1] - 1, a[2])); }
  private formatDate(v: Date) { return new Date(v).toLocaleDateString('en-GB', { timeZone: 'UTC' }); }
  private roleToDb(v: string): any { return ({ 'Tài xế': 'TaiXe', 'Phụ xe': 'PhuXe' } as any)[v] || v; }
  private roleToUi(v: string) { return ({ TaiXe: 'Tài xế', PhuXe: 'Phụ xe' } as any)[v] || v; }
  private statusToDb(v: string): any { return ({ active: 'DangHoatDong', locked: 'DaKhoa', 'Đang hoạt động': 'DangHoatDong', 'Đã khóa': 'DaKhoa' } as any)[v] || v; }
  private statusToUi(v: string) { return ({ DangHoatDong: 'Đang hoạt động', DaKhoa: 'Đã khóa' } as any)[v] || v; }
}

export interface PersonnelPayload { name: string; role: string; dob: string; phone: string; identityNumber: string; licenseClass?: string; licenseExpiry?: string; status?: string; avatar?: string|null; licenseFrontImage?: string|null; licenseBackImage?: string|null; identityFrontImage?: string|null; identityBackImage?: string|null; }
