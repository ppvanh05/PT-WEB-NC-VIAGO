import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminContentApi } from '../../../../core/services/content-api.service';
import { CounterOrder } from '../counter-orders/counter-orders';
import { BookingManagement } from './booking-management';

type Ticket = ReturnType<BookingManagement['danhSachVe']>[number];
const ticket: Ticket = {
  MaVe: 'VE100', MaDonHang: 'DH100', HoTenNguoiDi: 'Nguyễn An', SdtNguoiDi: '0900000000',
  ThoiGianDat: '2050-01-01T00:00:00Z', MaLichTrinh: 'LT100', TenTuyenXe: 'TP.HCM → Cần Thơ',
  NgayKhoiHanh: '2050-01-03', GioKhoiHanh: '05:30', SoGhe: 'A01', GiaVe: 180000,
  MaDiemDon: 'Bến xe', MaDiemTra: 'Văn phòng', PhuongThucThanhToan: 'tien-mat',
  TrangThaiDonHang: 'da-thanh-toan', TrangThaiVe: 'cho-khoi-hanh', NguonDat: 'tai-quay',
};
const order: CounterOrder = {
  id: 'DH200', name: 'Nguyễn Bình', phone: '0900000000', from: 'TP.HCM', to: 'Cần Thơ',
  createdAt: '2050-01-02T00:00:00Z', departureAt: '2050-01-03T22:30:00Z',
  expiresAt: '2050-01-03T23:00:00Z', total: 360000, seatCount: 2, status: 'ChoThanhToanTrucTiep',
};

describe('Unified booked tickets list', () => {
  let request: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    request = vi.fn().mockResolvedValue({ data: [order], pagination: { total: 1, totalPages: 1 } });
    TestBed.configureTestingModule({
      imports: [BookingManagement],
      providers: [provideRouter([]), { provide: AdminContentApi, useValue: { request } }],
    });
    vi.spyOn(BookingManagement.prototype, 'TaiDuLieu').mockImplementation(function (this: BookingManagement) {
      this.danhSachVe.set([{ ...ticket }]);
    });
  });
  afterEach(() => vi.restoreAllMocks());

  async function render() {
    const fixture = TestBed.createComponent(BookingManagement);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.counterOrders()?.loading()).toBe(false));
    fixture.detectChanges();
    return fixture;
  }

  it('renders API orders and existing tickets in one table with one filter and pager', async () => {
    const fixture = await render();
    const page = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('table')).toHaveLength(1);
    expect(root.querySelectorAll('app-pagination')).toHaveLength(1);
    expect(root.querySelectorAll('input[aria-label="Tìm kiếm"]')).toHaveLength(1);
    expect(root.querySelector('.order-result-panel, .order-matches-panel, #counter-search')).toBeNull();
    expect(root.querySelector('tbody')!.textContent).toContain('DH200');
    expect(root.querySelector('tbody')!.textContent).toContain('VE100');
    expect(page.danhSachTongHop().map(row => row.key)).toEqual(['order:DH200', 'ticket:VE100']);

    const input = root.querySelector('input[aria-label="Tìm kiếm"]') as HTMLInputElement;
    input.value = '0900000000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(root.querySelector('.order-result-panel, .order-matches-panel')).toBeNull();
    page.CapNhatTuKhoa('DH200');
    page.TimKiemTongHop();
    fixture.detectChanges();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(root.querySelector('tbody')!.textContent).toContain('DH200');
    page.CapNhatTuKhoa('không có đơn này');
    fixture.detectChanges();
    expect(root.querySelector('.empty-table')).not.toBeNull();
  });

  it('applies source, date, route and payment filters to persisted orders too', async () => {
    const page = (await render()).componentInstance;
    page.locTuyen.set('Can Tho');
    page.locNgay.set('2050-01-04'); // Departure date in Vietnam, not UTC.
    page.locNguonDat.set('online');
    page.locTrangThaiDonHang.set('pending');
    expect(page.danhSachTongHop().map(row => row.key)).toEqual(['order:DH200']);
    page.locTrangThaiDonHang.set('da-thanh-toan');
    expect(page.danhSachTongHop()).toHaveLength(0);
    page.XoaBoLoc();
    expect(page.danhSachTongHop()).toHaveLength(2);
    page.locTrangThaiVe.set('het-han');
    page.counterOrders()!.rows.set([{ ...order, status: 'HetHanThanhToan' }]);
    expect(page.danhSachTongHop().map(row => row.key)).toEqual(['order:DH200']);
  });

  it('loads all API pages before sharing the common pagination and avoids duplicate orders', async () => {
    const orders = Array.from({ length: 10 }, (_, i) => ({ ...order, id: `DH${200 + i}` }));
    request.mockImplementation(async (path: string) => {
      const q = new URLSearchParams(path.split('?')[1]);
      expect(q.get('status')).toBe('all');
      expect(q.get('pageSize')).toBe('100');
      return { data: q.get('page') === '1' ? orders.slice(0, 5) : orders.slice(5), pagination: { total: 10, totalPages: 2 } };
    });
    const fixture = await render();
    const page = fixture.componentInstance;
    expect(page.danhSachTongHop()).toHaveLength(11);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(8);
    const button = fixture.nativeElement.querySelector('app-pagination button[aria-label="Trang 2"]');
    button.click();
    fixture.detectChanges();
    expect(page.trangHopLe()).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(3);
    page.danhSachVe.update(rows => [...rows, { ...ticket, MaVe: 'VE200', MaDonHang: 'DH200' }]);
    expect(page.danhSachTongHop()).toHaveLength(11);
    expect(page.thongKe().tong).toBe(21);
    page.CapNhatTuKhoa('DH209');
    expect(page.trangHopLe()).toBe(1);
    expect(page.danhSachPhanTrang().map(row => row.key)).toEqual(['order:DH209']);
  });

  it('collects through the API from the pencil action without modifying the local tickets', async () => {
    let paid = false;
    request.mockImplementation(async (_path: string, method: string) => {
      if (method === 'POST') { paid = true; return { status: 'paid' }; }
      return { data: [{ ...order, status: paid ? 'DaThanhToan' : order.status }], pagination: { total: 1, totalPages: 1 } };
    });
    const fixture = await render();
    fixture.nativeElement.querySelector('button[aria-label="Xem và xử lý đơn DH200"]').click();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const orders = page.counterOrders()!;
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    await orders.confirm();
    expect(paid).toBe(false);
    orders.acknowledged = true;
    await orders.confirm();
    fixture.detectChanges();
    expect(request).toHaveBeenCalledWith('counter-orders/DH200/confirm', 'POST', {}, expect.any(AbortSignal));
    expect(orders.rows()[0].status).toBe('DaThanhToan');
    expect(page.danhSachVe()).toEqual([ticket]);
    expect(fixture.nativeElement.querySelectorAll('table')).toHaveLength(1);
  });

  it('opens expired orders for inspection without offering cash confirmation', async () => {
    request.mockResolvedValue({ data: [{ ...order, status: 'HetHanThanhToan' }], pagination: { total: 1, totalPages: 1 } });
    const fixture = await render();
    fixture.nativeElement.querySelector('button[aria-label="Xem và xử lý đơn DH200"]').click();
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(modal.textContent).toContain('Hết hạn');
    expect(modal.querySelector('.modal-button--primary, input[type="checkbox"]')).toBeNull();
  });

  it('shows a load failure alongside existing tickets instead of pretending all orders were loaded', async () => {
    request.mockRejectedValue(new Error('API unavailable'));
    const fixture = await render();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('API unavailable');
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(fixture.componentInstance.counterOrders()!.rows()).toHaveLength(0);
  });
});
