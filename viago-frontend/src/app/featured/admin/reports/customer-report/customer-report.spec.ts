import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { CustomerReportComponent } from './customer-report';

const customer = (over: Record<string, unknown> = {}) => ({
  maKH: 'KH001',
  hoTen: 'Nguyễn Văn An',
  sdt: '0912345678',
  email: 'an@example.com',
  ngayDangKy: '01/06/2026',
  loaiKH: 'Hội viên' as const,
  hangThanhVien: 'Bạc',
  ngayDangKyIso: '2026-06-01',
  tongChiTieu: 2000000,
  tongVeDat: 4,
  trangThai: 'Đang hoạt động' as const,
  ...over,
});

function build(customers: ReturnType<typeof customer>[] = []) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CustomerReportComponent],
    providers: [
      { provide: AccountsApiService, useValue: { request: async () => ({ items: [], pagination: { totalPages: 1 } }) } },
    ],
  });
  const page = TestBed.createComponent(CustomerReportComponent).componentInstance;
  page.customers = customers as never;
  return page;
}

describe('Admin customer report', () => {
  const people = [
    customer({ maKH: 'KH001', tongChiTieu: 500000, loaiKH: 'Khách vãng lai', hangThanhVien: '-' }),
    customer({ maKH: 'KH002', hoTen: 'Trần Thị Bình', sdt: '0987654321', email: 'binh@example.com',
      tongChiTieu: 3000000, hangThanhVien: 'Vàng', tongVeDat: 6 }),
    customer({ maKH: 'KH003', hoTen: 'Lê Văn Cường', tongChiTieu: 12000000, hangThanhVien: 'Kim Cương',
      trangThai: 'Đã khóa', tongVeDat: 20, ngayDangKyIso: '2026-01-15' }),
  ];

  it('totals spending, tickets, members and locked accounts of the filtered list', () => {
    const page = build(people);
    page.onViewReport();
    expect(page.stats.total).toBe(3);
    expect(page.stats.active).toBe(2);
    expect(page.stats.locked).toBe(1);
    expect(page.stats.totalMembers).toBe(2);
    expect(page.stats.totalTickets).toBe(30);
    expect(page.stats.totalSpending).toBe(15500000);
  });

  it('puts each customer in the right spending band', () => {
    const page = build(people);
    const idsFor = (band: string) => {
      page.filters.chiTieu = band;
      page.onViewReport();
      return page.filteredCustomers.map(c => c.maKH);
    };
    expect(idsFor('Dưới 1 triệu')).toEqual(['KH001']);
    expect(idsFor('1 - 5 triệu')).toEqual(['KH002']);
    expect(idsFor('5 - 10 triệu')).toEqual([]);
    expect(idsFor('Từ 10 triệu')).toEqual(['KH003']);
  });

  it('combines the membership tier and account status filters', () => {
    const page = build(people);
    page.filters.hangTV = 'Vàng';
    page.filters.status = 'Đã khóa';
    page.onViewReport();
    expect(page.filteredCustomers).toHaveLength(0);
    page.filters.status = 'Đang hoạt động';
    page.onViewReport();
    expect(page.filteredCustomers.map(c => c.maKH)).toEqual(['KH002']);
  });

  it('searches by code, name, phone or email, but only in list mode', () => {
    const page = build(people);
    page.ChuyenCheDoXem('danh-sach');
    for (const term of ['KH002', 'trần thị', '0987654321', 'binh@example.com']) {
      page.filters.searchTerm = term;
      page.onViewReport();
      expect(page.filteredCustomers.map(c => c.maKH), term).toEqual(['KH002']);
    }
    // Ở chế độ biểu đồ, ô tìm kiếm không áp dụng nên vẫn tính trên toàn bộ khách.
    page.ChuyenCheDoXem('bieu-do');
    page.onViewReport();
    expect(page.filteredCustomers).toHaveLength(3);
  });

  it('filters by registration date only in list mode and drops customers with no date', () => {
    const page = build([...people, customer({ maKH: 'KH004', ngayDangKyIso: null })]);
    page.ChuyenCheDoXem('danh-sach');
    page.filters.fromDate = '2026-05-01';
    page.onViewReport();
    expect(page.filteredCustomers.map(c => c.maKH)).toEqual(['KH001', 'KH002']);
  });

  it('clears every filter and shows all customers again', () => {
    const page = build(people);
    page.ChuyenCheDoXem('danh-sach');
    page.filters.searchTerm = 'KH002';
    page.filters.hangTV = 'Vàng';
    page.onViewReport();
    page.onResetFilters();
    expect(page.filteredCustomers).toHaveLength(3);
    expect(page.filters.searchTerm).toBe('');
    expect(page.filters.hangTV).toBe('Tất cả');
  });

  it('pages the table and ignores pages outside the range', () => {
    const page = build(Array.from({ length: 25 }, (_, i) => customer({ maKH: 'KH' + i })));
    page.onViewReport();
    expect(page.paginatedCustomers).toHaveLength(page.pageSize);
    page.setPage(page.totalPages);
    expect(page.currentPage).toBe(page.totalPages);
    page.setPage(page.totalPages + 5);
    expect(page.currentPage).toBe(page.totalPages);
  });
});
