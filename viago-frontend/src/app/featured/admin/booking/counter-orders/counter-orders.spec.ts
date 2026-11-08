import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminContentApi } from '../../../../core/services/content-api.service';
import { CounterOrders } from './counter-orders';
const row = {
  id: 'DH016',
  name: 'Test Guest',
  phone: '0900000000',
  from: 'TP.HCM',
  to: 'Cần Thơ',
  departureAt: new Date(Date.now() + 86400000).toISOString(),
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  total: 180000,
  seatCount: 1,
  status: 'ChoThanhToanTrucTiep',
};
describe('Counter orders', () => {
  let request: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    request = vi.fn();
    TestBed.configureTestingModule({
      imports: [CounterOrders],
      providers: [{ provide: AdminContentApi, useValue: { request } }],
    });
  });
  it('loads persisted guest orders and requires receipt acknowledgement before collecting cash', async () => {
    request.mockImplementation(async (_path: string, method: string) =>
      method === 'POST'
        ? { status: 'paid' }
        : { data: [row], pagination: { total: 1, totalPages: 1 } },
    );
    const fixture = TestBed.createComponent(CounterOrders),
      page = fixture.componentInstance;
    fixture.detectChanges();
    await vi.waitFor(() => expect(page.loading()).toBe(false));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('DH016');
    page.open(row);
    await page.confirm();
    expect(request.mock.calls.some((c) => c[1] === 'POST')).toBe(false);
    page.acknowledged = true;
    await page.confirm();
    expect(request).toHaveBeenCalledWith(
      'counter-orders/DH016/confirm',
      'POST',
      {},
      expect.any(AbortSignal),
    );
    expect(page.notice()).toContain('xuất vé');
    expect(page.selected()).toBeNull();
  });
  it('does not accept cash for an expired reservation', async () => {
    const page = TestBed.createComponent(CounterOrders).componentInstance;
    page.open({ ...row, expiresAt: new Date(Date.now() - 1000).toISOString() });
    expect(page.selected()).toBeNull();
  });
  it('preserves the order and shows a server conflict without claiming payment succeeded', async () => {
    request.mockRejectedValue(new Error('Order expired'));
    const page = TestBed.createComponent(CounterOrders).componentInstance;
    page.open(row);
    page.acknowledged = true;
    await page.confirm();
    expect(page.selected()?.id).toBe('DH016');
    expect(page.error()).toBe('Order expired');
    expect(page.notice()).toBe('');
  });
});
