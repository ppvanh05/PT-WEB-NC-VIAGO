import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../core/services/toast.service';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker';

export interface CancelRefundRule {
  truocGio: number;
  phiHuy: number;
}

export interface Policy {
  maCS: string;
  tenChinhSach: string;
  loaiChinhSach: string;
  trangThai: 'Đang áp dụng' | 'Đã khóa';
  ngayApDung: string;
  capNhatCuoi: string;
  nguoiThucHien: string;
  noiDungChinhSach: string;
  mocThoiGianHuyVe?: CancelRefundRule[];
}

export interface FeeBadge {
  label: string;
  bg: string;
  color: string;
  border: string;
}

const MOCK_POLICIES: Policy[] = [
  {
    maCS: "CS00001",
    tenChinhSach: "Chính sách đặt vé và giữ chỗ trực tuyến",
    loaiChinhSach: "Chính sách đặt vé",
    ngayApDung: "2026-07-03",
    capNhatCuoi: "2026-07-03 09:00",
    trangThai: "Đang áp dụng",
    nguoiThucHien: "Quản trị viên",
    noiDungChinhSach: "<p>Hệ thống cho phép người dùng đặt vé trực tuyến thông qua website và ứng dụng di động ViAGO. Khi thực hiện giao dịch, quý khách vui lòng lưu ý:</p><ol><li>Hệ thống hỗ trợ giữ ghế tối đa 15 phút sau khi lệnh đặt chỗ được khởi tạo thành công.</li><li>Đơn hàng trong thời gian này sẽ ở trạng thái chờ thanh toán.</li><li>Hệ thống sẽ tự động hủy lệnh đặt vé nếu quá thời hạn 15 phút mà chưa nhận được xác nhận thanh toán thành công.</li><li>Quý khách yêu cầu cung cấp chính xác họ tên và số điện thoại liên lạc để nhận mã vé điện tử.</li><li>Khách hàng được quyền tự do chọn ghế theo sơ đồ thời gian thực được hiển thị trên hệ thống.</li><li>Nhà xe hoặc ban quản lý ViAGO có quyền điều chỉnh vị trí ghế trong các trường hợp đặc biệt (thay đổi xe, lỗi kỹ thuật ghế ngồi) nhưng vẫn đảm bảo đúng hạng vé đã đặt.</li></ol>"
  },
  {
    maCS: "CS00002",
    tenChinhSach: "Chính sách thay đổi và chỉnh sửa thông tin vé",
    loaiChinhSach: "Chính sách chỉnh sửa vé",
    ngayApDung: "2026-07-03",
    capNhatCuoi: "2026-07-03 09:05",
    trangThai: "Đang áp dụng",
    nguoiThucHien: "Quản trị viên",
    noiDungChinhSach: "<p>ViAGO hỗ trợ khách hàng thay đổi các thông tin cơ bản sau khi đã hoàn tất đặt vé:</p><ol><li>Chế độ chỉnh sửa chỉ áp dụng cho các vé đã thanh toán thành công.</li><li>Yêu cầu chỉnh sửa phải được thực hiện trước giờ xe khởi hành ít nhất 2 tiếng.</li><li>Mỗi mã vé chỉ được hỗ trợ chỉnh sửa tối đa 2 lần.</li><li>Quý khách được phép thay đổi: Thông tin liên hệ, ghi chú gửi nhà xe, điểm đón và điểm trả trong cùng lộ trình.</li><li>ViAGO không thu phí chỉnh sửa nếu quý khách đáp ứng đầy đủ các điều kiện nêu trên.</li></ol>"
  },
  {
    maCS: "CS00003",
    tenChinhSach: "Chính sách hủy vé và hoàn tiền cho hành khách",
    loaiChinhSach: "Chính sách hoàn hủy",
    ngayApDung: "2026-07-03",
    capNhatCuoi: "2026-07-03 09:10",
    trangThai: "Đang áp dụng",
    nguoiThucHien: "Quản trị viên",
    noiDungChinhSach: "<p>Chính sách hủy vé được quy định rõ ràng nhằm đảm bảo quyền lợi cho cả khách hàng và nhà xe:</p><ol><li>Điều kiện được hủy vé phụ thuộc vào quy định riêng của từng nhà xe được hiển thị tại bước đặt vé.</li><li>Số tiền hoàn lại được tính dựa trên thời gian quý khách gửi yêu cầu hủy vé (thường giảm dần theo thời gian sát giờ khởi hành).</li><li>Quy trình hoàn tiền sẽ được thực hiện tự động về đúng tài khoản thanh toán ban đầu của khách hàng.</li><li>Trạng thái xử lý hoàn tiền sẽ được cập nhật liên tục qua email hoặc trong phần \"Lịch sử đặt vé\".</li><li>Các trường hợp không được hoàn tiền bao gồm: Vé hủy sau giờ khởi hành, vé khuyến mãi không áp dụng hoàn hủy, khách hàng không có mặt tại điểm đón đúng giờ.</li></ol>",
    mocThoiGianHuyVe: [
      { truocGio: 24, phiHuy: 10 },
      { truocGio: 12, phiHuy: 30 },
      { truocGio: 0, phiHuy: 100 }
    ]
  },
  {
    maCS: "CS00004",
    tenChinhSach: "Điều khoản dịch vụ và cam kết bồi thường",
    loaiChinhSach: "Điều khoản dịch vụ",
    ngayApDung: "2026-07-03",
    capNhatCuoi: "2026-07-03 09:15",
    trangThai: "Đang áp dụng",
    nguoiThucHien: "Quản trị viên",
    noiDungChinhSach: "<p>ViAGO cam kết mang đến trải nghiệm di chuyển an toàn và thuận tiện nhất:</p><ol><li>Chúng tôi cam kết giữ đúng chỗ và loại xe cho khách hàng sở hữu mã vé hợp lệ.</li><li>Trong trường hợp xe gặp sự cố kỹ thuật, ViAGO và nhà xe sẽ hỗ trợ chuyển quý khách sang chuyến gần nhất có thể.</li><li>Hoàn tiền 100% giá trị vé nếu nhà xe không thể cung cấp dịch vụ như đã cam kết và không có phương án thay thế phù hợp.</li><li>Tặng thêm voucher giảm giá đền bù cho các sự cố gây trễ giờ nghiêm trọng do lỗi chủ quan từ nhà xe.</li><li>Các trường hợp bất khả kháng (thiên tai, dịch bệnh, tắc đường do tai nạn giao thông, quy định của cơ quan nhà nước) sẽ được miễn trừ trách nhiệm bồi thường.</li></ol>"
  },
  {
    maCS: "CS00005",
    tenChinhSach: "Chính sách bảo mật và quyền riêng tư dữ liệu cá nhân",
    loaiChinhSach: "Chính sách bảo mật",
    ngayApDung: "2026-07-03",
    capNhatCuoi: "2026-07-03 09:20",
    trangThai: "Đang áp dụng",
    nguoiThucHien: "Quản trị viên",
    noiDungChinhSach: "<p>ViAGO cam kết bảo vệ thông tin cá nhân và dữ liệu riêng tư của quý khách hàng theo các tiêu chuẩn cao nhất:</p><ol><li><b>Thu thập dữ liệu cá nhân:</b> Họ tên, số điện thoại, email, địa chỉ liên hệ, lịch sử chuyến đi, thông tin vị trí GPS và cookies thiết bị.</li><li><b>Mục đích sử dụng dữ liệu:</b> Vận hành dịch vụ đặt vé, gửi thông báo chuyến đi qua SMS/Zalo, nâng cao trải nghiệm người dùng và gửi ưu đãi tri ân.</li><li><b>Chia sẻ thông tin:</b> Chỉ chia sẻ với tài xế/phụ xe liên hệ đón khách, cổng thanh toán và cơ quan pháp luật khi có yêu cầu.</li><li><b>Bảo mật và lưu trữ:</b> Sử dụng công nghệ mã hóa SSL/TLS, lưu trữ tối thiểu 24 tháng theo quy định pháp luật và kiểm soát chặt chẽ quyền truy cập nội bộ.</li><li><b>Quyền của khách hàng:</b> Quý khách có quyền xem, chỉnh sửa, yêu cầu xóa dữ liệu hoặc từ chối nhận thông tin quảng cáo bất kỳ lúc nào.</li></ol>"
  }
];

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  templateUrl: './policies.html',
  styleUrl: './policies.css'
})
export class Policies implements OnInit {
  policies: Policy[] = [];
  filteredPolicies: Policy[] = [];

  // Tab & Filters
  statusTabs = ['Tất cả', 'Đang áp dụng', 'Đã khóa'];
  currentTab = 'Tất cả';
  searchText = '';
  filterLoai = 'Tất cả loại chính sách';

  categories = [
    'Chính sách đặt vé',
    'Chính sách chỉnh sửa vé',
    'Chính sách hoàn hủy',
    'Điều khoản dịch vụ',
    'Chính sách bảo mật'
  ];
  filterSort = 'Mới nhất';

  // Modals
  showCreateModal = false;
  showEditModal = false;
  showSuccessModal = false;
  showLockConfirmModal = false;
  successMessageTitle = '';
  successMessageBody = '';
  private successTimer: any = null;

  // Forms
  newPolicy: Partial<Policy> = {
    tenChinhSach: '',
    loaiChinhSach: '',
    ngayApDung: new Date().toISOString().slice(0, 10),
    noiDungChinhSach: '',
    mocThoiGianHuyVe: []
  };
  createFormSubmitted = false;

  editingPolicy: Policy | null = null;
  editFormSubmitted = false;

  // Pagination
  itemsPerPage = 10;
  currentPage = 1;

  toastService = inject(ToastService);
  cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.policies = [...MOCK_POLICIES];
    this.filterData();
  }

  // Format capNhatCuoi as HH:mm dd/mm/yyyy (Giờ trước, ngày sau)
  formatDateVN(dateStr?: string | null): string {
    if (!dateStr) return '';
    const trimmed = dateStr.trim();
    const matchDateTime = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2})(:\d{2})?$/.exec(trimmed);
    if (matchDateTime) {
      const [_, yyyy, mm, dd, time] = matchDateTime;
      return `${time} ${dd}/${mm}/${yyyy}`;
    }
    const matchDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (matchDate) {
      const [_, yyyy, mm, dd] = matchDate;
      return `${dd}/${mm}/${yyyy}`;
    }
    return trimmed;
  }

  getFeeMatrixBadges(p: Policy): FeeBadge[] {
    if (p.loaiChinhSach !== 'Chính sách hoàn hủy') return [];
    if (p.mocThoiGianHuyVe && p.mocThoiGianHuyVe.length > 0) {
      const sorted = [...p.mocThoiGianHuyVe].sort((a, b) => b.truocGio - a.truocGio);
      return sorted.map(rule => {
        const refundPct = Math.max(0, 100 - rule.phiHuy);
        if (rule.truocGio >= 24) {
          return {
            label: `≥ ${rule.truocGio}h: Hoàn ${refundPct}%`,
            bg: '#d1fae5',
            color: '#047857',
            border: '#a7f3d0'
          };
        } else if (rule.truocGio >= 12) {
          return {
            label: `${rule.truocGio}h - 24h: Hoàn ${refundPct}%`,
            bg: '#fef3c7',
            color: '#b45309',
            border: '#fde68a'
          };
        } else {
          return {
            label: `< ${rule.truocGio > 0 ? rule.truocGio : 12}h: Hoàn ${refundPct}%`,
            bg: '#fee2e2',
            color: '#b91c1c',
            border: '#fca5a5'
          };
        }
      });
    }
    return [
      { label: '≥ 24h: Hoàn 90%', bg: '#d1fae5', color: '#047857', border: '#a7f3d0' },
      { label: '12h - 24h: Hoàn 70%', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
      { label: '< 12h: Hoàn 0%', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' }
    ];
  }

  // --- STATS GETTERS ---
  get totalPoliciesCount(): number {
    return this.policies.length;
  }
  get activePoliciesCount(): number {
    return this.policies.filter(p => p.trangThai === 'Đang áp dụng').length;
  }
  get lockedPoliciesCount(): number {
    return this.policies.filter(p => p.trangThai === 'Đã khóa').length;
  }

  get countDatVe(): number {
    return this.policies.filter(p => p.loaiChinhSach === 'Chính sách đặt vé').length;
  }
  get countChinhSuaVe(): number {
    return this.policies.filter(p => p.loaiChinhSach === 'Chính sách chỉnh sửa vé').length;
  }
  get countHoanHuy(): number {
    return this.policies.filter(p => p.loaiChinhSach === 'Chính sách hoàn hủy').length;
  }
  get countDieuKhoan(): number {
    return this.policies.filter(p => p.loaiChinhSach === 'Điều khoản dịch vụ').length;
  }
  get countBaoMat(): number {
    return this.policies.filter(p => p.loaiChinhSach === 'Chính sách bảo mật').length;
  }

  countByStatus(status: string): number {
    if (status === 'Tất cả') {
      return this.policies.length;
    }
    return this.policies.filter(p => p.trangThai === status).length;
  }

  private scrollToTop() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  selectTab(tab: string) {
    this.currentTab = tab;
    this.currentPage = 1;
    this.filterData();
    this.scrollToTop();
  }

  clearFilters() {
    this.searchText = '';
    this.filterLoai = 'Tất cả loại chính sách';
    this.filterSort = 'Mới nhất';
    this.currentTab = 'Tất cả';
    this.filterData();
    this.toastService.showInfo('Đã đặt lại tất cả bộ lọc');
  }

  filterData() {
    let result = [...this.policies];
    this.currentPage = 1;

    if (this.currentTab === 'Đang áp dụng') {
      result = result.filter(p => p.trangThai === 'Đang áp dụng');
    } else if (this.currentTab === 'Đã khóa') {
      result = result.filter(p => p.trangThai === 'Đã khóa');
    }

    if (this.filterLoai !== 'Tất cả loại chính sách') {
      result = result.filter(p => p.loaiChinhSach === this.filterLoai);
    }

    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase().trim();
      result = result.filter(p =>
        p.maCS.toLowerCase().includes(search) ||
        p.tenChinhSach.toLowerCase().includes(search)
      );
    }

    if (this.filterSort === 'Mới nhất' || this.filterSort === 'Mới nhất tạo trước') {
      result.sort((a, b) => b.capNhatCuoi.localeCompare(a.capNhatCuoi));
    } else if (this.filterSort === 'Cũ nhất' || this.filterSort === 'Cũ nhất tạo trước') {
      result.sort((a, b) => a.capNhatCuoi.localeCompare(b.capNhatCuoi));
    } else if (this.filterSort === 'Theo tiêu đề A-Z') {
      result.sort((a, b) => a.tenChinhSach.localeCompare(b.tenChinhSach));
    }

    this.filteredPolicies = result;
    this.cdr.detectChanges();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredPolicies.length / this.itemsPerPage) || 1;
  }

  get paginatedPolicies(): Policy[] {
    return this.filteredPolicies.slice(this.startIndex, this.endIndex);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.itemsPerPage, this.filteredPolicies.length);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.scrollToTop();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.scrollToTop();
    }
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.scrollToTop();
    }
  }

  getPages(): number[] {
    const windowSize = 3;
    let start = this.currentPage - Math.floor(windowSize / 2);
    let end = this.currentPage + Math.floor(windowSize / 2);

    if (start < 1) {
      start = 1;
      end = Math.min(this.totalPages, windowSize);
    }

    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(1, this.totalPages - windowSize + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  addRule(policy: Partial<Policy>) {
    if (!policy.mocThoiGianHuyVe) {
      policy.mocThoiGianHuyVe = [];
    }
    policy.mocThoiGianHuyVe.push({ truocGio: 0, phiHuy: 0 });
    this.cdr.detectChanges();
  }

  removeRule(policy: Partial<Policy>, index: number) {
    if (policy.mocThoiGianHuyVe) {
      policy.mocThoiGianHuyVe.splice(index, 1);
    }
    this.cdr.detectChanges();
  }

  onTypeChange(policy: Partial<Policy>) {
    if (policy.loaiChinhSach === 'Chính sách hoàn hủy') {
      if (!policy.mocThoiGianHuyVe || policy.mocThoiGianHuyVe.length === 0) {
        policy.mocThoiGianHuyVe = [
          { truocGio: 24, phiHuy: 10 },
          { truocGio: 12, phiHuy: 30 },
          { truocGio: 0, phiHuy: 100 }
        ];
      }
    } else {
      policy.mocThoiGianHuyVe = [];
    }
    this.cdr.detectChanges();
  }

  applyFormatting(target: 'create' | 'edit', formatType: string) {
    const policyObj = target === 'create' ? this.newPolicy : this.editingPolicy;
    if (!policyObj) return;

    let content = policyObj.noiDungChinhSach || '';
    switch (formatType) {
      case 'bold':
        content += ' <b>nội dung in đậm</b>';
        break;
      case 'italic':
        content += ' <i>nội dung in nghiêng</i>';
        break;
      case 'underline':
        content += ' <u>nội dung gạch chân</u>';
        break;
      case 'h2':
        content += '\n<h2>Tiêu đề mục mới</h2>';
        break;
      case 'ol':
        content += '\n<ol>\n  <li>Mục 1: Điều khoản...</li>\n  <li>Mục 2: Điều khoản...</li>\n</ol>';
        break;
      case 'ul':
        content += '\n<ul>\n  <li>Ý 1...</li>\n  <li>Ý 2...</li>\n</ul>';
        break;
      case 'blockquote':
        content += '\n<blockquote>Ghi chú quan trọng...</blockquote>';
        break;
      case 'clear':
        content = content.replace(/<[^>]*>/g, '');
        break;
    }
    policyObj.noiDungChinhSach = content;
    this.cdr.detectChanges();
  }

  openCreateModal() {
    const todayISO = new Date().toISOString().slice(0, 10);
    this.newPolicy = {
      tenChinhSach: '',
      loaiChinhSach: '',
      ngayApDung: todayISO,
      noiDungChinhSach: '',
      mocThoiGianHuyVe: []
    };
    this.createFormSubmitted = false;
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.cdr.detectChanges();
  }

  saveNewPolicy() {
    this.createFormSubmitted = true;
    if (!this.newPolicy.tenChinhSach?.trim()) {
      this.toastService.showError('Vui lòng nhập tên chính sách');
      return;
    }
    if (!this.newPolicy.loaiChinhSach?.trim()) {
      this.toastService.showError('Vui lòng chọn loại chính sách');
      return;
    }
    if (!this.newPolicy.noiDungChinhSach?.trim()) {
      this.toastService.showError('Vui lòng nhập nội dung chính sách');
      return;
    }

    const newId = 'CS' + String(this.policies.length + 1).padStart(5, '0');

    if (this.newPolicy.loaiChinhSach === 'Chính sách hoàn hủy' && this.newPolicy.mocThoiGianHuyVe && this.newPolicy.mocThoiGianHuyVe.length > 0) {
      let listHtml = '<p>Chính sách hủy vé được quy định rõ ràng nhằm đảm bảo quyền lợi cho cả khách hàng và nhà xe:</p><ol class="policy-list">';
      const sortedRules = [...this.newPolicy.mocThoiGianHuyVe].sort((a, b) => b.truocGio - a.truocGio);
      sortedRules.forEach(r => {
        const refundPct = Math.max(0, 100 - r.phiHuy);
        if (r.truocGio > 0) {
          listHtml += `<li>Hủy vé trước ${r.truocGio}h: Hành khách được hoàn lại ${refundPct}% giá vé gốc.</li>`;
        } else {
          listHtml += `<li>Hủy vé sát giờ khởi hành: Hành khách được hoàn lại ${refundPct}% giá vé gốc (Phí hủy ${r.phiHuy}%).</li>`;
        }
      });
      listHtml += '</ol>';
      if (!this.newPolicy.noiDungChinhSach.includes('<ol')) {
        this.newPolicy.noiDungChinhSach = listHtml + this.newPolicy.noiDungChinhSach;
      }
    }

    const todayISO = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayFull = `${todayISO} ${nowHHMM}`;

    const policyToSave: Policy = {
      maCS: newId,
      tenChinhSach: this.newPolicy.tenChinhSach,
      loaiChinhSach: this.newPolicy.loaiChinhSach!,
      trangThai: 'Đang áp dụng',
      ngayApDung: this.newPolicy.ngayApDung || todayISO,
      capNhatCuoi: todayFull,
      nguoiThucHien: 'Quản trị viên',
      noiDungChinhSach: this.newPolicy.noiDungChinhSach,
      mocThoiGianHuyVe: this.newPolicy.mocThoiGianHuyVe
    };

    this.policies.unshift(policyToSave);
    this.filterData();
    this.closeCreateModal();
    this.showCenteredSuccess(
      'Tạo chính sách thành công',
      `Chính sách ${newId} đã được thêm vào danh sách.`
    );
    this.toastService.showSuccess(`Thêm chính sách ${newId} thành công!`);
  }

  openEditModal(p: Policy) {
    this.editingPolicy = JSON.parse(JSON.stringify(p));
    this.editFormSubmitted = false;
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingPolicy = null;
    this.cdr.detectChanges();
  }

  saveEditPolicy() {
    this.editFormSubmitted = true;
    if (!this.editingPolicy?.tenChinhSach?.trim()) {
      this.toastService.showError('Vui lòng nhập tên chính sách');
      return;
    }
    if (!this.editingPolicy?.loaiChinhSach?.trim()) {
      this.toastService.showError('Vui lòng chọn loại chính sách');
      return;
    }
    if (!this.editingPolicy?.noiDungChinhSach?.trim()) {
      this.toastService.showError('Vui lòng nhập nội dung chính sách');
      return;
    }

    if (this.editingPolicy.loaiChinhSach === 'Chính sách hoàn hủy' && this.editingPolicy.mocThoiGianHuyVe && this.editingPolicy.mocThoiGianHuyVe.length > 0) {
      let listHtml = '<p>Chính sách hủy vé được quy định rõ ràng nhằm đảm bảo quyền lợi cho cả khách hàng và nhà xe:</p><ol class="policy-list">';
      const sortedRules = [...this.editingPolicy.mocThoiGianHuyVe].sort((a, b) => b.truocGio - a.truocGio);
      sortedRules.forEach(r => {
        const refundPct = Math.max(0, 100 - r.phiHuy);
        if (r.truocGio > 0) {
          listHtml += `<li>Hủy vé trước ${r.truocGio}h: Hành khách được hoàn lại ${refundPct}% giá vé gốc.</li>`;
        } else {
          listHtml += `<li>Hủy vé sát giờ khởi hành: Hành khách được hoàn lại ${refundPct}% giá vé gốc (Phí hủy ${r.phiHuy}%).</li>`;
        }
      });
      listHtml += '</ol>';
      if (!this.editingPolicy.noiDungChinhSach.includes('<ol')) {
        this.editingPolicy.noiDungChinhSach = listHtml + this.editingPolicy.noiDungChinhSach;
      }
    }

    const idx = this.policies.findIndex(p => p.maCS === this.editingPolicy!.maCS);
    if (idx !== -1) {
      const original = this.policies[idx];
      const originalRules = original.mocThoiGianHuyVe || [];
      const currentRules = this.editingPolicy.mocThoiGianHuyVe || [];
      let rulesChanged = originalRules.length !== currentRules.length;
      if (!rulesChanged) {
        rulesChanged = originalRules.some((r, i) => r.truocGio !== currentRules[i].truocGio || r.phiHuy !== currentRules[i].phiHuy);
      }

      const hasChanged =
        original.tenChinhSach !== this.editingPolicy.tenChinhSach ||
        original.loaiChinhSach !== this.editingPolicy.loaiChinhSach ||
        original.trangThai !== this.editingPolicy.trangThai ||
        original.ngayApDung !== this.editingPolicy.ngayApDung ||
        original.noiDungChinhSach !== this.editingPolicy.noiDungChinhSach ||
        rulesChanged;

      if (!hasChanged) {
        this.toastService.showError('Không có dữ liệu nào thay đổi');
        return;
      }

      const todayISO = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayFull = `${todayISO} ${nowHHMM}`;

      this.editingPolicy.capNhatCuoi = todayFull;
      const policyCode = this.editingPolicy.maCS;
      this.policies[idx] = { ...this.editingPolicy! };
      this.filterData();
      this.closeEditModal();
      this.showCenteredSuccess(
        'Cập nhật thành công',
        `Chính sách ${policyCode} đã được lưu thông tin mới.`
      );
      this.toastService.showSuccess(`Cập nhật chính sách ${policyCode} thành công!`);
    }
  }

  // --- LOCK CONFIRMATION MODAL ACTIONS ---
  openLockConfirmModal() {
    if (this.editingPolicy) {
      this.showLockConfirmModal = true;
      this.cdr.detectChanges();
    }
  }

  closeLockConfirmModal() {
    this.showLockConfirmModal = false;
    this.cdr.detectChanges();
  }

  confirmTogglePolicyStatus() {
    if (this.editingPolicy) {
      const nextStatus = this.editingPolicy.trangThai === 'Đang áp dụng' ? 'Đã khóa' : 'Đang áp dụng';
      const todayISO = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayFull = `${todayISO} ${nowHHMM}`;

      // Update state in real-time
      this.editingPolicy.trangThai = nextStatus;
      this.editingPolicy.capNhatCuoi = todayFull;

      const idx = this.policies.findIndex(p => p.maCS === this.editingPolicy!.maCS);
      if (idx !== -1) {
        this.policies[idx] = {
          ...this.editingPolicy
        };
        this.filterData();
      }

      const policyCode = this.editingPolicy.maCS;
      this.closeLockConfirmModal();
      this.toastService.showSuccess(`Chính sách ${policyCode} đã chuyển sang "${nextStatus}"`);
    }
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }
    this.cdr.detectChanges();
  }

  private showCenteredSuccess(title: string, body: string) {
    this.successMessageTitle = title;
    this.successMessageBody = body;
    this.showSuccessModal = true;
    this.cdr.detectChanges();

    if (this.successTimer) {
      clearTimeout(this.successTimer);
    }

    this.successTimer = setTimeout(() => this.closeSuccessModal(), 2000);
  }
}
