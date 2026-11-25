import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { ToastService } from '../../../../core/services/toast.service';
import { VehiclesComponent, Vehicle } from './vehicles';

const vehicle = (over: Partial<Vehicle> = {}): Vehicle => ({
  id: 1,
  name: 'Giường nằm 34 chỗ',
  licensePlate: '51B-890.12',
  type: 'Giường nằm',
  seats: 34,
  registrationExpiry: '2027-05-01',
  amenities: ['Wifi'],
  status: 'Đang hoạt động',
  ...over,
});

function build(vehicles: Vehicle[]) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [VehiclesComponent],
    providers: [
      { provide: HttpClient, useValue: { get: () => of([]), post: () => of(vehicle()), patch: () => of(vehicle()) } },
      { provide: ToastService, useValue: { showError: () => {}, showSuccess: () => {} } },
    ],
  });
  const page = TestBed.createComponent(VehiclesComponent).componentInstance;
  page.allVehicles = vehicles;
  page.filterVehicles();
  return page;
}

describe('Admin vehicles screen', () => {
  const fleet = [
    vehicle({ id: 1, licensePlate: '51B-890.12', status: 'Đang hoạt động' }),
    vehicle({ id: 2, name: 'Limousine 22 phòng', licensePlate: '51B-234.56',
      type: 'Limousine', seats: 22, status: 'Bảo trì' }),
    vehicle({ id: 3, licensePlate: '29A-111.22', status: 'Đã khóa' }),
  ];

  it('counts the fleet by status independently of the active filters', () => {
    const page = build(fleet);
    page.setTab('Bảo trì');
    expect(page.filteredVehicles.map(v => v.id)).toEqual([2]);
    // Thẻ tổng quan phải giữ nguyên số liệu toàn đội xe, không chạy theo bộ lọc.
    expect(page.getTotalCount()).toBe(3);
    expect(page.getCountByStatus('Đang hoạt động')).toBe(1);
    expect(page.getCountByStatus('Bảo trì')).toBe(1);
    expect(page.getCountByStatus('Đã khóa')).toBe(1);
  });

  it('searches by vehicle name or licence plate without matching case', () => {
    const page = build(fleet);
    page.searchQuery = '51b-234';
    page.filterVehicles();
    expect(page.filteredVehicles.map(v => v.id)).toEqual([2]);
    page.searchQuery = 'GIƯỜNG NẰM';
    page.filterVehicles();
    expect(page.filteredVehicles.map(v => v.id)).toEqual([1, 3]);
  });

  it('combines the type and status filters instead of replacing one another', () => {
    const page = build(fleet);
    page.selectedType = 'Limousine';
    page.selectedStatus = 'Đang hoạt động';
    page.filterVehicles();
    expect(page.filteredVehicles).toHaveLength(0);
    page.selectedStatus = 'Bảo trì';
    page.filterVehicles();
    expect(page.filteredVehicles.map(v => v.id)).toEqual([2]);
  });

  it('returns to the first page and clears every filter at once', () => {
    const page = build(fleet);
    page.searchQuery = '51b';
    page.selectedType = 'Limousine';
    page.selectedStatus = 'Bảo trì';
    page.filterVehicles();
    page.clearFilters();
    expect(page.filteredVehicles).toHaveLength(3);
    expect(page.currentPage).toBe(1);
  });
});
