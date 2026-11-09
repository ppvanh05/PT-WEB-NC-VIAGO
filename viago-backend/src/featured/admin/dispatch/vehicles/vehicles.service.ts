import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class AdminVehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly allAmenities = ['Wifi', 'MayLanh', 'ConSacUSB', 'GheDaNgua', 'RemCua', 'RiengTu', 'ChanDap', 'TV'] as any[];

  async findAll() {
    await this.prisma.xe.updateMany({ data: { tiennghi: this.allAmenities } });
    return (await this.prisma.xe.findMany({ orderBy: { thoigiantao: 'desc' } })).map((row) => this.toDto(row));
  }

  async create(payload: VehiclePayload) {
    this.validate(payload);
    const now = new Date();
    const row = await this.prisma.xe.create({ data: this.toData(payload, `XE-${Date.now()}`, now) });
    return this.toDto(row);
  }

  async update(id: string, payload: VehiclePayload) {
    this.validate(payload);
    await this.ensure(id);
    const row = await this.prisma.xe.update({ where: { maxe: id }, data: this.toData(payload, id, undefined) });
    return this.toDto(row);
  }

  async setStatus(id: string, status: VehiclePayload['status']) {
    await this.ensure(id);
    const row = await this.prisma.xe.update({ where: { maxe: id }, data: { trangthai: this.statusToDb(status || 'active'), thoigiancapnhat: new Date() } });
    return this.toDto(row);
  }

  private async ensure(id: string) { if (!(await this.prisma.xe.findUnique({ where: { maxe: id }, select: { maxe: true } }))) throw new NotFoundException('Không tìm thấy phương tiện'); }
  private validate(p: VehiclePayload) { if (!p.name || !p.licensePlate || !p.type || !p.registrationExpiry || !p.insuranceExpiry || !p.vehicleImage || !p.amenities?.length || Number(p.seats) <= 0) throw new BadRequestException('Dữ liệu phương tiện không hợp lệ'); }
  private toData(p: VehiclePayload, id: string, now?: Date) { return { maxe: id, tenxe: p.name, biensoxe: p.licensePlate, loaixe: this.typeToDb(p.type), tiennghi: this.allAmenities, handangkiem: this.parseDate(p.registrationExpiry), hanbaohiem: this.parseDate(p.insuranceExpiry), anhxe: p.vehicleImage || null, anhdangkiem: p.registrationImage || null, anhbaohiem: p.insuranceImage || null, trangthai: this.statusToDb(p.status || 'active'), thoigiantao: now || new Date(), thoigiancapnhat: new Date() }; }
  private toDto(r: any) { return { id: r.maxe, name: r.tenxe || '', licensePlate: r.biensoxe, type: this.typeToUi(r.loaixe), seats: this.seats(r.loaixe), floors: 2, rows: this.rows(r.loaixe), registrationExpiry: this.formatDate(r.handangkiem), insuranceExpiry: this.formatDate(r.hanbaohiem), amenities: (r.tiennghi || []).map((x: string) => this.amenityToUi(x)), registrationImage: r.anhdangkiem, insuranceImage: r.anhbaohiem, vehicleImage: r.anhxe, status: this.statusToUi(r.trangthai) }; }
  private parseDate(value: string) { const [d, m, y] = value.split('/').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
  private formatDate(value: Date) { return new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC' }); }
  private typeToDb(x: string): any { return ({ Limousine: 'Limousine9Cho', 'Giường nằm': 'GiuongNam34Cho', Cabin: 'Cabin22Cho', 'Cabin đôi': 'Cabin22Cho' } as any)[x] || x; }
  private typeToUi(x: string) { return ({ Limousine9Cho: 'Limousine', GiuongNam34Cho: 'Giường nằm', Cabin22Cho: 'Cabin' } as any)[x] || x; }
  private seats(x: string) { return x === 'Limousine9Cho' ? 9 : x === 'Cabin22Cho' ? 22 : 34; }
  private rows(x: string) { return x === 'Limousine9Cho' ? 2 : 3; }
  private statusToDb(x: string): any { return ({ active: 'DangHoatDong', maintenance: 'BaoTri', locked: 'DaKhoa', 'Đang hoạt động': 'DangHoatDong', 'Bảo trì': 'BaoTri', 'Đã khóa': 'DaKhoa' } as any)[x] || x; }
  private statusToUi(x: string) { return ({ DangHoatDong: 'Đang hoạt động', BaoTri: 'Bảo trì', DaKhoa: 'Đã khóa' } as any)[x] || x; }
  private amenityToDb(x: string): any { return ({ Wifi: 'Wifi', Tivi: 'TV', 'Ổ sạc USB': 'ConSacUSB', 'Điều hòa': 'MayLanh' } as any)[x] || 'RiengTu'; }
  private amenityToUi(x: string) { return ({ Wifi: 'Wifi', TV: 'Tivi', ConSacUSB: 'Ổ sạc USB', MayLanh: 'Điều hòa', RiengTu: 'GPS' } as any)[x] || x; }
}

export interface VehiclePayload { name: string; licensePlate: string; type: string; seats: number; registrationExpiry: string; insuranceExpiry: string; amenities: string[]; status?: 'active'|'maintenance'|'locked'; registrationImage?: string|null; insuranceImage?: string|null; vehicleImage?: string|null; }
