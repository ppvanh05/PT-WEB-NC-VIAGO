import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from '../../../core/services/accounts-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { Services, type VehicleDetail } from './services';

interface Call { path: string; method: string; body: unknown }

const vehicle = (over: Record<string, unknown> = {}) => ({
  id: 'LX001',
  name: 'Limousine 9 chỗ',
  category: 'Limousine',
  maxPassengers: 9,
  description: 'Xe 9 chỗ ghế ngả',
  engine: '2.0 Diesel',
  fuel: 'Dầu',
  year: 2023,
  transmission: 'Số tự động',
  amenities: ['Wifi', 'Nước suối'],
  images: [{ url: 'https://viago.vn/xe1.jpg', caption: 'Ngoại thất' }],
  depositRequired: '30%',
  rating: 4.8,
  reviewsCount: 12,
  prices: {
    inland: { id: 'G1', price: 2_200_000, unit: 'Chuyen', rentalScope: 'NoiTinh', surchargeNote: null },
    intercity: { id: 'G2', price: 3_500_000, unit: 'Chuyen', rentalScope: 'LienTinh', surchargeNote: 'Phụ thu qua đêm' },
    daily: { id: 'G3', price: 1_800_000, unit: 'Ngay', rentalScope: 'TuLai', surchargeNote: null },
  },
  ...over,
});

const lookup = (over: Record<string, unknown> = {}) => ({
  code: 'YCTX001',
  status: 'DaBaoGia',
  statusLabel: 'Đã báo giá',
  cancelReason: null,
  vehicle: { id: 'LX001', name: 'Limousine 9 chỗ', category: 'Limousine', image: null },
  rentalType: 'CoTaiXe',
  driverName: 'Trần Văn Bình',
  fullName: 'Nguyễn Văn An',
  pickup: 'Quận 1',
  destination: 'Đà Lạt',
  startAt: '2026-07-01T01:00:00.000Z',
  endAt: '2026-07-03T01:00:00.000Z',
  passengers: 8,
  vehicles: 1,
  promoCode: null,
  note: null,
  submittedAt: '2026-06-20T03:00:00.000Z',
  estimate: { unitPrice: 3_500_000, unit: 'Chuyen', units: 1, basePrice: 3_500_000, surcharge: 0, discount: 0, total: 3_500_000 },
  quote: null,
  contract: null,
  steps: [
    { key: 'submitted', label: 'Đã gửi', time: '2026-06-20T03:00:00.000Z', status: 'done' },
    { key: 'quoted', label: 'Báo giá', time: null, status: 'active' },
  ],
  ...over,
});

let built: Services | null = null;

/** Dựng trang thuê xe với API giả; `over` ghi đè phản hồi theo đường dẫn. */
function build(over: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const fail = new Set(Object.keys(over).filter(k => over[k] === 'LOI'));
  const answer = (path: string): unknown => {
    for (const key of Object.keys(over)) if (path.includes(key)) return over[key];
    if (path.includes('vehicles')) return [vehicle()];
    if (path.includes('drivers')) return [{ id: 'TX001', name: 'Trần Văn Bình', licenseClass: 'E', avatar: null }];
    if (path.includes('promotions')) return [];
    if (path.includes('estimate')) return { total: 3_500_000, unit: 'Chuyen' };
    return lookup();
  };
  localStorage.clear();
  // jsdom không cuộn trang được nên phải thay bằng hàm rỗng.
  window.scrollTo = () => {};
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [Services],
    providers: [
      {
        provide: AccountsApiService,
        useValue: {
          request: async (path: string, method = 'GET', body?: unknown) => {
            calls.push({ path, method, body });
            for (const key of fail) if (path.includes(key)) throw new Error('Hệ thống đang bảo trì.');
            return answer(path);
          },
        },
      },
      { provide: ToastService, useValue: { showError: () => {}, showSuccess: () => {} } },
    ],
  });
  const fixture = TestBed.createComponent(Services);
  built = fixture.componentInstance;
  return { page: fixture.componentInstance, fixture, calls };
}

// Biểu mẫu hẹn giờ 400 ms để tính giá tạm; hủy đi để không còn hẹn giờ treo lại.
afterEach(() => { built?.ngOnDestroy(); built = null; });

const fillForm = (page: Services, over: Record<string, unknown> = {}) => {
  Object.assign(page.bookingForm, {
    fullName: 'Nguyễn Văn An',
    phone: '0912345678',
    email: 'an@example.com',
    startAt: '2026-07-01T08:00',
    endAt: '2026-07-03T08:00',
    pickupLocation: 'Văn phòng Quận 1',
    destination: 'Thành phố Đà Lạt',
    passengers: 8,
    vehicles: 1,
  }, over);
};

describe('Customer contract rental page', () => {
  it('shows the cheapest listed price of each vehicle and falls back to a photo when there is none', async () => {
    const { page, fixture } = build({
      vehicles: [
        vehicle(),
        vehicle({ id: 'LX002', name: 'Ghế ngồi 16 chỗ', images: [], prices: { inland: null, intercity: null, daily: null } }),
      ],
    });
    fixture.detectChanges();
    await page.load();
    const [limousine, coach] = page.vehiclesList;
    expect(limousine.minPrice).toBe(1_800_000);
    expect(limousine.priceFormatted).toBe('1.800.000đ');
    expect(limousine.passengers).toBe('Tối đa 9 khách');
    // Không có bảng giá thì hiện "Liên hệ", không có ảnh thì dùng ảnh mặc định.
    expect(coach.priceFormatted).toBe('Liên hệ');
    expect(coach.gallery).toHaveLength(1);
    expect(coach.gallery[0].caption).toBe('Ghế ngồi 16 chỗ');
  });

  it('writes a short label for each promotion and initials for each driver', async () => {
    const { page } = build({
      promotions: [
        { code: 'HE2026', name: 'Hè 2026', description: 'Giảm cho đoàn', type: 'PhanTram', value: 10, maxDiscount: 500_000 },
        { code: 'GIAM200', name: 'Giảm tiền', description: null, type: 'TruTienThang', value: 200_000, maxDiscount: null },
      ],
    });
    await page.load();
    expect(page.promosList[0]).toEqual({ code: 'HE2026', desc: 'Giảm cho đoàn', discountText: 'Giảm 10%' });
    expect(page.promosList[1]).toEqual({ code: 'GIAM200', desc: 'Giảm tiền', discountText: 'Giảm 200K' });
    expect(page.driversList[0].initials).toBe('VB');
  });

  it('reports a load failure instead of leaving the page spinning', async () => {
    const { page } = build({ vehicles: 'LOI' });
    await page.load();
    expect(page.loading).toBe(false);
    expect(page.loadError).toBe('Hệ thống đang bảo trì.');
  });

  it('averages only the vehicles that have been rated', async () => {
    const { page } = build({ vehicles: [vehicle({ rating: 4 }), vehicle({ id: 'LX002', rating: 5 }), vehicle({ id: 'LX003', rating: null })] });
    await page.load();
    expect(page.averageRating).toBe('4.5');
    page.vehiclesList = [];
    expect(page.averageRating).toBe('—');
  });

  it('quotes the daily price for self-drive and the matching trip price for a driver', async () => {
    const { page } = build();
    await page.load();
    page.selectVehicle(page.vehiclesList[0]);
    page.setRentalType('self');
    expect(page.currentPrice?.price).toBe(1_800_000);
    page.setRentalType('driver');
    page.bookingForm.tripScope = 'NoiTinh';
    expect(page.currentPrice?.price).toBe(2_200_000);
    page.bookingForm.tripScope = 'LienTinh';
    expect(page.currentPrice?.price).toBe(3_500_000);
    page.activeVehicle = null;
    expect(page.currentPrice).toBeNull();
  });

  it('opens a vehicle on the overview tab and never keeps more guests than its seats', async () => {
    const { page } = build();
    await page.load();
    page.bookingForm.passengers = 40;
    page.selectVehicle(page.vehiclesList[0]);
    expect(page.viewState).toBe('detail');
    expect(page.activeDetailTab).toBe('overview');
    expect(page.bookingForm.passengers).toBe(9);
    page.backToList();
    expect(page.viewState).toBe('list');
    expect(page.activeVehicle).toBeNull();
  });

  it('turns a promotion and a driver on and off again when tapped twice', async () => {
    const { page } = build();
    await page.load();
    page.selectVehicle(page.vehiclesList[0]);
    page.applyPromoCode('HE2026');
    expect(page.bookingForm.appliedPromo).toBe('HE2026');
    page.applyPromoCode('HE2026');
    expect(page.bookingForm.appliedPromo).toBe('');
    page.chooseDriver('TX001');
    expect(page.bookingForm).toMatchObject({ rentalType: 'driver', selectedDriverId: 'TX001' });
    page.chooseDriver('TX001');
    expect(page.bookingForm.selectedDriverId).toBe('');
    // Chuyển sang tự lái thì bỏ tài xế đã chọn.
    page.chooseDriver('TX001');
    page.setRentalType('self');
    expect(page.bookingForm.selectedDriverId).toBe('');
  });

  it('refuses to send a request that is missing or contradicts itself', async () => {
    const { page, calls } = build();
    await page.load();
    page.selectVehicle(page.vehiclesList[0]);
    const check = async (over: Record<string, unknown>, expected: string) => {
      fillForm(page, over);
      await page.submitBookingForm();
      expect(page.submitError, JSON.stringify(over)).toContain(expected);
    };
    await check({ fullName: 'A' }, 'họ tên');
    await check({ phone: '0112345678' }, '10 chữ số');
    await check({ startAt: '' }, 'thời gian đi');
    await check({ rentalType: 'self', endAt: '' }, 'thời gian trả xe');
    await check({ endAt: '2026-06-30T08:00' }, 'phải sau thời gian đi');
    await check({ pickupLocation: 'Q1' }, 'điểm đón');
    await check({ destination: 'ĐL' }, 'điểm đến');
    await check({ passengers: 10 }, 'Số khách phải từ 1 đến 9');
    expect(calls.filter(c => c.method === 'POST' && c.path.endsWith('requests'))).toHaveLength(0);
  });

  it('counts the seats of every vehicle ordered when checking the number of guests', async () => {
    const { page } = build();
    await page.load();
    page.selectVehicle(page.vehiclesList[0]);
    fillForm(page, { vehicles: 2, passengers: 18 });
    await page.submitBookingForm();
    expect(page.submitError).toBe('');
    expect(page.viewState).toBe('order');
  });

  it('sends a self-drive request without a trip scope and with the promotion in capitals', async () => {
    const { page, calls } = build();
    await page.load();
    page.selectVehicle(page.vehiclesList[0]);
    page.setRentalType('self');
    fillForm(page, { rentalType: 'self', appliedPromo: ' he2026 ', note: '  ' });
    await page.submitBookingForm();
    const sent = calls.find(c => c.method === 'POST' && c.path.endsWith('requests'))!.body as Record<string, unknown>;
    expect(sent).toMatchObject({ vehicleTypeId: 'LX001', rentalType: 'TuLai', promoCode: 'HE2026', passengers: 8 });
    expect(sent['tripScope']).toBeUndefined();
    // Ghi chú chỉ có dấu cách thì không gửi lên.
    expect(sent['note']).toBeUndefined();
    expect(page.currentOrder?.code).toBe('YCTX001');
  });

  it('keeps the customer on the form and explains why when the server turns the request down', async () => {
    const { page } = build({ requests: 'LOI' });
    await page.load();
    page.selectVehicle(page.vehiclesList[0]);
    fillForm(page);
    await page.submitBookingForm();
    expect(page.submitError).toBe('Hệ thống đang bảo trì.');
    expect(page.viewState).toBe('detail');
    expect(page.submitting).toBe(false);
  });

  it('asks for both the request code and the phone used to send it', async () => {
    const { page, calls } = build();
    page.lookupForm = { code: '', phone: '0912345678' };
    await page.lookupRequest();
    expect(page.lookupError).toContain('YCTX001');
    page.lookupForm = { code: 'YCTX001', phone: '012' };
    await page.lookupRequest();
    expect(page.lookupError).toContain('YCTX001');
    expect(calls).toHaveLength(0);
  });

  it('remembers the looked-up request so the customer need not retype it', async () => {
    const { page } = build();
    page.lookupForm = { code: ' yctx001 ', phone: '0912345678' };
    await page.lookupRequest();
    expect(page.viewState).toBe('order');
    expect(page.currentOrder?.statusLabel).toBe('Đã báo giá');
    expect(JSON.parse(localStorage.getItem('viago_rental_lookup')!))
      .toEqual({ code: 'YCTX001', phone: '0912345678' });
  });

  it('says so when no request matches what was typed', async () => {
    const { page } = build({ 'contract-rentals/requests/': 'LOI' });
    page.lookupForm = { code: 'YCTX999', phone: '0912345678' };
    await page.lookupRequest();
    expect(page.lookupError).toBe('Hệ thống đang bảo trì.');
    expect(page.lookupLoading).toBe(false);
  });

  it('sends the reason along when the customer turns a quote down', async () => {
    const { page, calls } = build();
    page.lookupForm = { code: 'YCTX001', phone: '0912345678' };
    await page.lookupRequest();
    window.prompt = () => '  Giá cao hơn dự kiến  ';
    await page.decideQuote('reject');
    const decision = calls.find(c => c.path.includes('quote-decision'))!.body as Record<string, unknown>;
    expect(decision).toEqual({ phone: '0912345678', decision: 'reject', reason: 'Giá cao hơn dự kiến' });
    expect(page.deciding).toBe(false);
  });

  it('accepts a quote without asking anything further', async () => {
    const { page, calls } = build();
    page.lookupForm = { code: 'YCTX001', phone: '0912345678' };
    await page.lookupRequest();
    window.prompt = () => { throw new Error('Đồng ý báo giá thì không được hỏi lý do'); };
    await page.decideQuote('accept');
    const decision = calls.find(c => c.path.includes('quote-decision'))!.body as Record<string, unknown>;
    expect(decision).toEqual({ phone: '0912345678', decision: 'accept' });
  });

  it('describes every step of the request so the customer knows what happens next', () => {
    const { page } = build();
    expect(page.stepDesc({ key: 'submitted', label: '', time: null, status: 'done' })).toContain('tiếp nhận');
    expect(page.stepDesc({ key: 'quoted', label: '', time: null, status: 'active' })).toContain('báo giá');
    expect(page.stepDesc({ key: 'contract', label: '', time: null, status: 'pending' })).toContain('hợp đồng');
    expect(page.stepDesc({ key: 'confirmed', label: '', time: null, status: 'pending' })).toContain('tiền cọc');
  });

  it('writes prices, units and times the way Vietnamese customers read them', () => {
    const { page } = build();
    expect(page.formatMoney(3_500_000)).toBe('3.500.000đ');
    expect(page.formatMoney(null)).toBe('0đ');
    expect(page.unitLabel('Chuyen')).toBe('chuyến');
    expect(page.unitLabel('Ngay')).toBe('ngày');
    expect(page.unitLabel('Gio')).toBe('giờ');
    expect(page.unitLabel(null)).toBe('');
    expect(page.formatDateTime('2026-07-01T01:00:00.000Z')).toBe('08:00 01/07/2026');
    expect(page.formatDateTime(null)).toBe('');
  });

  it('starts the trip tomorrow morning and never lets it be booked within twelve hours', () => {
    const { page, fixture } = build();
    fixture.detectChanges();
    const start = page.bookingForm.startAt;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
    expect(start).toBe(`${expected}T08:00`);
    // Thời gian đi sớm nhất cho phép là 12 giờ kể từ bây giờ.
    expect(new Date(page.minStart).getTime() - Date.now()).toBeGreaterThan(11.9 * 3600 * 1000);
    expect(new Date(page.bookingForm.endAt).getTime()).toBeGreaterThan(new Date(start).getTime());
  });

  it('reuses a saved lookup when the page is opened again', () => {
    localStorage.setItem('viago_rental_lookup', JSON.stringify({ code: 'YCTX009', phone: '0987654321' }));
    TestBed.resetTestingModule();
    window.scrollTo = () => {};
    TestBed.configureTestingModule({
      imports: [Services],
      providers: [
        { provide: AccountsApiService, useValue: { request: async () => [] } },
        { provide: ToastService, useValue: { showError: () => {}, showSuccess: () => {} } },
      ],
    });
    const fixture = TestBed.createComponent(Services);
    built = fixture.componentInstance;
    fixture.detectChanges();
    expect(fixture.componentInstance.lookupForm).toEqual({ code: 'YCTX009', phone: '0987654321' });
    localStorage.clear();
  });

  it('shows the chosen photo of the gallery and leaves it alone when no vehicle is open', async () => {
    const { page } = build({ vehicles: [vehicle({ images: [{ url: 'a.jpg', caption: 'Ngoài' }, { url: 'b.jpg', caption: 'Trong' }] })] });
    await page.load();
    page.selectVehicle(page.vehiclesList[0]);
    page.selectDetailImage(1);
    expect((page.activeVehicle as VehicleDetail).selectedImageIndex).toBe(1);
    page.activeVehicle = null;
    expect(() => page.selectDetailImage(0)).not.toThrow();
  });

  it('clears the open request when the customer goes back to browse other vehicles', async () => {
    const { page } = build();
    page.lookupForm = { code: 'YCTX001', phone: '0912345678' };
    await page.lookupRequest();
    page.viewAnotherVehicle();
    expect(page.currentOrder).toBeNull();
    expect(page.viewState).toBe('list');
    await page.lookupRequest();
    page.goToHome();
    expect(page.currentOrder).toBeNull();
    expect(page.activeVehicle).toBeNull();
  });
});
