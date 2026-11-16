import { AdminTabs } from '../../../../shared/components/admin-tabs/admin-tabs';
import { AdminPageHeader } from '../../../../shared/components/admin-page-header/admin-page-header';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CustomerReportItem {
  maKH: string;
  hoTen: string;
  sdt: string;
  email: string;
  ngayDangKy: string;
  loaiKH: 'Hội viên' | 'Khách vãng lai';
  hangThanhVien: string;
  /** ISO, dùng cho lọc/biểu đồ theo ngày đăng ký */
  ngayDangKyIso: string | null;
  tongChiTieu: number;
  tongVeDat: number;
  trangThai: 'Đang hoạt động' | 'Đã khóa';
}

/** Một dòng của GET admin/reports/customers */
interface ApiCustomer {
  id: string;
  type: 'member' | 'guest';
  name: string;
  phone: string;
  email: string | null;
  registeredAt: string | null;
  tier: string | null;
  totalSpent: number;
  tickets: number;
  status: 'HoatDong' | 'DaKhoa' | string;
}

const TIER_TONE: Record<string, string> = { 'Bạc': 'silver', 'Vàng': 'gold', 'Kim cương': 'diamond' };

@Component({
  selector: 'app-customer-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Pagination,
    AdminPageHeader,
    AdminTabs,
  ],
  templateUrl: './customer-report.html',
  styleUrls: ['./customer-report.css']
})
export class CustomerReportComponent implements OnInit {
  // View Mode
  cheDoXem: 'bieu-do' | 'danh-sach' = 'bieu-do';

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly accountsApi = inject(AccountsApiService);
  /** App chạy không có zone.js: gọi API xong thì báo Angular vẽ lại giao diện. */
  private readonly api = {
    request: <T>(...args: Parameters<AccountsApiService['request']>): Promise<T> =>
      this.accountsApi.request<T>(...args).finally(() => this.cdr.markForCheck()),
  };
  loading = false;
  loadError = '';

  // Dữ liệu từ GET admin/reports/customers
  customers: CustomerReportItem[] = [];
  tierOptions: string[] = [];

  // Biểu đồ tính từ dữ liệu khách hàng theo bộ lọc
  dashboard = {
    coCauKH: [] as { label: string; pct: number; tone: string }[],
    dangKyTheoThang: [] as { month: string; count: number; x: number; y: number }[],
    duongDangKy: '',
    phanBoHangTV: [] as { label: string; count: number; pct: number; tone: string }[],
    chiTieuTheoHangTV: [] as { label: string; value: number; pct: number }[],
    topKhachHang: [] as { name: string; spending: number; pct: number }[],
    khachHangMoi: [] as { name: string; date: string; type: string }[],
    trangThaiKH: [] as { label: string; count: number; pct: number; tone: string }[],
    insights: { hangNhieuNhat: '—', thangNhieuNhat: '—', khachChiTieuCao: '—' },
  };

  // Filters
  filters = {
    searchTerm: '',
    status: 'Tất cả',
    loaiKH: 'Tất cả',
    hangTV: 'Tất cả',
    chiTieu: 'Tất cả',
    fromDate: '',
    toDate: ''
  };

  filteredCustomers: CustomerReportItem[] = [];
  paginatedCustomers: CustomerReportItem[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Stats
  stats = {
    total: 0,
    active: 0,
    locked: 0,
    totalTickets: 0,
    totalMembers: 0,
    totalSpending: 0
  };

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.loading = true;
    this.loadError = '';
    try {
      const rows: ApiCustomer[] = [];
      for (let page = 1; ; page++) {
        const res = await this.api.request<{ items: ApiCustomer[]; pagination: { totalPages: number } }>(
          `admin/reports/customers?page=${page}&pageSize=100&sort=spent`, 'GET', undefined, 'admin');
        rows.push(...res.items);
        if (page >= res.pagination.totalPages || !res.items.length) break;
      }
      this.customers = rows.map(r => ({
        maKH: r.id,
        hoTen: r.name,
        sdt: r.phone ?? '',
        email: r.email ?? '',
        ngayDangKy: r.registeredAt ? new Date(r.registeredAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }) : '',
        ngayDangKyIso: r.registeredAt,
        loaiKH: r.type === 'member' ? 'Hội viên' : 'Khách vãng lai',
        hangThanhVien: r.tier ?? 'Không có',
        tongChiTieu: r.totalSpent,
        tongVeDat: r.tickets,
        trangThai: r.status === 'DaKhoa' ? 'Đã khóa' : 'Đang hoạt động',
      }));
      this.tierOptions = [...new Set(this.customers.map(c => c.hangThanhVien).filter(t => t !== 'Không có'))];
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : 'Không tải được báo cáo khách hàng.';
    } finally {
      this.loading = false;
      this.onViewReport();
    }
  }

  /** Tính lại các biểu đồ từ danh sách đang lọc. */
  private buildDashboard() {
    const list = this.filteredCustomers;
    const total = list.length || 1;
    const pct = (n: number) => Math.round((n / total) * 100);

    const members = list.filter(c => c.loaiKH === 'Hội viên').length;
    this.dashboard.coCauKH = [
      { label: 'Hội viên', pct: pct(members), tone: 'primary' },
      { label: 'Khách vãng lai', pct: list.length ? 100 - pct(members) : 0, tone: 'warning' },
    ];

    // Đăng ký 6 tháng gần nhất
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
    const counts = months.map(m => list.filter(c => {
      if (!c.ngayDangKyIso) return false;
      const d = new Date(c.ngayDangKyIso);
      return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
    }).length);
    const max = Math.max(1, ...counts);
    this.dashboard.dangKyTheoThang = months.map((m, i) => ({
      month: `Tháng ${m.getMonth() + 1}`,
      count: counts[i],
      x: i * 20,
      y: Math.round(85 - (counts[i] / max) * 75),
    }));
    this.dashboard.duongDangKy = this.dashboard.dangKyTheoThang.map((p, i) => `${i ? 'L' : 'M'}${p.x * 5 + 50},${p.y}`).join(' ');

    const tiers = [...new Set(list.map(c => c.hangThanhVien).filter(t => t !== 'Không có'))];
    const tierMembers = list.filter(c => c.hangThanhVien !== 'Không có').length || 1;
    this.dashboard.phanBoHangTV = tiers.map(t => {
      const count = list.filter(c => c.hangThanhVien === t).length;
      return { label: t, count, pct: Math.round((count / tierMembers) * 100), tone: TIER_TONE[t] ?? 'silver' };
    });
    const spendByTier = tiers.map(t => ({ label: t, value: list.filter(c => c.hangThanhVien === t).reduce((s, c) => s + c.tongChiTieu, 0) }));
    const maxSpend = Math.max(1, ...spendByTier.map(t => t.value));
    this.dashboard.chiTieuTheoHangTV = spendByTier.map(t => ({ ...t, pct: Math.round((t.value / maxSpend) * 100) }));

    const top = [...list].sort((a, b) => b.tongChiTieu - a.tongChiTieu).slice(0, 5);
    const maxTop = Math.max(1, top[0]?.tongChiTieu ?? 0);
    this.dashboard.topKhachHang = top.map(c => ({ name: c.hoTen, spending: c.tongChiTieu, pct: Math.round((c.tongChiTieu / maxTop) * 100) }));

    this.dashboard.khachHangMoi = [...list]
      .filter(c => c.ngayDangKyIso)
      .sort((a, b) => b.ngayDangKyIso!.localeCompare(a.ngayDangKyIso!))
      .slice(0, 5)
      .map(c => ({ name: c.hoTen, date: c.ngayDangKy, type: c.loaiKH }));

    const active = list.filter(c => c.trangThai === 'Đang hoạt động').length;
    this.dashboard.trangThaiKH = [
      { label: 'Đang hoạt động', count: active, pct: pct(active), tone: 'success' },
      { label: 'Đã khóa', count: list.length - active, pct: list.length ? 100 - pct(active) : 0, tone: 'danger' },
    ];

    const biggestTier = [...this.dashboard.phanBoHangTV].sort((a, b) => b.count - a.count)[0];
    const bestMonth = [...this.dashboard.dangKyTheoThang].sort((a, b) => b.count - a.count)[0];
    this.dashboard.insights = {
      hangNhieuNhat: biggestTier?.label ?? '—',
      thangNhieuNhat: bestMonth && bestMonth.count > 0 ? bestMonth.month : '—',
      khachChiTieuCao: top[0]?.hoTen ?? '—',
    };
  }

  onViewReport() {
    this.filteredCustomers = this.customers.filter(customer => {
      const listMode = this.cheDoXem === 'danh-sach';
      const matchSearch = !listMode || !this.filters.searchTerm ||
        customer.maKH.toLowerCase().includes(this.filters.searchTerm.toLowerCase()) ||
        customer.hoTen.toLowerCase().includes(this.filters.searchTerm.toLowerCase()) ||
        customer.sdt.includes(this.filters.searchTerm) ||
        customer.email.toLowerCase().includes(this.filters.searchTerm.toLowerCase());

      const matchStatus = this.filters.status === 'Tất cả' || customer.trangThai === this.filters.status;
      const matchLoaiKH = this.filters.loaiKH === 'Tất cả' || customer.loaiKH === this.filters.loaiKH;
      const matchHangTV = this.filters.hangTV === 'Tất cả' || customer.hangThanhVien === this.filters.hangTV;
      const matchChiTieu = this.filters.chiTieu === 'Tất cả' ||
        (this.filters.chiTieu === 'Dưới 1 triệu' && customer.tongChiTieu < 1000000) ||
        (this.filters.chiTieu === '1 - 5 triệu' && customer.tongChiTieu >= 1000000 && customer.tongChiTieu < 5000000) ||
        (this.filters.chiTieu === '5 - 10 triệu' && customer.tongChiTieu >= 5000000 && customer.tongChiTieu < 10000000) ||
        (this.filters.chiTieu === 'Từ 10 triệu' && customer.tongChiTieu >= 10000000);

      // Date filtering logic (simplified for mock)
      let matchDate = true;
      if (listMode && (this.filters.fromDate || this.filters.toDate)) {
        if (!customer.ngayDangKyIso) return false;
        const regDate = new Date(customer.ngayDangKyIso);
        if (this.filters.fromDate) {
          matchDate = matchDate && regDate >= new Date(this.filters.fromDate);
        }
        if (this.filters.toDate) {
          matchDate = matchDate && regDate <= new Date(`${this.filters.toDate}T23:59:59`);
        }
      }

      return matchSearch && matchStatus && matchLoaiKH && matchHangTV && matchChiTieu && matchDate;
    });

    this.calculateStats();
    this.buildDashboard();
    this.currentPage = 1;
    this.updatePaginatedCustomers();
  }

  updatePaginatedCustomers() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredCustomers.length / this.pageSize));
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedCustomers = this.filteredCustomers.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedCustomers();
    }
  }

  getVisiblePages(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  private calculateStats() {
    this.stats = this.filteredCustomers.reduce((acc, curr) => {
      acc.total++;
      if (curr.trangThai === 'Đang hoạt động') acc.active++;
      else acc.locked++;

      acc.totalTickets += curr.tongVeDat;
      if (curr.loaiKH === 'Hội viên') acc.totalMembers++;
      acc.totalSpending += curr.tongChiTieu;

      return acc;
    }, {
      total: 0,
      active: 0,
      locked: 0,
      totalTickets: 0,
      totalMembers: 0,
      totalSpending: 0
    });
  }

  ChuyenCheDoXem(mode: 'bieu-do' | 'danh-sach') {
    this.cheDoXem = mode;
    this.onViewReport();
  }

  onResetFilters() {
    this.filters = {
      searchTerm: '',
      status: 'Tất cả',
      loaiKH: 'Tất cả',
      hangTV: 'Tất cả',
      chiTieu: 'Tất cả',
      fromDate: '',
      toDate: ''
    };
    this.onViewReport();
  }

  onExportExcel() {
    if (this.filteredCustomers.length === 0) {
      alert('Không có dữ liệu để xuất Excel!');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'BÁO CÁO KHÁCH HÀNG\n';
    csvContent += 'Mã KH,Họ tên,Số điện thoại,Email,Ngày đăng ký,Loại KH,Hạng TV,Tổng chi tiêu,Tổng vé,Trạng thái\n';

    this.filteredCustomers.forEach(c => {
      csvContent += `${c.maKH},${c.hoTen},${c.sdt},${c.email},${c.ngayDangKy},${c.loaiKH},${c.hangThanhVien},${c.tongChiTieu},${c.tongVeDat},${c.trangThai}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'BaoCaoKhachHang.csv');
    link.click();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }
}
