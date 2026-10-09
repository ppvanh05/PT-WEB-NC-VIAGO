import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CustomerReportItem {
  maKH: string;
  hoTen: string;
  sdt: string;
  email: string;
  ngayDangKy: string;
  loaiKH: 'Hội viên' | 'Khách vãng lai';
  hangThanhVien: 'Bạc' | 'Vàng' | 'Kim cương' | 'Không có';
  tongChiTieu: number;
  tongVeDat: number;
  trangThai: 'Đang hoạt động' | 'Đã khóa';
}

@Component({
  selector: 'app-customer-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-report.html',
  styleUrls: ['./customer-report.css']
})
export class CustomerReportComponent implements OnInit {
  // View Mode
  cheDoXem: 'bieu-do' | 'danh-sach' = 'bieu-do';

  // Mock Data
  customers: CustomerReportItem[] = [
    { maKH: 'KH0001', hoTen: 'Nguyễn Minh Anh', sdt: '0901234567', email: 'minhanh@gmail.com', ngayDangKy: '15/01/2025', loaiKH: 'Hội viên', hangThanhVien: 'Bạc', tongChiTieu: 4500000, tongVeDat: 8, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0002', hoTen: 'Trần Quốc Bảo', sdt: '0912345678', email: 'quocbao@gmail.com', ngayDangKy: '20/02/2025', loaiKH: 'Hội viên', hangThanhVien: 'Vàng', tongChiTieu: 8200000, tongVeDat: 15, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0003', hoTen: 'Lê Thu Hà', sdt: '0933456789', email: 'thuha@gmail.com', ngayDangKy: '12/03/2025', loaiKH: 'Hội viên', hangThanhVien: 'Bạc', tongChiTieu: 3800000, tongVeDat: 7, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0004', hoTen: 'Phạm Gia Hưng', sdt: '0944567890', email: 'giahung@gmail.com', ngayDangKy: '05/04/2025', loaiKH: 'Hội viên', hangThanhVien: 'Kim cương', tongChiTieu: 18500000, tongVeDat: 32, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0005', hoTen: 'Võ Thanh Tâm', sdt: '0965678901', email: 'thanhtam@gmail.com', ngayDangKy: '22/05/2025', loaiKH: 'Khách vãng lai', hangThanhVien: 'Không có', tongChiTieu: 850000, tongVeDat: 1, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0006', hoTen: 'Đặng Hoài Nam', sdt: '0976789012', email: 'hoainam@gmail.com', ngayDangKy: '18/06/2025', loaiKH: 'Hội viên', hangThanhVien: 'Bạc', tongChiTieu: 2900000, tongVeDat: 5, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0007', hoTen: 'Mai Thanh Trúc', sdt: '0987890123', email: 'thanhtruc@gmail.com', ngayDangKy: '07/07/2025', loaiKH: 'Hội viên', hangThanhVien: 'Vàng', tongChiTieu: 9600000, tongVeDat: 18, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0008', hoTen: 'Đỗ Quốc Huy', sdt: '0398901234', email: 'quochuy@gmail.com', ngayDangKy: '25/07/2025', loaiKH: 'Khách vãng lai', hangThanhVien: 'Không có', tongChiTieu: 1200000, tongVeDat: 2, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0009', hoTen: 'Phan Ngọc Linh', sdt: '0389012345', email: 'ngoclinh@gmail.com', ngayDangKy: '11/08/2025', loaiKH: 'Hội viên', hangThanhVien: 'Kim cương', tongChiTieu: 22300000, tongVeDat: 40, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0010', hoTen: 'Bùi Khánh Vy', sdt: '0370123456', email: 'khanhvy@gmail.com', ngayDangKy: '19/08/2025', loaiKH: 'Hội viên', hangThanhVien: 'Bạc', tongChiTieu: 3400000, tongVeDat: 6, trangThai: 'Đã khóa' },
    { maKH: 'KH0011', hoTen: 'Nguyễn Hoàng Phúc', sdt: '0361234567', email: 'hoangphuc@gmail.com', ngayDangKy: '02/09/2025', loaiKH: 'Hội viên', hangThanhVien: 'Vàng', tongChiTieu: 7800000, tongVeDat: 13, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0012', hoTen: 'Trần Mỹ Linh', sdt: '0352345678', email: 'mylinh@gmail.com', ngayDangKy: '15/09/2025', loaiKH: 'Khách vãng lai', hangThanhVien: 'Không có', tongChiTieu: 600000, tongVeDat: 1, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0013', hoTen: 'Lê Gia Bảo', sdt: '0343456789', email: 'giabao@gmail.com', ngayDangKy: '28/09/2025', loaiKH: 'Hội viên', hangThanhVien: 'Bạc', tongChiTieu: 4200000, tongVeDat: 8, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0014', hoTen: 'Phạm Thanh Hằng', sdt: '0334567890', email: 'thanhhang@gmail.com', ngayDangKy: '10/10/2025', loaiKH: 'Hội viên', hangThanhVien: 'Kim cương', tongChiTieu: 25600000, tongVeDat: 45, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0015', hoTen: 'Võ Đức Minh', sdt: '0325678901', email: 'ducminh@gmail.com', ngayDangKy: '22/10/2025', loaiKH: 'Hội viên', hangThanhVien: 'Vàng', tongChiTieu: 11300000, tongVeDat: 20, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0016', hoTen: 'Đặng Thảo Nhi', sdt: '0316789012', email: 'thaonhi@gmail.com', ngayDangKy: '05/11/2025', loaiKH: 'Khách vãng lai', hangThanhVien: 'Không có', tongChiTieu: 950000, tongVeDat: 2, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0017', hoTen: 'Mai Quốc Thịnh', sdt: '0397890123', email: 'quocthinh@gmail.com', ngayDangKy: '18/11/2025', loaiKH: 'Hội viên', hangThanhVien: 'Bạc', tongChiTieu: 3100000, tongVeDat: 5, trangThai: 'Đã khóa' },
    { maKH: 'KH0018', hoTen: 'Đỗ Minh Châu', sdt: '0388901234', email: 'minhchau@gmail.com', ngayDangKy: '30/11/2025', loaiKH: 'Hội viên', hangThanhVien: 'Vàng', tongChiTieu: 8900000, tongVeDat: 16, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0019', hoTen: 'Phan Nhật Nam', sdt: '0379012345', email: 'nhatnam@gmail.com', ngayDangKy: '12/12/2025', loaiKH: 'Hội viên', hangThanhVien: 'Kim cương', tongChiTieu: 19800000, tongVeDat: 34, trangThai: 'Đang hoạt động' },
    { maKH: 'KH0020', hoTen: 'Bùi Thanh Tùng', sdt: '0360123456', email: 'thanhtung@gmail.com', ngayDangKy: '20/12/2025', loaiKH: 'Khách vãng lai', hangThanhVien: 'Không có', tongChiTieu: 700000, tongVeDat: 1, trangThai: 'Đang hoạt động' }
  ];

  // Dashboard Mock Data
  dashboard = {
    coCauKH: [
      { label: 'Hội viên', pct: 75, tone: 'primary' },
      { label: 'Khách vãng lai', pct: 25, tone: 'warning' }
    ],
    dangKyTheoThang: [
      { month: 'Tháng 1', count: 12, x: 0, y: 80 },
      { month: 'Tháng 2', count: 18, x: 20, y: 60 },
      { month: 'Tháng 3', count: 15, x: 40, y: 70 },
      { month: 'Tháng 4', count: 25, x: 60, y: 30 },
      { month: 'Tháng 5', count: 32, x: 80, y: 10 },
      { month: 'Tháng 6', count: 28, x: 100, y: 20 }
    ],
    phanBoHangTV: [
      { label: 'Bạc', count: 10, pct: 52, tone: 'silver' },
      { label: 'Vàng', count: 5, pct: 26, tone: 'gold' },
      { label: 'Kim cương', count: 4, pct: 22, tone: 'diamond' }
    ],
    chiTieuTheoHangTV: [
      { label: 'Bạc', value: 18900000, pct: 18 },
      { label: 'Vàng', value: 45800000, pct: 42 },
      { label: 'Kim cương', value: 106200000, pct: 100 }
    ],
    topKhachHang: [
      { name: 'Phạm Thanh Hằng', spending: 25600000, pct: 100 },
      { name: 'Phan Ngọc Linh', spending: 22300000, pct: 87 },
      { name: 'Phan Nhật Nam', spending: 19800000, pct: 77 },
      { name: 'Phạm Gia Hưng', spending: 18500000, pct: 72 },
      { name: 'Võ Đức Minh', spending: 11300000, pct: 44 }
    ],
    khachHangMoi: [
      { name: 'Bùi Thanh Tùng', date: '20/12/2025', type: 'Khách vãng lai' },
      { name: 'Phan Nhật Nam', date: '12/12/2025', type: 'Hội viên' },
      { name: 'Đỗ Minh Châu', date: '30/11/2025', type: 'Hội viên' },
      { name: 'Mai Quốc Thịnh', date: '18/11/2025', type: 'Hội viên' },
      { name: 'Đặng Thảo Nhi', date: '05/11/2025', type: 'Khách vãng lai' }
    ],
    trangThaiKH: [
      { label: 'Đang hoạt động', count: 18, pct: 90, tone: 'success' },
      { label: 'Đã khóa', count: 2, pct: 10, tone: 'danger' }
    ],
    insights: {
      hangNhieuNhat: 'Bạc',
      thangNhieuNhat: 'Tháng 5',
      khachChiTieuCao: 'Phạm Thanh Hằng'
    }
  };

  // Filters
  filters = {
    searchTerm: '',
    status: 'Tất cả',
    loaiKH: 'Tất cả',
    hangTV: 'Tất cả',
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
    this.onViewReport();
  }

  onViewReport() {
    this.filteredCustomers = this.customers.filter(customer => {
      const matchSearch = !this.filters.searchTerm || 
        customer.maKH.toLowerCase().includes(this.filters.searchTerm.toLowerCase()) ||
        customer.hoTen.toLowerCase().includes(this.filters.searchTerm.toLowerCase()) ||
        customer.sdt.includes(this.filters.searchTerm) ||
        customer.email.toLowerCase().includes(this.filters.searchTerm.toLowerCase());
      
      const matchStatus = this.filters.status === 'Tất cả' || customer.trangThai === this.filters.status;
      const matchLoaiKH = this.filters.loaiKH === 'Tất cả' || customer.loaiKH === this.filters.loaiKH;
      const matchHangTV = this.filters.hangTV === 'Tất cả' || customer.hangThanhVien === this.filters.hangTV;
      
      // Date filtering logic (simplified for mock)
      let matchDate = true;
      if (this.filters.fromDate || this.filters.toDate) {
        const regDate = this.parseDate(customer.ngayDangKy);
        if (this.filters.fromDate) {
          matchDate = matchDate && regDate >= new Date(this.filters.fromDate);
        }
        if (this.filters.toDate) {
          matchDate = matchDate && regDate <= new Date(this.filters.toDate);
        }
      }

      return matchSearch && matchStatus && matchLoaiKH && matchHangTV && matchDate;
    });

    this.calculateStats();
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

  private parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
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
  }

  onResetFilters() {
    this.filters = {
      searchTerm: '',
      status: 'Tất cả',
      loaiKH: 'Tất cả',
      hangTV: 'Tất cả',
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
