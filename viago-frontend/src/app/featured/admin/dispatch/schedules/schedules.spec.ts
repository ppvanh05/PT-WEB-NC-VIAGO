import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { ToastService } from '../../../../core/services/toast.service';
import { SchedulesComponent, LichTrinh } from './schedules';

const trip = (over: Partial<LichTrinh> = {}): LichTrinh => ({
  id: 1,
  routeName: 'TP.HCM - Cần Thơ',
  startPoint: 'TP.HCM',
  endPoint: 'Cần Thơ',
  licensePlate: '51B-890.12',
  carName: 'Giường nằm 34 chỗ',
  driverName: 'Nguyễn Văn Hùng',
  codriverName: 'Trần Minh Đức',
  departureDate: '2026-12-20',
  departureTime: '08:00',
  duration: '3.5',
  status: 'waiting',
  seatsCount: 34,
  price: 180000,
  ...over,
});

function build(trips: LichTrinh[] = []) {
  const errors: string[] = [];
  const calls: string[] = [];
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SchedulesComponent],
    providers: [
      {
        provide: HttpClient,
        useValue: {
          get: (url: string) => {
            calls.push('GET ' + url);
            return of([]);
          },
          post: (url: string) => {
            calls.push('POST ' + url);
            return of(trip());
          },
          patch: (url: string) => {
            calls.push('PATCH ' + url);
            return of(trip());
          },
        },
      },
      {
        provide: ToastService,
        useValue: {
          showError: (message: string) => errors.push(message),
          showSuccess: () => {},
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(SchedulesComponent);
  const page = fixture.componentInstance;
  page.allTrips = trips;
  page.filterTrips();
  return { fixture, page, errors, calls };
}

describe('Admin schedules screen', () => {
  it('searches without accents so "can tho" still matches "Cần Thơ"', () => {
    const { page } = build([
      trip({ id: 1, routeName: 'TP.HCM - Cần Thơ' }),
      trip({ id: 2, routeName: 'TP.HCM - Đà Lạt', endPoint: 'Đà Lạt' }),
    ]);
    page.searchQuery = 'can tho';
    page.filterTrips();
    expect(page.baseFilteredTrips.map(t => t.id)).toEqual([1]);
    page.searchQuery = 'da lat';
    page.filterTrips();
    expect(page.baseFilteredTrips.map(t => t.id)).toEqual([2]);
  });

  it('flags a driver already assigned to another trip within four hours of the same day', () => {
    const { page } = build([trip({ id: 2, departureTime: '10:00' })]);
    page.currentTrip = { id: 1, departureDate: '2026-12-20', departureTime: '08:00' };
    expect(page.isDriverBusy('Nguyễn Văn Hùng')).toBe(true);
  });

  it('leaves a driver free when the other trip is far enough away, on another day, or already closed', () => {
    const base = { id: 1, departureDate: '2026-12-20', departureTime: '08:00' };
    const far = build([trip({ id: 2, departureTime: '14:00' })]);
    far.page.currentTrip = { ...base };
    expect(far.page.isDriverBusy('Nguyễn Văn Hùng')).toBe(false);

    const otherDay = build([trip({ id: 2, departureDate: '2026-12-21', departureTime: '08:00' })]);
    otherDay.page.currentTrip = { ...base };
    expect(otherDay.page.isDriverBusy('Nguyễn Văn Hùng')).toBe(false);

    for (const status of ['locked', 'completed'] as const) {
      const closed = build([]);
      // Gán sau khi dựng: filterTrips() tự tính lại trạng thái theo ngày khởi hành.
      closed.page.allTrips = [trip({ id: 2, departureTime: '09:00', status })];
      closed.page.currentTrip = { ...base };
      expect(closed.page.isDriverBusy('Nguyễn Văn Hùng'), status).toBe(false);
    }
  });

  it('does not treat the trip being edited as a conflict with itself', () => {
    const { page } = build([trip({ id: 7, departureTime: '08:00' })]);
    page.currentTrip = { id: 7, departureDate: '2026-12-20', departureTime: '08:00' };
    expect(page.isDriverBusy('Nguyễn Văn Hùng')).toBe(false);
  });

  it('applies the same clash rule to the assistant driver', () => {
    const { page } = build([trip({ id: 2, departureTime: '09:30' })]);
    page.currentTrip = { id: 1, departureDate: '2026-12-20', departureTime: '08:00' };
    expect(page.isCodriverBusy('Trần Minh Đức')).toBe(true);
    expect(page.isCodriverBusy('Người khác')).toBe(false);
  });

  it('refuses to save a departure closer than one week and never calls the API', async () => {
    const { page, errors, calls } = build([]);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    page.currentTrip = {
      ...trip({ departureDate: tomorrow }),
      id: undefined as unknown as number,
    };
    page.isEditMode = false;
    await page.saveTrip();
    expect(errors.some(m => m.includes('ít nhất 1 tuần'))).toBe(true);
    expect(calls.filter(c => c.startsWith('POST'))).toHaveLength(0);
  });

  it('refuses to save when the chosen driver clashes and never calls the API', async () => {
    const far = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const { page, errors, calls } = build([
      trip({ id: 2, departureDate: far, departureTime: '09:00' }),
    ]);
    page.currentTrip = { ...trip({ departureDate: far, departureTime: '08:00' }), id: 1 };
    page.isEditMode = false;
    await page.saveTrip();
    expect(errors.some(m => m.includes('trùng lịch'))).toBe(true);
    expect(calls.filter(c => c.startsWith('POST'))).toHaveLength(0);
  });

  it('offers the earliest selectable departure one week ahead', () => {
    const { page } = build([]);
    const expected = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    expect(page.getMinAllowedDate()).toBe(expected);
  });

  it('reads trip progress from the status rather than guessing', () => {
    const { page } = build([]);
    expect(page.getTripProgress(trip({ status: 'completed' }))).toBe(100);
    expect(page.getTripProgress(trip({ status: 'waiting' }))).toBe(0);
    expect(page.getTripProgress(trip({ status: 'locked' }))).toBe(0);
  });

  it('keeps locked trips out of forecast revenue and names the busiest route', () => {
    const { page } = build([
      trip({ id: 1, routeName: 'TP.HCM - Cần Thơ', price: 100000, seatsCount: 2 }),
      trip({ id: 2, routeName: 'TP.HCM - Cần Thơ', price: 100000, seatsCount: 3 }),
      trip({ id: 3, routeName: 'TP.HCM - Vũng Tàu', price: 500000, seatsCount: 10, status: 'locked' }),
    ]);
    expect(page.getForecastedRevenue()).toBe(500000);
    // Nhãn kèm số chuyến để người đọc biết con số dựa trên bao nhiêu chuyến.
    expect(page.getMostBookedRoute()).toBe('TP.HCM - Cần Thơ (2 chuyến)');
  });

  it('reports no busiest route when nothing matches the filters', () => {
    const { page } = build([]);
    expect(page.getMostBookedRoute()).toBe('Không có');
  });
});
