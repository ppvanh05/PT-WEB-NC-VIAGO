import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { CancellationReport } from './cancellation-report';

const record = (over: Record<string, unknown> = {}) => ({
  MaLichSuHuy: 'LS001',
  MaVe: 'VE001',
  MaDonHang: 'DH001',
  MaChinhSach: 'CS001',
  NguonHuy: 'KhachHang',
  NguonDat: 'online',
  MaKhachHang: 'KH001',
  MaNVBanVe: '',
  HoTenNguoiDi: 'Nguyễn Văn An',
  SdtNguoiDi: '0912345678',
  TenTuyenXe: 'TP.HCM - Cần Thơ',
  NgayKhoiHanh: '2026-06-20',
  GioKhoiHanh: '08:00',
  SoGhe: 'A01',
  MaXe: 'XE001',
  TenXe: 'Giường nằm 34 chỗ',
  BienSoXe: '51B-890.12',
  LoaiXe: 'Giường nằm',
  LoaiGhe: 'Giường đơn',
  TienVeGoc: 200000,
  TyLePhiHuyApDung: 50,
  LePhiHuy: 100000,
  TienHoanLai: 100000,
  ThoiGianHuy: '2026-06-18',
  ThoiDiemHuyIso: '2026-06-18T10:00:00.000Z',
  LyDoHuy: 'Khách yêu cầu',
  TrangThaiGiaoDich: 'da-hoan',
  TrangThaiDonHang: 'da-thanh-toan',
  DonHangDaHuyToanBo: true,
  TongVeTrongDon: 1,
  SoVeDaHuyTrongDon: 1,
  PhuongThucThanhToan: 'VIETQR',
  ...over,
});

function build(rows: ReturnType<typeof record>[] = []) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CancellationReport],
    providers: [
      { provide: AccountsApiService, useValue: { request: async () => ({ items: [], pagination: { totalPages: 1 } }) } },
    ],
  });
  const page = TestBed.createComponent(CancellationReport).componentInstance;
  page.danhSachHuy.set(rows as never);
  return page;
}

describe('Admin cancellation and refund report', () => {
  const rows = [
    record({ MaLichSuHuy: 'LS001', MaVe: 'VE001', TienVeGoc: 200000, LePhiHuy: 100000,
      TienHoanLai: 100000, TrangThaiGiaoDich: 'da-hoan', ThoiGianHuy: '2026-06-18',
      ThoiDiemHuyIso: '2026-06-18T10:00:00.000Z' }),
    record({ MaLichSuHuy: 'LS002', MaVe: 'VE002', HoTenNguoiDi: 'Trần Thị Bình',
      SdtNguoiDi: '0987654321', TenTuyenXe: 'TP.HCM - Vũng Tàu', TienVeGoc: 400000,
      LePhiHuy: 0, TienHoanLai: 400000, TrangThaiGiaoDich: 'cho-hoan',
      LyDoHuy: 'Nhà xe không phục vụ', NguonDat: 'tai-quay', MaNVBanVe: 'NV001',
      ThoiGianHuy: '2026-06-25', ThoiDiemHuyIso: '2026-06-25T09:00:00.000Z' }),
    record({ MaLichSuHuy: 'LS003', MaVe: 'VE003', TienVeGoc: 300000, LePhiHuy: 300000,
      TienHoanLai: 0, TrangThaiGiaoDich: 'khong-hoan', LyDoHuy: 'Khách yêu cầu',
      ThoiGianHuy: '2026-06-01', ThoiDiemHuyIso: '2026-06-01T07:00:00.000Z' }),
  ];

  it('totals refunds, cancellation fees and the revenue lost to cancellations', () => {
    const stats = build(rows).thongKe();
    expect(stats.tongLuotHuy).toBe(3);
    expect(stats.tongTienHoan).toBe(500000);
    expect(stats.tongPhiHuy).toBe(400000);
    expect(stats.doanhThuVeHuy).toBe(900000);
    expect(stats.giaTriTrungBinh).toBe(300000);
  });

  it('counts refunds still waiting and the share already paid back', () => {
    const stats = build(rows).thongKe();
    expect(stats.choHoan).toBe(1);
    // 1 trong 3 lượt đã hoàn xong.
    expect(stats.tiLeDaHoan).toBe(33.3);
  });

  it('reports zeros instead of dividing by zero when nothing matched', () => {
    const stats = build([]).thongKe();
    expect(stats.tongLuotHuy).toBe(0);
    expect(stats.giaTriTrungBinh).toBe(0);
    expect(stats.tiLeDaHoan).toBe(0);
    expect(stats.tiLeHuy).toBe(0);
  });

  it('lists the most recent cancellation first', () => {
    const page = build(rows);
    expect(page.danhSachLoc().map(v => v.MaLichSuHuy)).toEqual(['LS002', 'LS001', 'LS003']);
  });

  it('filters by route, reason and refund status', () => {
    const page = build(rows);
    page.locTuyen.set('TP.HCM - Vũng Tàu');
    expect(page.danhSachLoc().map(v => v.MaVe)).toEqual(['VE002']);
    page.locTuyen.set('tat-ca');
    page.locLyDo.set('Nhà xe không phục vụ');
    expect(page.danhSachLoc().map(v => v.MaVe)).toEqual(['VE002']);
    page.locLyDo.set('tat-ca');
    page.locTrangThai.set('khong-hoan');
    expect(page.danhSachLoc().map(v => v.MaVe)).toEqual(['VE003']);
  });

  it('filters by cancellation date range inclusively at both ends', () => {
    const page = build(rows);
    page.locTuNgay.set('2026-06-18');
    page.locDenNgay.set('2026-06-18');
    expect(page.danhSachLoc().map(v => v.MaVe)).toEqual(['VE001']);
    page.locDenNgay.set('2026-06-25');
    expect(page.danhSachLoc()).toHaveLength(2);
  });

  it('filters by booking channel and by the seller who handled the cancellation', () => {
    const page = build(rows);
    page.locNguonDat.set('tai-quay');
    expect(page.danhSachLoc().map(v => v.MaVe)).toEqual(['VE002']);
    page.locNguonDat.set('tat-ca');
    page.locNhanVien.set('NV001');
    expect(page.danhSachLoc().map(v => v.MaVe)).toEqual(['VE002']);
  });

  it('searches code, passenger, phone and route without needing accents', () => {
    const page = build(rows);
    for (const term of ['VE002', 'tran thi binh', '0987654321', 'vung tau']) {
      page.tuKhoa.set(term);
      expect(page.danhSachLoc().map(v => v.MaVe), term).toEqual(['VE002']);
    }
  });

  it('clears every filter and goes back to the first page', () => {
    const page = build(rows);
    page.tuKhoa.set('VE002');
    page.locTuyen.set('TP.HCM - Vũng Tàu');
    page.trangHienTai.set(3);
    page.XoaBoLoc();
    expect(page.danhSachLoc()).toHaveLength(3);
    expect(page.tuKhoa()).toBe('');
    expect(page.trangHienTai()).toBe(1);
  });
});
