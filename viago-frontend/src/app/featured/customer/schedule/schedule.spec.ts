import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HomeApiService } from '../home/home-api.service';
import { Schedule } from './schedule';

interface Nav { commands: unknown[]; extras: unknown }

const apiRoute = (over: Record<string, unknown> = {}) => ({
  id: 'TUYEN01',
  from: 'TP.HCM',
  to: 'Cần Thơ',
  distance: 170,
  durationMinutes: 240,
  price: 180000,
  image: null,
  vehicleTypes: ['Giường nằm 34 chỗ'],
  ...over,
});

const trip = (over: Record<string, unknown> = {}) => ({
  departureAt: '2026-06-18T00:30:00.000Z',
  typeCode: 'GN34',
  type: 'Giường nằm',
  price: 180000,
  amenities: ['Wifi', 'Nước suối'],
  pickup: [{ name: 'Văn phòng Quận 1' }],
  dropoff: [{ name: 'Văn phòng Ninh Kiều' }],
  ...over,
});

/**
 * Dựng trang lịch trình. `pages` là các trang tuyến API trả lần lượt,
 * `trips` là phản hồi của /trips, `fail` là phần đường dẫn trả lỗi.
 */
function build(pages: Record<string, unknown>[][] = [[apiRoute()]], trips?: unknown, fail = '') {
  const paths: string[] = [];
  const navigations: Nav[] = [];
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [Schedule],
    providers: [
      {
        provide: HomeApiService,
        useValue: {
          request: async (path: string) => {
            paths.push(path);
            if (fail && path.includes(fail)) throw new Error('Không gọi được dịch vụ tuyến xe.');
            if (path.startsWith('/trips')) {
              return trips ?? { outbound: { data: [trip()] }, inbound: { data: [trip({ departureAt: '2026-06-18T07:00:00.000Z' })] } };
            }
            const page = Number(new URL(`http://x${path}`).searchParams.get('page') ?? 1);
            return { data: pages[page - 1] ?? [], pagination: { totalPages: pages.length } };
          },
        },
      },
      {
        provide: Router,
        useValue: {
          navigate: (commands: unknown[], extras: unknown) => {
            navigations.push({ commands, extras });
            return Promise.resolve(true);
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(Schedule);
  return { page: fixture.componentInstance, paths, navigations };
}

describe('Customer route schedule page', () => {
  it('reads every page of routes and shows three of them as highlights', async () => {
    const { page, paths } = build([
      [apiRoute({ id: 'T1' }), apiRoute({ id: 'T2' }), apiRoute({ id: 'T3' })],
      [apiRoute({ id: 'T4' })],
    ]);
    await page.ngOnInit();
    expect(page.allRoutes.map(r => r.id)).toEqual(['T1', 'T2', 'T3', 'T4']);
    expect(page.filteredRoutes).toHaveLength(4);
    expect(page.featuredRoutes.map(r => r.id)).toEqual(['T1', 'T2', 'T3']);
    expect(paths.filter(p => p.startsWith('/routes'))).toHaveLength(2);
  });

  it('writes the distance and the journey time with their units', async () => {
    const { page } = build([[apiRoute({ distance: 170, durationMinutes: 240 })]]);
    await page.ngOnInit();
    expect(page.allRoutes[0].distance).toBe('170 km');
    expect(page.allRoutes[0].duration).toBe('240 phút');
    expect(page.allRoutes[0].vehicleTypes).toEqual(['Giường nằm 34 chỗ']);
  });

  it('picks a photo of the destination when the route has none of its own', async () => {
    const { page } = build([[
      apiRoute({ id: 'T1', image: 'https://viago.vn/anh.jpg' }),
      apiRoute({ id: 'T2', image: 'da_lat.jpg' }),
      apiRoute({ id: 'T3', image: null, to: 'Đà Lạt' }),
      apiRoute({ id: 'T4', image: '', to: 'Nha Trang' }),
      apiRoute({ id: 'T5', image: null, to: 'Vũng Tàu' }),
      apiRoute({ id: 'T6', image: null, to: 'Buôn Ma Thuột' }),
    ]]);
    await page.ngOnInit();
    const image = (id: string) => page.allRoutes.find(r => r.id === id)!.image;
    expect(image('T1')).toBe('https://viago.vn/anh.jpg');
    expect(image('T2')).toBe('/assets/customer/da_lat.jpg');
    expect(image('T3')).toBe('/assets/customer/da_lat.jpg');
    expect(image('T4')).toBe('/assets/customer/nha_trang.jpg');
    expect(image('T5')).toBe('/assets/customer/vung_tau.jpg');
    // Điểm đến không có ảnh riêng thì dùng ảnh chung.
    expect(image('T6')).toBe('/assets/customer/night_bus_highway.png');
  });

  it('says why the list is empty when the routes cannot be loaded', async () => {
    const { page } = build([[apiRoute()]], undefined, '/routes');
    await page.ngOnInit();
    expect(page.error).toBe('Không gọi được dịch vụ tuyến xe.');
    expect(page.allRoutes).toEqual([]);
  });

  it('searches either end of the route and ignores accents, capitals and dots', async () => {
    const { page } = build([[
      apiRoute({ id: 'CT', from: 'TP.HCM', to: 'Cần Thơ' }),
      apiRoute({ id: 'DL', from: 'TP.HCM', to: 'Đà Lạt' }),
      apiRoute({ id: 'NT', from: 'Nha Trang', to: 'Đà Nẵng' }),
    ]]);
    await page.ngOnInit();
    const search = (term: string) => { page.searchTerm = term; page.onSearch(); return page.filteredRoutes.map(r => r.id); };
    expect(search('can tho')).toEqual(['CT']);
    expect(search('CẦN THƠ')).toEqual(['CT']);
    expect(search('nha trang')).toEqual(['NT']);
    // Chữ "đ" phải được coi như "d", không được xóa khỏi từ khóa.
    expect(search('Đà Lạt')).toEqual(['DL']);
    expect(search('da nang')).toEqual(['NT']);
    expect(search('  ')).toEqual(['CT', 'DL', 'NT']);
    expect(search('Hà Nội')).toEqual([]);
  });

  it('understands the names people actually use for Saigon and Lam Dong', async () => {
    const { page } = build([[
      apiRoute({ id: 'CT', from: 'TP.HCM', to: 'Cần Thơ' }),
      apiRoute({ id: 'DL', from: 'TP.HCM', to: 'Đà Lạt' }),
      apiRoute({ id: 'NT', from: 'Nha Trang', to: 'Đà Nẵng' }),
    ]]);
    await page.ngOnInit();
    const search = (term: string) => { page.searchTerm = term; page.onSearch(); return page.filteredRoutes.map(r => r.id); };
    expect(search('Sài Gòn')).toEqual(['CT', 'DL']);
    expect(search('sgon')).toEqual(['CT', 'DL']);
    expect(search('sg')).toEqual(['CT', 'DL']);
    expect(search('thành phố')).toEqual(['CT', 'DL']);
    expect(search('Lâm Đồng')).toEqual(['DL']);
  });

  it('lists both directions of the chosen route with their times and stops', async () => {
    const { page, paths } = build();
    await page.ngOnInit();
    await page.viewSchedule(page.allRoutes[0]);
    expect(page.selectedRouteForDetails?.id).toBe('TUYEN01');
    expect(page.selectedDirection).toBe('forward');
    expect(page.mockTrips).toEqual([{ time: '07:30', type: 'GN34', price: 180000, amenities: 'Wifi, Nước suối' }]);
    expect(page.mockStops.forward).toEqual({ pickups: ['Văn phòng Quận 1'], dropoffs: ['Văn phòng Ninh Kiều'] });
    page.selectedDirection = 'backward';
    expect(page.mockTrips[0].time).toBe('14:00');
    const query = paths.find(p => p.startsWith('/trips'))!;
    expect(query).toContain(`from=${encodeURIComponent('TP.HCM')}`);
    expect(query).toContain('roundTrip=true');
    expect(query).toContain(`date=${new Date().toISOString().slice(0, 4)}`);
  });

  it('shows no return trips when the route only runs one way', async () => {
    const { page } = build([[apiRoute()]], { outbound: { data: [trip()] }, inbound: null });
    await page.ngOnInit();
    await page.viewSchedule(page.allRoutes[0]);
    page.selectedDirection = 'backward';
    expect(page.mockTrips).toEqual([]);
    expect(page.mockStops.backward).toEqual({ pickups: [], dropoffs: [] });
  });

  it('falls back to the plain coach name when the code is missing', async () => {
    const { page } = build([[apiRoute()]], { outbound: { data: [trip({ typeCode: null })] }, inbound: { data: [] } });
    await page.ngOnInit();
    await page.viewSchedule(page.allRoutes[0]);
    expect(page.mockTrips[0].type).toBe('Giường nằm');
  });

  it('says so when the trips of a route cannot be loaded, and closes the panel on demand', async () => {
    const { page } = build([[apiRoute()]], undefined, '/trips');
    await page.ngOnInit();
    await page.viewSchedule(page.allRoutes[0]);
    expect(page.error).toBe('Không gọi được dịch vụ tuyến xe.');
    expect(page.mockTrips).toEqual([]);
    page.closeSchedule();
    expect(page.selectedRouteForDetails).toBeNull();
  });

  it('sends the customer to the search page with the route and today filled in', async () => {
    const { page, navigations } = build();
    await page.ngOnInit();
    page.handleViewSchedule(page.allRoutes[0]);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    expect(navigations[0].commands).toEqual(['/']);
    expect(navigations[0].extras).toEqual({
      queryParams: {
        from: 'TP.HCM',
        to: 'Cần Thơ',
        date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
        autoSearch: 'true',
      },
    });
  });

  it('books the direction the customer is looking at, there or back', async () => {
    const { page, navigations } = build();
    await page.ngOnInit();
    page.bookSelectedRoute();
    expect(navigations).toHaveLength(0);
    await page.viewSchedule(page.allRoutes[0]);
    page.bookSelectedRoute();
    expect((navigations[0].extras as { queryParams: Record<string, string> }).queryParams)
      .toMatchObject({ from: 'TP.HCM', to: 'Cần Thơ' });
    page.selectedDirection = 'backward';
    page.bookSelectedRoute();
    expect((navigations[1].extras as { queryParams: Record<string, string> }).queryParams)
      .toMatchObject({ from: 'Cần Thơ', to: 'TP.HCM' });
  });

  it('writes the fare in dong the way Vietnamese customers read it', () => {
    const { page } = build();
    expect(page.formatPrice(180000).replace(/ /g, ' ')).toBe('180.000 ₫');
  });
});
