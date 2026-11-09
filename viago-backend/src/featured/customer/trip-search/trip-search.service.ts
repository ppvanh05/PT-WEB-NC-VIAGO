import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CustomerTripSearchService {
  constructor(private readonly prisma: PrismaService) {}
  async search(from: string, to: string, date: string) {
    if (!from || !to || !date) return [];
    const rows = await this.prisma.lich_trinh.findMany({ where: { ngaykhoihanh: new Date(`${date}T00:00:00Z`), trangthai: { in: ['ChuaMoBan', 'DangMoBan', 'DangChay'] }, tuyen_xe: { diemdi: from, diemden: to, trangthai: 'HoatDong' } }, include: { tuyen_xe: true, xe: true, lich_trinh_diem: { include: { diem_don_tra: true }, orderBy: { thutu: 'asc' } }, tai_xe_phu_xe_lich_trinh_mataixechinhTotai_xe_phu_xe: true } });
    return rows.map((r) => { const departure = new Date(r.thoigiankhoihanh); const arrival = new Date(r.thoigiandendukien); const type = r.xe.loaixe === 'Limousine9Cho' ? 'Limousine 9 chỗ' : r.xe.loaixe === 'Cabin22Cho' ? 'Cabin 22 chỗ' : 'Giường nằm 34 chỗ'; const seats = type === 'Limousine 9 chỗ' ? Array.from({ length: 9 }, (_, i) => `${i + 1}A`) : ['A', 'B'].flatMap(f => Array.from({ length: type === 'Cabin 22 chỗ' && f === 'A' ? 12 : type === 'Cabin 22 chỗ' ? 10 : 17 }, (_, i) => `${i + 1}${f}`)); const points = r.lich_trinh_diem.map((p: any) => ({ id: p.madiem, name: p.diem_don_tra.tendiem, address: p.diem_don_tra.diachi, kind: 'station', at: departure.toISOString() })); return { id: r.malichtrinh, from: r.tuyen_xe.diemdi, to: r.tuyen_xe.diemden, date, departureAt: departure.toISOString(), arrivalAt: arrival.toISOString(), saleClosesAt: new Date(r.thoigiandongbanve).toISOString(), status: 'open', type, price: Number(r.giavecoso), distance: Number(r.tuyen_xe.khoangcach), seats, soldSeats: [], pickup: points.filter((p: any) => p.kind === 'station'), dropoff: points.filter((p: any) => p.kind === 'station'), amenities: [] }; });
  }
}
