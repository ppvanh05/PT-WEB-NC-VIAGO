import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { DriversAssistants, Personnel } from './drivers-assistants';

const person = (over: Partial<Personnel> = {}): Personnel => ({
  id: 1,
  name: 'Nguyễn Văn Hùng',
  role: 'Tài xế',
  dob: '1988-03-02',
  phone: '0912345678',
  identityNumber: '079088001234',
  licenseClass: 'E',
  licenseExpiry: '2027-08-15',
  status: 'Đang hoạt động',
  ...over,
});

function build(people: Personnel[]) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [DriversAssistants],
    providers: [
      { provide: HttpClient, useValue: { get: () => of([]), post: () => of(person()), patch: () => of(person()) } },
    ],
  });
  const page = TestBed.createComponent(DriversAssistants).componentInstance;
  page.allPersonnel = people;
  page.filterPersonnel();
  return page;
}

describe('Admin drivers and assistants screen', () => {
  const crew = [
    person({ id: 1, name: 'Nguyễn Văn Hùng', role: 'Tài xế', licenseClass: 'E' }),
    person({ id: 2, name: 'Trần Minh Đức', role: 'Phụ xe', licenseClass: 'B2',
      phone: '0987654321', identityNumber: '079088002222' }),
    person({ id: 3, name: 'Lê Thanh Sơn', role: 'Tài xế', licenseClass: 'D',
      status: 'Đã khóa', phone: '0901112223', identityNumber: '079088003333' }),
  ];

  it('counts active drivers and assistants, keeping locked staff in their own total', () => {
    const page = build(crew);
    expect(page.getTotalCount()).toBe(3);
    // Thẻ tài xế chỉ đếm người còn làm việc; người đã khóa nằm ở thẻ riêng.
    expect(page.getDriverCount()).toBe(1);
    expect(page.getAssistantCount()).toBe(1);
    expect(page.getLockedCount()).toBe(1);
  });

  it('keeps locked staff out of the driver and assistant tabs but shows them in their own tab', () => {
    const page = build(crew);
    page.setTab('Tài xế');
    expect(page.filteredPersonnel.map(p => p.id)).toEqual([1]);
    page.setTab('Phụ xe');
    expect(page.filteredPersonnel.map(p => p.id)).toEqual([2]);
    page.setTab('Đã khóa');
    expect(page.filteredPersonnel.map(p => p.id)).toEqual([3]);
    page.setTab('Tất cả');
    expect(page.filteredPersonnel).toHaveLength(3);
  });

  it('finds staff by name, phone number or identity number', () => {
    const page = build(crew);
    page.searchQuery = 'minh đức';
    page.filterPersonnel();
    expect(page.filteredPersonnel.map(p => p.id)).toEqual([2]);
    page.searchQuery = '0901112223';
    page.filterPersonnel();
    expect(page.filteredPersonnel.map(p => p.id)).toEqual([3]);
    page.searchQuery = '079088001234';
    page.filterPersonnel();
    expect(page.filteredPersonnel.map(p => p.id)).toEqual([1]);
  });

  it('narrows the list by licence class on top of the role filter', () => {
    const page = build(crew);
    page.roleFilter = 'Tài xế';
    page.licenseFilter = 'B2';
    page.filterPersonnel();
    expect(page.filteredPersonnel).toHaveLength(0);
    page.licenseFilter = 'E';
    page.filterPersonnel();
    expect(page.filteredPersonnel.map(p => p.id)).toEqual([1]);
  });

  it('clears every filter and returns to the first page', () => {
    const page = build(crew);
    page.searchQuery = 'hùng';
    page.roleFilter = 'Tài xế';
    page.licenseFilter = 'E';
    page.filterPersonnel();
    page.clearFilters();
    expect(page.filteredPersonnel).toHaveLength(3);
    expect(page.currentPage).toBe(1);
  });
});
