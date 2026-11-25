import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { ReviewsFeedback } from './reviews-feedback';

const review = (over: Record<string, unknown> = {}) => ({
  MaDanhGia: 'DG001',
  MaVe: 'VE001',
  MaKhachHang: 'KH001',
  HoTenKhachHang: 'Nguyễn Văn An',
  SoDienThoai: '0912345678',
  MaLichTrinh: 'LT001',
  TenTuyenXe: 'TP.HCM - Cần Thơ',
  SoSao: 5,
  NoiDungDanhGia: 'Chuyến đi thoải mái',
  ThoiGianDanhGia: '2026-06-18T10:00:00.000Z',
  TrangThaiPhanHoi: 'ChuaPhanHoi',
  DiemAnToan: 5,
  DiemSachSe: 5,
  DiemThaiDo: 5,
  DiemDungGio: 5,
  DiemThongTin: 5,
  DiemTienNghi: 5,
  TrangThai: 'hien-thi',
  TrangThaiXuLy: 'moi',
  MucDoKhanCap: 'thap',
  BienSoXe: '51B-890.12',
  GioKhoiHanh: '08:00',
  TaiXe: 'Nguyễn Văn Hùng',
  LichSuLoiTaiXe: '',
  SoFeedbackCungChuyen: 1,
  SlaTimeLimit: '2026-06-19T10:00:00.000Z',
  ...over,
});

function build(reviews: ReturnType<typeof review>[] = []) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ReviewsFeedback],
    providers: [
      { provide: AccountsApiService, useValue: { request: async () => ({ items: [], pagination: { totalPages: 1 } }) } },
    ],
  });
  const page = TestBed.createComponent(ReviewsFeedback).componentInstance;
  page.DanhSachDanhGia.set(reviews as never);
  return page;
}

describe('Admin reviews and feedback screen', () => {
  const reviews = [
    review({ MaDanhGia: 'DG001', SoSao: 5, TrangThaiXuLy: 'moi' }),
    review({
      MaDanhGia: 'DG002', HoTenKhachHang: 'Trần Thị Bình', SoDienThoai: '0987654321',
      TenTuyenXe: 'TP.HCM - Vũng Tàu', SoSao: 2, NoiDungDanhGia: 'Xe tới trễ',
      TrangThaiXuLy: 'da-xong', GioKhoiHanh: '14:00', DiemDungGio: 1, DiemThaiDo: 3,
      ThoiGianDanhGia: '2026-06-20T08:00:00.000Z',
    }),
    review({ MaDanhGia: 'DG003', SoSao: 3, TrangThaiXuLy: 'dong', DiemSachSe: 2 }),
  ];

  it('treats finished and closed tickets as handled, everything else as outstanding', () => {
    const page = build();
    expect(page.LaDaXuLy(review({ TrangThaiXuLy: 'da-xong' }) as never)).toBe(true);
    expect(page.LaDaXuLy(review({ TrangThaiXuLy: 'dong' }) as never)).toBe(true);
    expect(page.LaChuaXuLy(review({ TrangThaiXuLy: 'moi' }) as never)).toBe(true);
    expect(page.LaChuaXuLy(review({ TrangThaiXuLy: 'dang-xu-ly' }) as never)).toBe(true);
  });

  it('lists only the criteria scored three or below so staff see what went wrong', () => {
    const page = build();
    const low = page.LayTieuChiThap(review({ DiemDungGio: 1, DiemThaiDo: 3, DiemSachSe: 5 }) as never);
    expect(low.map(c => c.ten)).toEqual(['Thái độ', 'Đúng giờ']);
    expect(page.LayTieuChiThap(review() as never)).toEqual([]);
  });

  it('filters by handling state', () => {
    const page = build(reviews);
    page.LocTrangThaiXuLy.set('da-xu-ly');
    expect(page.DanhSachLoc().map(r => r.MaDanhGia)).toEqual(['DG002', 'DG003']);
    page.LocTrangThaiXuLy.set('chua-xu-ly');
    expect(page.DanhSachLoc().map(r => r.MaDanhGia)).toEqual(['DG001']);
  });

  it('filters by star rating through the star checkboxes', () => {
    const page = build(reviews);
    page.LocSao.set({ 1: false, 2: true, 3: false, 4: false, 5: false });
    expect(page.DanhSachLoc().map(r => r.MaDanhGia)).toEqual(['DG002']);
    page.ToggleChonTatCaSao();
    expect(page.DanhSachLoc()).toHaveLength(3);
  });

  it('filters by route, departure time and review date', () => {
    const page = build(reviews);
    page.LocTuyenXe.set('TP.HCM - Vũng Tàu');
    expect(page.DanhSachLoc().map(r => r.MaDanhGia)).toEqual(['DG002']);
    page.LocTuyenXe.set('tat-ca');
    page.LocGioKhoiHanh.set('14:00');
    expect(page.DanhSachLoc().map(r => r.MaDanhGia)).toEqual(['DG002']);
    page.LocGioKhoiHanh.set('tat-ca');
    page.LocNgayTao.set('2026-06-20');
    expect(page.DanhSachLoc().map(r => r.MaDanhGia)).toEqual(['DG002']);
  });

  it('searches customer name, phone, route, schedule code and review text', () => {
    const page = build(reviews);
    for (const term of ['Trần Thị Bình', '0987654321', 'Vũng Tàu', 'LT001', 'tới trễ']) {
      page.TuKhoaTimKiem.set(term);
      const ids = page.DanhSachLoc().map(r => r.MaDanhGia);
      expect(ids.length, term).toBeGreaterThan(0);
    }
    page.TuKhoaTimKiem.set('không có đánh giá nào như vậy');
    expect(page.DanhSachLoc()).toHaveLength(0);
  });

  it('keeps at least one page even with nothing to show', () => {
    expect(build([]).tongTrang()).toBe(1);
  });

  it('pages the list ten reviews at a time', () => {
    const page = build(Array.from({ length: 24 }, (_, i) => review({ MaDanhGia: 'DG' + i })));
    expect(page.tongTrang()).toBe(3);
    expect(page.danhSachPhanTrang()).toHaveLength(10);
  });
});
