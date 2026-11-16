import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminBookingOrders } from './booking-orders';
import { AdminBookingOrder, BookingOrdersApi } from './booking-orders-api';

const pending: AdminBookingOrder = {
  id: 'DH_TEST',
  status: 'pending',
  orderStatus: 'ChoThanhToanOnline',
  source: 'TaiQuay',
  note: '',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  serverTime: new Date().toISOString(),
  subtotal: 160000,
  discount: 0,
  total: 160000,
  method: 'vietqr',
  requiresReview: false,
  passenger: { name: 'Nguyễn Văn An', phone: '0901234567' },
  legs: [],
  tickets: [],
  transfer: {
    qrUrl: 'https://example.invalid/qr.png',
    bankId: '970422',
    accountNumber: 'TEST0001',
    accountName: 'TEST',
    amount: 160000,
    content: 'VG123',
    environment: 'test',
  },
};
describe('Admin persisted order and payment UI', () => {
  it('shows the booking journey state in the detail banner after payment', () => {
    const page = Object.create(AdminBookingOrders.prototype) as AdminBookingOrders;
    expect(page.orderLabel({...pending, status:'paid', journeyStatus:'upcoming'})).toBe('Chờ khởi hành');
    expect(page.orderLabel({...pending, status:'paid', journeyStatus:'completed'})).toBe('Đã hoàn thành');
    expect(page.orderLabel({...pending, status:'cancelled', journeyStatus:'completed'})).toBe('Đã hủy');
  });
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
    return { promise, resolve, reject };
  }
  let api: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    api = {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { totalPages: 0 } }),
      get: vi.fn().mockResolvedValue(pending),
      confirm: vi.fn(),
      cancel: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [AdminBookingOrders],
      providers: [{ provide: BookingOrdersApi, useValue: api }],
    });
  });
  it('shows the customer payment QR without internal notes or simulation instructions', async () => {
    const fixture = TestBed.createComponent(AdminBookingOrders);
    fixture.componentInstance.embedded = true;
    fixture.detectChanges();
    await fixture.componentInstance.open({ ...pending, note: 'Internal staff note' });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(fixture.nativeElement.querySelector('.qr-frame img')?.getAttribute('src')).toBe(
      pending.transfer!.qrUrl,
    );
    expect(text).not.toContain('Đang thử nghiệm');
    expect(text).not.toContain('mô phỏng');
    expect(text).not.toContain('Dùng thông tin dưới đây');
    expect(text).not.toContain('Internal staff note');
    expect(text).not.toContain('Xác nhận thu tiền mặt');
    fixture.componentInstance.acknowledged = true;
    await fixture.componentInstance.confirm();
    expect(api.confirm).not.toHaveBeenCalled();
  });
  it('requires a receipt acknowledgement and preserves pending state on server failure', async () => {
    const page = TestBed.createComponent(AdminBookingOrders).componentInstance;
    page.embedded = true;
    await page.open({ ...pending, method: 'counter', transfer: null });
    await page.confirm();
    expect(api.confirm).not.toHaveBeenCalled();
    api.confirm.mockRejectedValue(new Error('Đơn đã hết hạn.'));
    page.acknowledged = true;
    await page.confirm();
    expect(page.selected()?.status).toBe('pending');
    expect(page.error()).toContain('hết hạn');
  });
  it('shows the OCB VA recipient for a live transfer without the test notice', async () => {
    const fixture = TestBed.createComponent(AdminBookingOrders);
    fixture.componentInstance.embedded = true; fixture.detectChanges();
    await fixture.componentInstance.open({ ...pending, transfer: {
      ...pending.transfer!, accountNumber: 'VATEST001', accountType: 'virtual', environment: 'live',
    } });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Số tài khoản');
    expect(text).toContain('VATEST001'); expect(text).not.toContain('Đang thử nghiệm');
    expect(text).not.toContain('Xác nhận thu tiền mặt');
  });
  it('cancels only after a reason is entered and uses the server result', async () => {
    const page = TestBed.createComponent(AdminBookingOrders).componentInstance;
    page.embedded = true;
    await page.open(pending);
    await page.cancel();
    expect(api.cancel).not.toHaveBeenCalled();
    api.cancel.mockResolvedValue({ ...pending, status: 'cancelled', transfer: null });
    page.cancelReason = 'Khách yêu cầu';
    await page.cancel();
    expect(api.cancel).toHaveBeenCalledWith('DH_TEST', 'Khách yêu cầu');
    expect(page.selected()?.status).toBe('cancelled');
  });
  it('opens immediately with the list summary while details are loading and blocks actions', async () => {
    const fixture = TestBed.createComponent(AdminBookingOrders);
    const page = fixture.componentInstance; page.embedded = true; fixture.detectChanges();
    const response = deferred<AdminBookingOrder>(); api.get.mockReturnValueOnce(response.promise);
    const opening = page.open(pending.id, { id: pending.id, name: pending.passenger.name, phone: pending.passenger.phone, total: pending.total });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Đang tải chi tiết');
    expect(fixture.nativeElement.textContent).toContain(pending.passenger.name);
    expect(page.selected()).toBeNull();
    page.acknowledged = true; page.cancelReason = 'Cancel';
    await page.confirm(); await page.cancel();
    expect(api.confirm).not.toHaveBeenCalled(); expect(api.cancel).not.toHaveBeenCalled();
    response.resolve(pending); await opening;
    expect(page.selected()?.id).toBe(pending.id); expect(page.detailLoading()).toBe(false);
  });
  it('aborts a detail request on close and ignores its late response', async () => {
    const page = TestBed.createComponent(AdminBookingOrders).componentInstance; page.embedded = true;
    const response = deferred<AdminBookingOrder>(); api.get.mockReturnValueOnce(response.promise);
    const opening = page.open(pending.id);
    const signal = api.get.mock.calls[0][1] as AbortSignal;
    page.close(); expect(signal.aborted).toBe(true);
    response.resolve(pending); await opening;
    expect(page.detailId()).toBeNull(); expect(page.selected()).toBeNull();
  });
  it('ignores errors from an older selection after another order has loaded', async () => {
    const page = TestBed.createComponent(AdminBookingOrders).componentInstance; page.embedded = true;
    const old = deferred<AdminBookingOrder>(); api.get.mockReturnValueOnce(old.promise);
    const opening = page.open('OLD');
    await page.open(pending.id);
    old.reject(new Error('Old request failed')); await opening;
    expect(page.selected()?.id).toBe(pending.id); expect(page.error()).toBe('');
    expect(page.detailLoading()).toBe(false);
  });
  it('keeps the dialog open after a failed load and can retry', async () => {
    const page = TestBed.createComponent(AdminBookingOrders).componentInstance; page.embedded = true;
    api.get.mockRejectedValueOnce(new Error('Server unavailable'));
    await page.open(pending.id);
    expect(page.detailId()).toBe(pending.id); expect(page.selected()).toBeNull();
    expect(page.error()).toContain('Server unavailable'); expect(page.detailLoading()).toBe(false);
    await page.open(pending.id);
    expect(page.selected()?.id).toBe(pending.id); expect(page.error()).toBe('');
  });
});
