import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface PickupDropoffPayload {
  name: string; address: string; city: string; mapLink?: string | null;
  image?: string | null; status?: 'active' | 'locked';
}

@Injectable()
export class AdminPickupDropoffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.diem_don_tra.findMany({
      where: { loaidiem: 'DonTra' }, orderBy: { thoigiantao: 'desc' }
    });
    return rows.map(row => this.toDto(row));
  }

  async create(payload: PickupDropoffPayload) {
    this.validate(payload);
    const id = `DDT-${Date.now()}`;
    const row = await this.prisma.diem_don_tra.create({ data: {
      madiem: id, tendiem: payload.name, diachi: payload.address,
      tinhthanh: payload.city, loaidiem: 'DonTra', linkbando: payload.mapLink || null,
      anhdiem: payload.image || null, trangthai: payload.status === 'locked' ? 'DaKhoa' : 'HoatDong',
      thoigiantao: new Date(), thoigiancapnhat: new Date()
    }});
    return this.toDto(row);
  }

  async update(id: string, payload: PickupDropoffPayload) {
    this.validate(payload);
    await this.ensure(id);
    const row = await this.prisma.diem_don_tra.update({ where: { madiem: id }, data: {
      tendiem: payload.name, diachi: payload.address, tinhthanh: payload.city,
      linkbando: payload.mapLink || null, anhdiem: payload.image || null,
      trangthai: payload.status === 'locked' ? 'DaKhoa' : 'HoatDong', thoigiancapnhat: new Date()
    }});
    return this.toDto(row);
  }

  async setStatus(id: string, status: 'active' | 'locked') {
    await this.ensure(id);
    const row = await this.prisma.diem_don_tra.update({ where: { madiem: id }, data: {
      trangthai: status === 'locked' ? 'DaKhoa' : 'HoatDong', thoigiancapnhat: new Date()
    }});
    return this.toDto(row);
  }

  private async ensure(id: string) {
    const row = await this.prisma.diem_don_tra.findUnique({ where: { madiem: id }, select: { madiem: true, loaidiem: true } });
    if (!row || row.loaidiem !== 'DonTra') throw new NotFoundException('Không tìm thấy điểm đón/trả');
  }

  private validate(payload: PickupDropoffPayload) {
    if (!payload.name?.trim() || !payload.address?.trim() || !payload.city?.trim()) {
      throw new BadRequestException('Tên, địa chỉ và tỉnh/thành là bắt buộc');
    }
  }

  private toDto(row: any) {
    return { id: row.madiem, name: row.tendiem, address: row.diachi, city: row.tinhthanh,
      type: 'don-tra', status: row.trangthai === 'HoatDong' ? 'active' : 'locked',
      image: row.anhdiem, mapLink: row.linkbando };
  }
}
