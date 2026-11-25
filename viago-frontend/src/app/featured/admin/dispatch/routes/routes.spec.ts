import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { ToastService } from '../../../../core/services/toast.service';
import { RoutesComponent, TuyenXe } from './routes';

const route = (over: Partial<TuyenXe> = {}): TuyenXe => ({
  id: 1,
  name: 'TP.HCM - Cần Thơ',
  startPoint: 'TP.HCM',
  endPoint: 'Cần Thơ',
  distanceNum: 170,
  duration: '3.5 giờ',
  tripsPerDay: 3,
  price: 180000,
  carTypesList: ['Giường nằm'],
  carTypes: 'Giường nằm',
  status: 'active',
  ...over,
} as TuyenXe);

function build(routes: TuyenXe[]) {
  const errors: string[] = [];
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [RoutesComponent],
    providers: [
      { provide: HttpClient, useValue: { get: () => of([]), post: () => of(route()), patch: () => of(route()) } },
      {
        provide: ToastService,
        useValue: { showError: (m: string) => errors.push(m), showSuccess: () => {} },
      },
    ],
  });
  const page = TestBed.createComponent(RoutesComponent).componentInstance;
  page.allRoutes = routes;
  page.filterRoutes();
  return { page, errors };
}

describe('Admin routes screen', () => {
  const routes = [
    route({ id: 1, name: 'TP.HCM - Cần Thơ', endPoint: 'Cần Thơ' }),
    route({ id: 2, name: 'TP.HCM - Đà Lạt', endPoint: 'Đà Lạt', carTypes: 'Limousine',
      carTypesList: ['Limousine'] }),
    route({ id: 3, name: 'Hà Nội - Hải Phòng', startPoint: 'Hà Nội', endPoint: 'Hải Phòng',
      status: 'locked' }),
  ];

  it('counts active and locked routes separately', () => {
    const { page } = build(routes);
    expect(page.getActiveRoutesCount()).toBe(2);
    expect(page.getLockedRoutesCount()).toBe(1);
  });

  it('splits active and locked routes into their own tabs', () => {
    const { page } = build(routes);
    page.setTab('active');
    expect(page.filteredRoutes.map(r => r.id)).toEqual([1, 2]);
    page.setTab('locked');
    expect(page.filteredRoutes.map(r => r.id)).toEqual([3]);
    page.setTab('all');
    expect(page.filteredRoutes).toHaveLength(3);
  });

  it('searches without accents across route name, endpoints and vehicle type', () => {
    const { page } = build(routes);
    page.searchQuery = 'da lat';
    page.filterRoutes();
    expect(page.filteredRoutes.map(r => r.id)).toEqual([2]);
    page.searchQuery = 'limousine';
    page.filterRoutes();
    expect(page.filteredRoutes.map(r => r.id)).toEqual([2]);
    page.searchQuery = 'ha noi';
    page.filterRoutes();
    expect(page.filteredRoutes.map(r => r.id)).toEqual([3]);
  });

  it('combines the start and end point filters', () => {
    const { page } = build(routes);
    page.startPointFilter = 'TP.HCM';
    page.endPointFilter = 'Hải Phòng';
    page.filterRoutes();
    expect(page.filteredRoutes).toHaveLength(0);
    page.endPointFilter = 'Đà Lạt';
    page.filterRoutes();
    expect(page.filteredRoutes.map(r => r.id)).toEqual([2]);
  });

  it('refuses a route whose start and end points are the same', () => {
    const { page, errors } = build(routes);
    page.openAddModal();
    page.currentRoute.startPoint = 'TP.HCM';
    page.currentRoute.endPoint = 'TP.HCM';
    void page.saveRoute();
    expect(errors.some(m => m.includes('không được giống nhau'))).toBe(true);
    expect(page.errors['samePoints']).toBe(true);
  });

  it('keeps only digits in the price field and formats it for display', () => {
    const { page } = build(routes);
    page.onPriceChange('1a8b0.000 đ');
    expect(page.currentRoute.price).toBe(180000);
    expect(page.formattedPrice).toBe('180.000');
    page.onPriceChange('abc');
    expect(page.currentRoute.price).toBe(0);
    expect(page.formattedPrice).toBe('');
  });

  it('clears every filter and returns to the first page', () => {
    const { page } = build(routes);
    page.searchQuery = 'da lat';
    page.startPointFilter = 'TP.HCM';
    page.filterRoutes();
    page.clearFilters();
    expect(page.filteredRoutes).toHaveLength(3);
    expect(page.currentPage).toBe(1);
  });
});
