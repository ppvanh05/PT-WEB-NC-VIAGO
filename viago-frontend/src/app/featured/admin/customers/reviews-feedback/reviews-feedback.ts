import { AdminPageHeader } from '../../../../shared/components/admin-page-header/admin-page-header';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker';
import { SidebarStateService } from '../../../../core/services/sidebar-state.service';
import { Component, OnInit, signal, computed, HostListener, inject } from '@angular/core';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Toast } from '../../../../shared/components/toast/toast';
import { BookingDialog } from '../../booking/booking-dialog';
import { Button } from '../../../../shared/components/button/button';
import { Badge } from '../../../../shared/components/badge/badge';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { ModalComponent } from '../../../../shared/components/modal/modal';

interface DanhGia {
  MaDanhGia: string;
  MaVe: string;
  MaKhachHang: string;
  HoTenKhachHang: string;
  SoDienThoai: string;
  MaLichTrinh: string;
  TenTuyenXe: string;
  SoSao: number;
  NoiDungDanhGia: string;
  ThoiGianDanhGia: string;
  TrangThaiPhanHoi: 'ChuaPhanHoi' | 'DaPhanHoi';
  DiemAnToan: number;
  DiemSachSe: number;
  DiemThaiDo: number;
  DiemDungGio: number;
  DiemThongTin: number;
  DiemTienNghi: number;
  TrangThai: 'hien-thi' | 'an';
  PhanHoi?: string;
  ThoiGianPhanHoi?: string;
  TenNhanVienPhanHoi?: string;

  // CSKH workflow properties
  TrangThaiXuLy: 'moi' | 'dang-xu-ly' | 'da-xong' | 'dong';
  MucDoKhanCap: 'thap' | 'trung-binh' | 'cao';
  TreGio?: boolean;
  GhiChuNoiBo?: string;
  TagNguyenNhan?: 'tai-xe' | 'van-hanh' | 'thoi-tiet' | 'khach-chu-quan' | '';
  BienSoXe: string;
  GioKhoiHanh: string;
  TaiXe: string;
  LichSuLoiTaiXe: string;
  SoFeedbackCungChuyen: number;
  SlaTimeLimit: string; // ISO string
}

/** Dữ liệu GET admin/reviews-feedback (bảng danh_gia). */
interface ApiDanhGia {
  id: string;
  ticketId: string;
  customerId: string | null;
  customerName: string;
  phone: string;
  rating: number;
  content: string;
  createdAt: string;
  criteria: Record<'safety' | 'cleanliness' | 'attitude' | 'punctuality' | 'information' | 'comfort', number | null>;
  visible: boolean;
  reply: { content: string; createdAt: string | null; staffName: string | null } | null;
  processingStatus: DanhGia['TrangThaiXuLy'];
  urgency: 'Cao' | 'TrungBinh' | 'Thap';
  internalNote: string | null;
  causeTag: DanhGia['TagNguyenNhan'] | null;
  slaDeadline: string;
  trip: {
    scheduleId: string;
    route: string;
    departureDate: string;
    departureTime: string;
    plateNumber: string;
    driverName: string;
    late: boolean;
    delayMinutes: number | null;
  };
  sameTripReviewCount: number;
}

const MUC_DO: Record<ApiDanhGia['urgency'], DanhGia['MucDoKhanCap']> = { Cao: 'cao', TrungBinh: 'trung-binh', Thap: 'thap' };

interface TieuChiDanhGia {
  label: string;
  score: number;
}

type CheDoXuLy = 'tat-ca' | 'can-tra-loi' | 'danh-gia-thap';
type LocTrangThaiDonGian = 'tat-ca' | 'chua-xu-ly' | 'da-xu-ly';

@Component({
  selector: 'app-reviews-feedback',
  standalone: true,
  imports: [
    DatePickerComponent,
    Toast,
    BookingDialog,
    CommonModule,
    FormsModule,
    Button,
    Badge,
    Pagination,
    ModalComponent,
    AdminPageHeader,
  ],
  templateUrl: './reviews-feedback.html',
  styleUrls: ['./reviews-feedback.css']
})
export class ReviewsFeedback implements OnInit {

  // State
  DanhSachDanhGia = signal<DanhGia[]>([]);
  TuKhoaTimKiem = signal('');

  // Quick Filter Chips State
  LocTrangThaiXuLy = signal<LocTrangThaiDonGian>('tat-ca');
  LocTuyenXe = signal('tat-ca');
  LocGioKhoiHanh = signal('tat-ca');
  LocNgayTao = signal('');
  LocSao = signal<Record<number, boolean>>({ 1: true, 2: true, 3: true, 4: true, 5: true });
  LocCheDoXuLy = signal<CheDoXuLy>('tat-ca');
  HienDropdownSao = signal(false);
  trangHienTai = signal(1);
  soDongMoiTrang = signal(10);

  // Selection
  DanhGiaDuocChon = signal<DanhGia | null>(null);

  // Modal Phản hồi
  DanhGiaChon = signal<DanhGia | null>(null);
  NoiDungPhanHoi = signal('');
  HienModalPhanHoi = signal(false);
  ThongBaoLoi = signal('');
  DangGuiPhanHoi = signal(false);
  PhanHoiMuonXoa = signal<DanhGia | null>(null);

  // Custom Modal Xác nhận Ẩn
  HienModalXacNhanAn = signal(false);
  DanhGiaMuonAn = signal<DanhGia | null>(null);

  // Toast
  ThongBaoToast = signal<{ NoiDungDanhGia: string; LoaiToast: 'thanh-cong' | 'loi' | 'canh-bao' } | null>(null);

  // Quick replies list
  quickReplies = [
    { label: 'Xin lỗi khách', text: 'Chào anh/chị, VIAGO thành thật xin lỗi vì trải nghiệm không tốt của anh/chị trong chuyến đi. Chúng tôi đã tiếp nhận phản hồi và đang tiến hành xử lý ngay.' },
    { label: 'Đã ghi nhận', text: 'Chào anh/chị, ý kiến đóng góp của anh/chị đã được chuyển đến ban quản trị VIAGO để cải thiện chất lượng dịch vụ tốt hơn.' },
    { label: 'Chuyển vận hành', text: 'Chào anh/chị, phản hồi này đã được gửi trực tiếp đến bộ phận vận hành để kiểm tra và chấn chỉnh kỹ thuật.' },
    { label: 'Tặng Voucher', text: 'VIAGO xin lỗi vì sự cố trên chuyến đi. Chúng tôi xin gửi tặng anh/chị mã giảm giá 15% (VIVAGO15) cho chuyến đi kế tiếp làm bồi thường.' }
  ];

  LabelLocSao = computed(() => {
    const selected = Object.entries(this.LocSao())
      .filter(([_, value]) => value)
      .map(([key, _]) => `${key}★`);
    if (selected.length === 5) return 'Tất cả sao';
    if (selected.length === 0) return 'Chưa chọn sao';
    return selected.join(', ');
  });

  TatCaSaoChecked = computed(() => {
    return Object.values(this.LocSao()).every(v => v);
  });

  tongTrang = computed(() => {
    return Math.max(1, Math.ceil(this.DanhSachLoc().length / this.soDongMoiTrang()));
  });

  trangHopLe = computed(() => {
    return Math.min(Math.max(this.trangHienTai(), 1), this.tongTrang());
  });

  danhSachPhanTrang = computed(() => {
    const start = (this.trangHopLe() - 1) * this.soDongMoiTrang();
    return this.DanhSachLoc().slice(start, start + this.soDongMoiTrang());
  });

  chiSoDauTrang = computed(() => {
    if (this.DanhSachLoc().length === 0) return 0;
    return (this.trangHopLe() - 1) * this.soDongMoiTrang() + 1;
  });

  chiSoCuoiTrang = computed(() => {
    return Math.min(this.trangHopLe() * this.soDongMoiTrang(), this.DanhSachLoc().length);
  });



  ToggleDropdownSao() {
    this.HienDropdownSao.update(v => !v);
  }

  ToggleChonTatCaSao() {
    const tatCaActive = this.TatCaSaoChecked();
    const val = !tatCaActive;
    this.LocSao.set({ 1: val, 2: val, 3: val, 4: val, 5: val });
  }

  @HostListener('document:click')
  DongDropdowns() {
    this.HienDropdownSao.set(false);
  }

  LayTieuChiThap(dg: DanhGia): { ten: string; diem: number }[] {
    return [
      { ten: 'An toàn', diem: dg.DiemAnToan },
      { ten: 'Sạch sẽ', diem: dg.DiemSachSe },
      { ten: 'Thái độ', diem: dg.DiemThaiDo },
      { ten: 'Đúng giờ', diem: dg.DiemDungGio },
      { ten: 'Thông tin', diem: dg.DiemThongTin },
      { ten: 'Tiện nghi', diem: dg.DiemTienNghi }
    ].filter(item => item.diem <= 3);
  }

  private readonly api = inject(AccountsApiService);
  DangTai = signal(true);
  LoiTaiDuLieu = signal('');
  LyDoAn = signal('');
  DanhSachTagNguyenNhan = [
    { value: 'tai-xe', label: 'Tài xế' },
    { value: 'van-hanh', label: 'Vận hành' },
    { value: 'thoi-tiet', label: 'Thời tiết' },
    { value: 'khach-chu-quan', label: 'Khách chủ quan' },
  ];

  constructor(private sidebarState: SidebarStateService) {}

  ngOnInit() {
    if (window.innerWidth < 768) this.sidebarState.collapse();
    void this.TaiDuLieu().then(() => {
      const currentList = this.DanhSachLoc();
      if (currentList.length > 0) this.ChonDanhGia(currentList[0]);
    });
  }

  ToggleLocSao(sao: number) {
    this.LocSao.update(prev => ({
      ...prev,
      [sao]: !prev[sao]
    }));
  }

  /** Tải toàn bộ đánh giá từ DB (admin/reviews-feedback); lọc/sắp xếp làm trên trình duyệt. */
  async TaiDuLieu(): Promise<void> {
    this.DangTai.set(true);
    this.LoiTaiDuLieu.set('');
    try {
      const rows: ApiDanhGia[] = [];
      for (let page = 1; ; page++) {
        const res = await this.api.request<{ items: ApiDanhGia[]; pagination: { totalPages: number } }>(
          `admin/reviews-feedback?page=${page}&pageSize=100&sort=newest`, 'GET', undefined, 'admin');
        rows.push(...res.items);
        if (page >= res.pagination.totalPages || !res.items.length) break;
      }
      const ds = rows.map(r => this.TuApi(r));
      this.DanhSachDanhGia.set(ds);
      const chon = this.DanhGiaDuocChon();
      if (chon) this.DanhGiaDuocChon.set(ds.find(d => d.MaDanhGia === chon.MaDanhGia) ?? null);
    } catch (error) {
      this.LoiTaiDuLieu.set(this.ThongDiepLoi(error, 'Không tải được danh sách đánh giá.'));
      this.HienToast(this.LoiTaiDuLieu(), 'loi');
    } finally {
      this.DangTai.set(false);
    }
  }

  private TuApi(r: ApiDanhGia): DanhGia {
    const diem = (v: number | null) => Number(v ?? r.rating);
    return {
      MaDanhGia: r.id,
      MaVe: r.ticketId,
      MaKhachHang: r.customerId ?? '',
      HoTenKhachHang: r.customerName,
      SoDienThoai: r.phone ?? '',
      MaLichTrinh: r.trip.scheduleId,
      TenTuyenXe: r.trip.route,
      SoSao: r.rating,
      NoiDungDanhGia: r.content,
      ThoiGianDanhGia: r.createdAt,
      TrangThaiPhanHoi: r.reply ? 'DaPhanHoi' : 'ChuaPhanHoi',
      DiemAnToan: diem(r.criteria.safety),
      DiemSachSe: diem(r.criteria.cleanliness),
      DiemThaiDo: diem(r.criteria.attitude),
      DiemDungGio: diem(r.criteria.punctuality),
      DiemThongTin: diem(r.criteria.information),
      DiemTienNghi: diem(r.criteria.comfort),
      TrangThai: r.visible ? 'hien-thi' : 'an',
      PhanHoi: r.reply?.content,
      ThoiGianPhanHoi: r.reply?.createdAt ?? undefined,
      TenNhanVienPhanHoi: r.reply?.staffName ?? undefined,
      TrangThaiXuLy: r.processingStatus,
      MucDoKhanCap: MUC_DO[r.urgency] ?? 'thap',
      TreGio: r.trip.late,
      GhiChuNoiBo: r.internalNote ?? undefined,
      TagNguyenNhan: r.causeTag ?? '',
      BienSoXe: r.trip.plateNumber,
      GioKhoiHanh: r.trip.departureTime,
      TaiXe: r.trip.driverName,
      LichSuLoiTaiXe: r.trip.delayMinutes ? `Trễ ${r.trip.delayMinutes} phút` : '',
      SoFeedbackCungChuyen: r.sameTripReviewCount,
      SlaTimeLimit: r.slaDeadline,
    };
  }

  private ThongDiepLoi(error: unknown, macDinh: string): string {
    return error instanceof Error && error.message ? error.message : macDinh;
  }

  /** Gọi API ghi DB rồi tải lại danh sách để giao diện khớp dữ liệu thật. */
  private async GoiVaTaiLai(path: string, method: 'PUT' | 'PATCH' | 'DELETE', body: unknown, thanhCong: string): Promise<boolean> {
    try {
      await this.api.request(path, method, body, 'admin');
      await this.TaiDuLieu();
      this.HienToast(thanhCong, 'thanh-cong');
      return true;
    } catch (error) {
      this.HienToast(this.ThongDiepLoi(error, 'Không lưu được thay đổi.'), 'loi');
      return false;
    }
  }

  // Computed: Filtered list for CSKH Inbox Left Column
  DanhSachTuyen = computed(() => {
    const routes = this.DanhSachDanhGia().map(dg => dg.TenTuyenXe);
    return Array.from(new Set(routes)).sort((a, b) => a.localeCompare(b));
  });

  DanhSachGioKhoiHanh = computed(() => {
    const tuyen = this.LocTuyenXe();
    const grouped = new Map<string, { gio: string; soLuong: number }>();
    this.DanhSachDanhGia()
      .filter(dg => tuyen === 'tat-ca' || dg.TenTuyenXe === tuyen)
      .forEach(dg => {
        const gio = dg.GioKhoiHanh || 'Chưa có giờ';
        const current = grouped.get(gio) ?? { gio, soLuong: 0 };
        current.soLuong += 1;
        grouped.set(gio, current);
      });

    return Array.from(grouped.values()).sort((a, b) => a.gio.localeCompare(b.gio));
  });

  DanhSachLoc = computed(() => {
    const TuKhoa = this.TuKhoaTimKiem().toLowerCase().trim();
    const TrangThaiXuLy = this.LocTrangThaiXuLy();
    const TenTuyenXe = this.LocTuyenXe();
    const GioKhoiHanh = this.LocGioKhoiHanh();
    const NgayTao = this.LocNgayTao();
    const CheDo = this.LocCheDoXuLy();
    const SaoFilter = this.LocSao();

    return this.DanhSachDanhGia().filter(dg => {
      const KhopTimKiem =
        dg.HoTenKhachHang.toLowerCase().includes(TuKhoa) ||
        dg.MaLichTrinh.toLowerCase().includes(TuKhoa) ||
        dg.NoiDungDanhGia.toLowerCase().includes(TuKhoa) ||
        dg.TenTuyenXe.toLowerCase().includes(TuKhoa) ||
        dg.SoDienThoai.includes(TuKhoa);

      const KhopTrangThaiXuLy =
        TrangThaiXuLy === 'tat-ca' ? true :
        TrangThaiXuLy === 'da-xu-ly' ? this.LaDaXuLy(dg) :
        this.LaChuaXuLy(dg);

      const KhopTuyen = TenTuyenXe === 'tat-ca' ? true : dg.TenTuyenXe === TenTuyenXe;
      const KhopGio = GioKhoiHanh === 'tat-ca' ? true : dg.GioKhoiHanh === GioKhoiHanh;
      const KhopNgay = NgayTao ? dg.ThoiGianDanhGia.slice(0, 10) === NgayTao : true;
      const KhopSao = SaoFilter[Math.round(dg.SoSao)];

      let KhopCheDo = true;
      if (CheDo === 'can-tra-loi') {
        KhopCheDo = this.LaChuaXuLy(dg);
      } else if (CheDo === 'danh-gia-thap') {
        KhopCheDo = dg.SoSao <= 3;
      }

      return KhopTimKiem &&
        KhopTrangThaiXuLy &&
        KhopTuyen &&
        KhopGio &&
        KhopNgay &&
        KhopSao &&
        KhopCheDo;
    }).sort((a, b) => new Date(b.ThoiGianDanhGia).getTime() - new Date(a.ThoiGianDanhGia).getTime());
  });

  ThongKeHangDoi = computed(() => {
    const TatCa = this.DanhSachDanhGia();
    const CanTraLoi = TatCa.filter(dg => this.LaChuaXuLy(dg)).length;
    const DanhGiaThap = TatCa.filter(dg => dg.SoSao <= 3).length;
    return { CanTraLoi, DanhGiaThap };
  });

  // Computed: Mini Insight stats
  ThongKe = computed(() => {
    const TatCa = this.DanhSachDanhGia();
    const TongSo = TatCa.length;
    const Moi = TatCa.filter(dg => this.LaChuaXuLy(dg)).length;
    const DangXuLy = 0;
    const DaXong = TatCa.filter(dg => this.LaDaXuLy(dg)).length;

    // Trip with the lowest average rating
    const tripScores: Record<string, { total: number, count: number }> = {};
    TatCa.forEach(dg => {
      if (dg.MaLichTrinh) {
        if (!tripScores[dg.MaLichTrinh]) {
          tripScores[dg.MaLichTrinh] = { total: 0, count: 0 };
        }
        tripScores[dg.MaLichTrinh].total += dg.SoSao;
        tripScores[dg.MaLichTrinh].count += 1;
      }
    });

    // Chuyến cần cải thiện = chuyến có điểm trung bình ≤ 3★ (cùng ngưỡng với "Đánh giá thấp").
    const chuyenCanCaiThien = Object.entries(tripScores)
      .map(([maChuyen, v]) => ({ maChuyen, diemTB: v.total / v.count, soDanhGia: v.count }))
      .filter(c => c.diemTB <= 3)
      .sort((a, b) => a.diemTB - b.diemTB || b.soDanhGia - a.soDanhGia);
    const SoChuyenCanCaiThien = chuyenCanCaiThien.length;
    const GoiYChuyenCanCaiThien = SoChuyenCanCaiThien
      ? 'Điểm TB ≤ 3★: ' + chuyenCanCaiThien.map(c => `${c.maChuyen} (${c.diemTB.toFixed(1)}★, ${c.soDanhGia} đánh giá)`).join('; ')
      : 'Không có chuyến nào có điểm trung bình ≤ 3★';

    return { TongSo, Moi, DangXuLy, DaXong, SoChuyenCanCaiThien, GoiYChuyenCanCaiThien };
  });

  ThongKeDanhGia = computed(() => {
    const list = this.DanhSachLoc();
    const count = list.length;
    if (count === 0) {
      return {
        trungBinh: 0,
        saoString: '☆☆☆☆☆',
        anToan: 0,
        sachSe: 0,
        nhanVien: 0,
        dungGio: 0,
        thongTin: 0,
        tienNghi: 0
      };
    }

    let totalScore = 0;
    let sumAnToan = 0;
    let sumSachSe = 0;
    let sumNhanVien = 0;
    let sumDungGio = 0;
    let sumThongTin = 0;
    let sumTienNghi = 0;

    list.forEach(dg => {
      totalScore += dg.SoSao;
      sumAnToan += dg.DiemAnToan;
      sumSachSe += dg.DiemSachSe;
      sumNhanVien += dg.DiemThaiDo;
      sumDungGio += dg.DiemDungGio;
      sumThongTin += dg.DiemThongTin;
      sumTienNghi += dg.DiemTienNghi;
    });

    const avg = Math.round((totalScore / count) * 10) / 10;
    const avgAnToan = Math.round((sumAnToan / count) * 10) / 10;
    const avgSachSe = Math.round((sumSachSe / count) * 10) / 10;
    const avgNhanVien = Math.round((sumNhanVien / count) * 10) / 10;
    const avgDungGio = Math.round((sumDungGio / count) * 10) / 10;
    const avgThongTin = Math.round((sumThongTin / count) * 10) / 10;
    const avgTienNghi = Math.round((sumTienNghi / count) * 10) / 10;

    // Generate stars representation
    const starsCount = Math.round(avg);
    const saoString = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

    return {
      trungBinh: avg.toFixed(1),
      saoString,
      anToan: avgAnToan,
      sachSe: avgSachSe,
      nhanVien: avgNhanVien,
      dungGio: avgDungGio,
      thongTin: avgThongTin,
      tienNghi: avgTienNghi
    };
  });

  TieuChiDanhGia = computed<TieuChiDanhGia[]>(() => {
    const stats = this.ThongKeDanhGia();
    return [
      { label: 'An toàn', score: stats.anToan },
      { label: 'Sạch sẽ', score: stats.sachSe },
      { label: 'Nhân viên', score: stats.nhanVien },
      { label: 'Đúng giờ', score: stats.dungGio },
      { label: 'Thông tin', score: stats.thongTin },
      { label: 'Tiện nghi', score: stats.tienNghi }
    ];
  });

  TieuChiCuaDanhGia(dg: DanhGia): TieuChiDanhGia[] {
    return [
      { label: 'An toàn', score: dg.DiemAnToan },
      { label: 'Sạch sẽ', score: dg.DiemSachSe },
      { label: 'Thái độ', score: dg.DiemThaiDo },
      { label: 'Đúng giờ', score: dg.DiemDungGio },
      { label: 'Thông tin', score: dg.DiemThongTin },
      { label: 'Tiện nghi', score: dg.DiemTienNghi }
    ];
  }

  DanhSachSaoCounts = computed(() => {
    const list = this.DanhSachDanhGia();
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    list.forEach(dg => {
      const rounded = Math.round(dg.SoSao);
      if (rounded >= 1 && rounded <= 5) {
        counts[rounded] += 1;
      }
    });
    return counts;
  });

  // Chọn feedback để xem chi tiết bên phải
  ChonDanhGia(dg: DanhGia) {
    this.DanhGiaDuocChon.set(dg);
    this.NoiDungPhanHoi.set(dg.PhanHoi || '');
    this.ThongBaoLoi.set('');
  }

  ChonVaXuLy(dg: DanhGia) {
    this.ChonDanhGia(dg);
    this.HienModalPhanHoi.set(true);
  }

  DongModalPhanHoi() {
    if (this.DangGuiPhanHoi()) return;
    this.HienModalPhanHoi.set(false);
  }

  DatTrangThaiXuLy(dg: DanhGia, trangThai: DanhGia['TrangThaiXuLy']) {
    void this.GoiVaTaiLai(`admin/reviews-feedback/${encodeURIComponent(dg.MaDanhGia)}/workflow`, 'PATCH',
      { processingStatus: trangThai }, 'Đã cập nhật trạng thái xử lý.');
  }

  /** Lưu ghi chú nội bộ / tag nguyên nhân vào DB (cột ghichunoibo, tagnguyennhan). */
  CapNhatNoiBo(dg: DanhGia, changes: Partial<Pick<DanhGia, 'GhiChuNoiBo' | 'TagNguyenNhan'>>) {
    const body: Record<string, string> = {};
    if (changes.GhiChuNoiBo !== undefined) {
      if ((changes.GhiChuNoiBo ?? '').trim() === (dg.GhiChuNoiBo ?? '').trim()) return;
      body['internalNote'] = changes.GhiChuNoiBo.trim();
    }
    if (changes.TagNguyenNhan !== undefined) {
      if (changes.TagNguyenNhan === (dg.TagNguyenNhan ?? '')) return;
      body['causeTag'] = changes.TagNguyenNhan;
    }
    void this.GoiVaTaiLai(`admin/reviews-feedback/${encodeURIComponent(dg.MaDanhGia)}/workflow`, 'PATCH',
      body, 'Đã lưu thông tin nội bộ.');
  }

  ApDungPhanHoiNhanh(text: string) {
    this.ThongBaoLoi.set('');
    this.NoiDungPhanHoi.set(text);
  }

  TaoGoiYPhanHoi(dg: DanhGia) {
    const tieuChiThap = this.LayTieuChiThap(dg)
      .map(item => item.ten.toLowerCase())
      .slice(0, 3);
    const vanDe = tieuChiThap.length > 0 ? ` về ${tieuChiThap.join(', ')}` : '';
    const chuyen = dg.TenTuyenXe ? ` trên tuyến ${dg.TenTuyenXe}` : '';

    let noiDung = '';
    if (dg.SoSao <= 2) {
      noiDung = `Chào anh/chị ${dg.HoTenKhachHang}, VIAGO cảm ơn anh/chị đã dành thời gian phản hồi${chuyen}. Chúng tôi thành thật xin lỗi vì trải nghiệm chưa tốt${vanDe} và sẽ chuyển ngay cho bộ phận vận hành kiểm tra, khắc phục để tránh lặp lại trong các chuyến sau.`;
    } else if (dg.SoSao <= 3) {
      noiDung = `Chào anh/chị ${dg.HoTenKhachHang}, VIAGO cảm ơn anh/chị đã phản hồi${chuyen}. Chúng tôi xin lỗi nếu trải nghiệm vừa qua chưa trọn vẹn${vanDe} và sẽ rà soát lại với bộ phận liên quan để cải thiện chất lượng phục vụ.`;
    } else {
      noiDung = `Chào anh/chị ${dg.HoTenKhachHang}, VIAGO cảm ơn anh/chị đã dành thời gian đánh giá chuyến đi. Phản hồi của anh/chị là động lực để chúng tôi tiếp tục duy trì và cải thiện chất lượng dịch vụ.`;
    }

    this.ThongBaoLoi.set('');
    this.NoiDungPhanHoi.set(noiDung.slice(0, 500));
  }

  // Gửi phản hồi: PUT admin/reviews-feedback/:id/reply (ghi noidungphanhoi, nhân viên, thời gian)
  async GuiPhanHoi(dg: DanhGia): Promise<boolean> {
    if (this.DangGuiPhanHoi()) return false;
    const content = this.NoiDungPhanHoi().trim();
    if (content.length < 10 || content.length > 500) {
      this.ThongBaoLoi.set('Vui lòng nhập phản hồi từ 10–500 ký tự.');
      return false;
    }
    this.ThongBaoLoi.set('');
    this.DangGuiPhanHoi.set(true);
    try {
      const ok = await this.GoiVaTaiLai(`admin/reviews-feedback/${encodeURIComponent(dg.MaDanhGia)}/reply`, 'PUT',
        { content }, 'Đã gửi phản hồi thành công!');
      if (ok) this.HienModalPhanHoi.set(false);
      return ok;
    } finally {
      this.DangGuiPhanHoi.set(false);
    }
  }

  async LuuPhanHoiVaChonTiep(dg: DanhGia) {
    if (!(await this.GuiPhanHoi(dg))) return;

    const next = this.DanhSachLoc().find(item =>
      item.MaDanhGia !== dg.MaDanhGia &&
      this.LaChuaXuLy(item)
    ) || this.DanhSachLoc().find(item => item.MaDanhGia !== dg.MaDanhGia);

    if (next) {
      this.ChonVaXuLy(next);
    }
  }

  // Xóa phản hồi trực tiếp
  XoaPhanHoiTrucTiep(dg: DanhGia) {
    this.PhanHoiMuonXoa.set(dg);
  }

  async XacNhanXoaPhanHoi() {
    const target = this.PhanHoiMuonXoa();
    if (!target) return;
    this.PhanHoiMuonXoa.set(null);
    const ok = await this.GoiVaTaiLai(`admin/reviews-feedback/${encodeURIComponent(target.MaDanhGia)}/reply`, 'DELETE',
      undefined, 'Đã xóa phản hồi!');
    if (ok) this.NoiDungPhanHoi.set('');
  }

  @HostListener('document:keydown.escape')
  DongModalBangEscape() {
    if (this.PhanHoiMuonXoa()) { this.PhanHoiMuonXoa.set(null); return; }
    if (this.HienModalXacNhanAn()) { this.DongModalXacNhanAn(); return; }
    if (this.HienDropdownSao()) { this.HienDropdownSao.set(false); return; }
    if (this.HienModalPhanHoi()) this.DongModalPhanHoi();
  }

  // Mở modal xác nhận Ẩn đánh giá thay vì dùng confirm() mặc định của browser
  YeuCauDaoTrangThai(DanhGia: DanhGia) {
    this.LyDoAn.set('');
    this.DanhGiaMuonAn.set(DanhGia);
    this.HienModalXacNhanAn.set(true);
  }

  DongModalXacNhanAn() {
    this.HienModalXacNhanAn.set(false);
    this.DanhGiaMuonAn.set(null);
  }

  // Ẩn/hiện: PATCH admin/reviews-feedback/:id/visibility (ẩn bắt buộc lý do vi phạm)
  async XacNhanDaoTrangThai() {
    const target = this.DanhGiaMuonAn();
    if (!target) return;
    const an = target.TrangThai === 'hien-thi';
    const reason = this.LyDoAn().trim();
    if (an && reason.length < 5) {
      this.HienToast('Vui lòng nhập lý do ẩn (tối thiểu 5 ký tự).', 'canh-bao');
      return;
    }
    const ok = await this.GoiVaTaiLai(`admin/reviews-feedback/${encodeURIComponent(target.MaDanhGia)}/visibility`, 'PATCH',
      an ? { visible: false, reason } : { visible: true, ...(reason ? { reason } : {}) },
      `Đã ${an ? 'ẩn' : 'hiển thị lại'} đánh giá của ${target.HoTenKhachHang}`);
    if (ok) this.DongModalXacNhanAn();
  }

  // Check if ticket is overdue SLA
  LaDaXuLy(dg: DanhGia): boolean {
    return dg.TrangThaiXuLy === 'da-xong' || dg.TrangThaiXuLy === 'dong';
  }

  LaChuaXuLy(dg: DanhGia): boolean {
    return !this.LaDaXuLy(dg);
  }

  LaSlaTre(dg: DanhGia): boolean {
    if (this.LaDaXuLy(dg)) return false;
    return new Date(dg.SlaTimeLimit) < new Date();
  }

  // Check for negative keyword matching
  CoTuKhoaTieuCuc(NoiDungDanhGia: string): boolean {
    const tuTieuCuc = ['thái độ', 'bỏ khách', 'ồn', 'mùi', 'lạng lách', 'ẩu', 'say xe', 'trễ'];
    return tuTieuCuc.some(tu => NoiDungDanhGia.toLowerCase().includes(tu));
  }

  // Helpers
  getTrangThaiText(val: string): string {
    const mapper: Record<string, string> = {
      'moi': 'Chưa xử lý',
      'dang-xu-ly': 'Chưa xử lý',
      'da-xong': 'Đã xử lý',
      'dong': 'Đã xử lý'
    };
    return mapper[val] || val;
  }

  getSentimentIcon(score: number): string {
    if (score <= 2) return 'Tiêu cực';
    if (score === 3) return 'Trung lập';
    return 'Tích cực';
  }

  CapNhatTuyenXe(value: string) {
    this.LocTuyenXe.set(value);
    this.LocGioKhoiHanh.set('tat-ca');
    this.trangHienTai.set(1);
  }

  ChuyenTrang(page: number) {
    this.trangHienTai.set(Math.min(Math.max(page, 1), this.tongTrang()));
  }

  CapNhatSoDongMoiTrang(value: string) {
    this.soDongMoiTrang.set(Number(value));
    this.trangHienTai.set(1);
  }

  XoaBoLoc() {
    this.TuKhoaTimKiem.set('');
    this.LocTrangThaiXuLy.set('tat-ca');
    this.LocTuyenXe.set('tat-ca');
    this.LocGioKhoiHanh.set('tat-ca');
    this.LocNgayTao.set('');
    this.LocSao.set({ 1: true, 2: true, 3: true, 4: true, 5: true });
    this.LocCheDoXuLy.set('tat-ca');
    this.trangHienTai.set(1);
  }

  DinhDangNgay(ChuoiIso: string): string {
    if (!ChuoiIso) return '';
    return new Date(ChuoiIso).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  TaoMangSao(SoSao: number): number[] {
    return [1, 2, 3, 4, 5];
  }

  StarFill(score: number | string, star: number): number {
    const value = Number(score) || 0;
    return Math.max(0, Math.min(100, (value - (star - 1)) * 100));
  }

  private HienToast(NoiDungDanhGia: string, LoaiToast: 'thanh-cong' | 'loi' | 'canh-bao') {
    this.ThongBaoToast.set({ NoiDungDanhGia, LoaiToast });

  }
}


