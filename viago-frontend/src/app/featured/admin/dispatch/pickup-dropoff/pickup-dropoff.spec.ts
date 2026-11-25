import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { PickupDropoffComponent, DiemDonTra } from './pickup-dropoff';

const point = (over: Partial<DiemDonTra> = {}): DiemDonTra => ({
  id: 1,
  name: 'Văn phòng Quận 1',
  address: '10 Nguyễn Huệ',
  city: 'TP.HCM',
  type: 'don-tra',
  status: 'active',
  ...over,
});

function build(points: DiemDonTra[]) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [PickupDropoffComponent],
    providers: [
      { provide: HttpClient, useValue: { get: () => of([]), post: () => of(point()), patch: () => of(point()) } },
    ],
  });
  const page = TestBed.createComponent(PickupDropoffComponent).componentInstance;
  page.allPoints = points;
  page.filterPoints();
  return page;
}

describe('Admin pickup and drop-off points screen', () => {
  const points = [
    point({ id: 1, name: 'Văn phòng Quận 1', city: 'TP.HCM', type: 'don-tra' }),
    point({ id: 2, name: 'Văn phòng Ninh Kiều', address: '5 Hòa Bình', city: 'Cần Thơ', type: 'don-tra' }),
    point({ id: 3, name: 'Trạm dừng Cai Lậy', address: 'QL1A', city: 'Tiền Giang', type: 'dung' }),
    point({ id: 4, name: 'Điểm cũ Bến Thành', city: 'TP.HCM', type: 'don-tra', status: 'locked' }),
  ];

  it('counts only active points per type and keeps locked ones in their own total', () => {
    const page = build(points);
    expect(page.getCountByType('don-tra')).toBe(2);
    expect(page.getCountByType('dung')).toBe(1);
    expect(page.getLockedCount()).toBe(1);
  });

  it('separates pickup points, rest stops and locked points into their own tabs', () => {
    const page = build(points);
    expect(page.filteredPoints.map(p => p.id)).toEqual([1, 2]);
    page.setTab('dung');
    expect(page.filteredPoints.map(p => p.id)).toEqual([3]);
    page.setTab('locked');
    expect(page.filteredPoints.map(p => p.id)).toEqual([4]);
  });

  it('remembers the search text of each tab separately', () => {
    const page = build(points);
    page.searchQueries['don-tra'] = 'ninh kiều';
    page.applyFilter();
    expect(page.filteredPoints.map(p => p.id)).toEqual([2]);
    // Chuyển tab không được kéo theo từ khóa của tab trước.
    page.setTab('dung');
    expect(page.filteredPoints.map(p => p.id)).toEqual([3]);
    page.setTab('don-tra');
    expect(page.filteredPoints.map(p => p.id)).toEqual([2]);
  });

  it('searches the address as well as the point name', () => {
    const page = build(points);
    page.searchQueries['don-tra'] = 'nguyễn huệ';
    page.applyFilter();
    expect(page.filteredPoints.map(p => p.id)).toEqual([1]);
  });

  it('narrows by city on top of the tab', () => {
    const page = build(points);
    page.cityFilters['don-tra'] = 'Cần Thơ';
    page.applyFilter();
    expect(page.filteredPoints.map(p => p.id)).toEqual([2]);
  });

  it('clears the filters of the current tab and returns to the first page', () => {
    const page = build(points);
    page.searchQueries['don-tra'] = 'ninh kiều';
    page.cityFilters['don-tra'] = 'Cần Thơ';
    page.applyFilter();
    page.clearFilter();
    expect(page.filteredPoints.map(p => p.id)).toEqual([1, 2]);
    expect(page.currentPage).toBe(1);
  });
});
