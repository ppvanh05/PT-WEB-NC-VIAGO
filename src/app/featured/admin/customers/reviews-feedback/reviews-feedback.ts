import { SidebarStateService } from '../../../../core/services/sidebar-state.service';
import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  XacThuc?: 'thap' | 'trung-binh' | 'cao' | '';
  BienSoXe: string;
  GioKhoiHanh: string;
  TaiXe: string;
  LichSuLoiTaiXe: string;
  SoFeedbackCungChuyen: number;
  SlaTimeLimit: string; // ISO string
}

interface TieuChiDanhGia {
  label: string;
  score: number;
}

type CheDoXuLy = 'tat-ca' | 'can-tra-loi' | 'danh-gia-thap';
type LocTrangThaiDonGian = 'tat-ca' | 'chua-xu-ly' | 'da-xu-ly';

@Component({
  selector: 'app-reviews-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, Badge, Pagination, ModalComponent],
  templateUrl: './reviews-feedback.html',
  styleUrls: ['./reviews-feedback.css']
})
export class ReviewsFeedback implements OnInit {
  private readonly TuKhoaCam = ['lừa đảo', 'chửi thề', 'thô lỗ', 'vô trách nhiệm', 'chửi bậy', 'dm', 'clgt', 'mất dạy'];

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

  constructor(private sidebarState: SidebarStateService) {}

  ngOnInit() {
    if (window.innerWidth < 768) this.sidebarState.collapse();
    this.TaiDuLieu();
    // Auto-select first item
    const currentList = this.DanhSachLoc();
    if (currentList.length > 0) {
      this.ChonDanhGia(currentList[0]);
    }
  }

  ToggleLocSao(sao: number) {
    this.LocSao.update(prev => ({
      ...prev,
      [sao]: !prev[sao]
    }));
  }

  // Automatic calculation helper for workflow status and urgency level
  tinhToanTuDong(item: DanhGia): DanhGia {
    const sum =
      item.DiemAnToan +
      item.DiemSachSe +
      item.DiemThaiDo +
      item.DiemDungGio +
      item.DiemThongTin +
      item.DiemTienNghi;
    item.SoSao = Math.round((sum / 6) * 10) / 10;

    // Urgency calculation:
    const hasNegativeKeywords = this.CoTuKhoaTieuCuc(item.NoiDungDanhGia);
    let mucDo: 'thap' | 'trung-binh' | 'cao' = 'thap';
    if (item.SoSao <= 2 || item.TreGio || hasNegativeKeywords) {
      mucDo = 'cao';
    } else if (item.SoSao === 3) {
      mucDo = 'trung-binh';
    }

    const trangThai =
      item.TrangThaiXuLy === 'da-xong' ||
      item.TrangThaiXuLy === 'dong' ||
      (item.PhanHoi && item.PhanHoi.trim())
        ? 'da-xong'
        : 'moi';
    return {
      ...item,
      MucDoKhanCap: mucDo,
      TrangThaiXuLy: trangThai,
      TrangThaiPhanHoi: item.PhanHoi?.trim() ? 'DaPhanHoi' : 'ChuaPhanHoi'
    };
  }

  private TaiDuLieu() {
    const DuLieuLuu = localStorage.getItem('viago_danh_gia_cskh');
    if (DuLieuLuu) {
      try {
        const parsed = JSON.parse(DuLieuLuu);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((item: any, index: number) => this.tinhToanTuDong(this.ChuanHoaDanhGia(item, index)));
          this.DanhSachDanhGia.set(mapped);
          this.LuuDuLieu(mapped);
          return;
        }
      } catch (e) {
        console.error('Lỗi parse dữ liệu', e);
      }
    }

    const DuLieuMau: Partial<DanhGia>[] = [
      {
        MaDanhGia: 'DG-001',
        HoTenKhachHang: 'Nguyễn Văn Hùng',
        SoDienThoai: '0912345678',
        MaLichTrinh: 'TRIP-3021',
        TenTuyenXe: 'Sài Gòn - Đà Lạt',
        SoSao: 5,
        NoiDungDanhGia: 'Xe chạy rất êm, sạch sẽ, xuất phát đúng giờ. Tài xế nói chuyện lịch sự, phụ xe nhiệt tình hỗ trợ khuân vác hành lý.',
        ThoiGianDanhGia: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 mins ago
        TrangThai: 'hien-thi',
        PhanHoi: 'Cảm ơn anh Hùng đã tin tưởng lựa chọn dịch vụ của VIAGO!',
        ThoiGianPhanHoi: new Date().toISOString(),
        TenNhanVienPhanHoi: 'Nguyễn Thị Lan (CSKH)',
        TrangThaiXuLy: 'da-xong',
        MucDoKhanCap: 'thap',
        BienSoXe: '51B-123.45',
        GioKhoiHanh: '08:30 AM',
        TaiXe: 'Trần Văn Hoàng',
        LichSuLoiTaiXe: 'Không có lỗi trong 30 ngày qua',
        SoFeedbackCungChuyen: 0,
        SlaTimeLimit: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
        GhiChuNoiBo: 'Khách hàng thân thiết VIP. Đã phản hồi đầy đủ.',
        DiemAnToan: 5, DiemSachSe: 5, DiemThaiDo: 5, DiemDungGio: 5, DiemThongTin: 5, DiemTienNghi: 5 
      },
      {
        MaDanhGia: 'DG-002',
        HoTenKhachHang: 'Trần Thị Mai',
        SoDienThoai: '0987654321',
        MaLichTrinh: 'TRIP-4015',
        TenTuyenXe: 'Đà Nẵng - Quy Nhơn',
        SoSao: 3.2,
        NoiDungDanhGia: 'Xe sạch nhưng điều hòa hơi lạnh và không có chăn mỏng. Hy vọng nhà xe bổ sung chăn cho hành khách đi đêm.',
        ThoiGianDanhGia: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
        TrangThai: 'hien-thi',
        TrangThaiXuLy: 'dang-xu-ly',
        MucDoKhanCap: 'trung-binh',
        BienSoXe: '43B-998.12',
        GioKhoiHanh: '21:00 PM',
        TaiXe: 'Lê Văn Tám',
        LichSuLoiTaiXe: '1 lần quên bật điều hòa cho khách',
        SoFeedbackCungChuyen: 1,
        SlaTimeLimit: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // Overdue by 15 mins
        GhiChuNoiBo: 'Đang chờ bộ phận kho bổ sung mền đệm chuyến sau.',
        TagNguyenNhan: 'van-hanh',
        XacThuc: 'cao',
        DiemAnToan: 4, DiemSachSe: 3.5, DiemThaiDo: 3, DiemDungGio: 3, DiemThongTin: 2.5, DiemTienNghi: 3 
      },
      {
        MaDanhGia: 'DG-003',
        HoTenKhachHang: 'Phạm Minh Tuấn',
        SoDienThoai: '0905112233',
        MaLichTrinh: 'TRIP-1022',
        TenTuyenXe: 'Hà Nội - Sapa',
        SoSao: 1.3,
        NoiDungDanhGia: 'Tài xế chạy ẩu, lạng lách làm tôi bị say xe dữ dội. Nhân viên có thái độ cằn nhằn khi tôi xin thêm túi nôn.',
        ThoiGianDanhGia: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
        TrangThai: 'hien-thi',
        TrangThaiXuLy: 'moi',
        MucDoKhanCap: 'cao',
        TreGio: true,
        BienSoXe: '29B-456.78',
        GioKhoiHanh: '14:30 PM',
        TaiXe: 'Vũ Quốc Huy',
        LichSuLoiTaiXe: '2 lần chạy quá tốc độ, 1 lần bị phạt thái độ phục vụ',
        SoFeedbackCungChuyen: 3,
        SlaTimeLimit: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
        TagNguyenNhan: 'tai-xe',
        XacThuc: 'cao',
        DiemAnToan: 1.0, DiemSachSe: 2.0, DiemThaiDo: 1.0, DiemDungGio: 1.0, DiemThongTin: 1.5, DiemTienNghi: 1.0 
      },
      {
        MaDanhGia: 'DG-004',
        HoTenKhachHang: 'Lê Hoàng Long',
        SoDienThoai: '0935998877',
        MaLichTrinh: 'TRIP-2022',
        TenTuyenXe: 'Sài Gòn - Nha Trang',
        SoSao: 4,
        NoiDungDanhGia: 'Chất lượng xe tốt, giường nằm massage êm ái. Ghế sạc điện thoại hoạt động tốt. Sẽ tiếp tục ủng hộ nhà xe.',
        ThoiGianDanhGia: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        TrangThai: 'hien-thi',
        PhanHoi: 'Chào anh Long, cảm ơn phản hồi tích cực của anh. Hân hạnh được phục vụ!',
        ThoiGianPhanHoi: new Date().toISOString(),
        TenNhanVienPhanHoi: 'Nguyễn Thị Lan (CSKH)',
        TrangThaiXuLy: 'dong',
        MucDoKhanCap: 'thap',
        BienSoXe: '51B-888.99',
        GioKhoiHanh: '22:00 PM',
        TaiXe: 'Đỗ Minh Đức',
        LichSuLoiTaiXe: 'Không có lỗi',
        SoFeedbackCungChuyen: 0,
        SlaTimeLimit: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
        DiemAnToan: 4, DiemSachSe: 4, DiemThaiDo: 4, DiemDungGio: 4, DiemThongTin: 4, DiemTienNghi: 4 
      },
      {
        MaDanhGia: 'DG-005',
        HoTenKhachHang: 'Nguyễn Bích Vy',
        SoDienThoai: '0977888999',
        MaLichTrinh: 'TRIP-3055',
        TenTuyenXe: 'Cần Thơ - Sài Gòn',
        SoSao: 2,
        NoiDungDanhGia: 'Xe xuất phát trễ 30 phút so với giờ hẹn làm lỡ công việc của tôi. Nhà xe cần cải thiện độ chính xác giờ giấc. Nhân viên bỏ khách ở trạm xăng.',
        ThoiGianDanhGia: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
        TrangThai: 'hien-thi',
        TrangThaiXuLy: 'moi',
        MucDoKhanCap: 'cao',
        TreGio: true,
        BienSoXe: '65B-112.23',
        GioKhoiHanh: '16:00 PM',
        TaiXe: 'Đặng Ngọc Sơn',
        LichSuLoiTaiXe: '3 lần khởi hành trễ lịch trình quy định',
        SoFeedbackCungChuyen: 2,
        SlaTimeLimit: new Date(Date.now() + 1000 * 60 * 25).toISOString(),
        DiemAnToan: 2.5, DiemSachSe: 2.0, DiemThaiDo: 2.0, DiemDungGio: 1.0, DiemThongTin: 2.5, DiemTienNghi: 2.0 
      }
    ];

    const mappedMau = DuLieuMau.map((item, index) => this.tinhToanTuDong(this.ChuanHoaDanhGia(item, index)));
    this.DanhSachDanhGia.set(mappedMau);
    this.LuuDuLieu(mappedMau);
  }

  private LuuDuLieu(ds: DanhGia[]) {
    localStorage.setItem('viago_danh_gia_cskh', JSON.stringify(ds.map((item, index) => this.ChuanHoaDanhGia(item, index))));
  }

  private ChuanHoaDanhGia(raw: any, index: number): DanhGia {
    const maDanhGia = String(raw?.MaDanhGia ?? `DG-${String(index + 1).padStart(3, '0')}`);
    const phanHoi = raw?.PhanHoi ? String(raw.PhanHoi) : undefined;
    const diemCu = raw?.ChiTietTieuChi ?? {};

    return {
      ...raw,
      MaDanhGia: maDanhGia,
      MaVe: String(raw?.MaVe ?? `VE-DG-${String(index + 1).padStart(3, '0')}`),
      MaKhachHang: String(raw?.MaKhachHang ?? this.TaoMaKhachHang(raw?.SoDienThoai ?? '')),
      HoTenKhachHang: String(raw?.HoTenKhachHang ?? raw?.TenKhachHang ?? ''),
      SoDienThoai: String(raw?.SoDienThoai ?? ''),
      MaLichTrinh: String(raw?.MaLichTrinh ?? raw?.MaChuyenXe ?? ''),
      TenTuyenXe: String(raw?.TenTuyenXe ?? raw?.TuyenXe ?? ''),
      SoSao: Number(raw?.SoSao ?? 0),
      NoiDungDanhGia: String(raw?.NoiDungDanhGia ?? raw?.NoiDung ?? ''),
      ThoiGianDanhGia: String(raw?.ThoiGianDanhGia ?? raw?.ThoiGianTao ?? new Date().toISOString()),
      TrangThaiPhanHoi: raw?.TrangThaiPhanHoi ?? (phanHoi ? 'DaPhanHoi' : 'ChuaPhanHoi'),
      DiemAnToan: Number(raw?.DiemAnToan ?? diemCu.AnToan ?? raw?.SoSao ?? 0),
      DiemSachSe: Number(raw?.DiemSachSe ?? diemCu.SachSe ?? raw?.SoSao ?? 0),
      DiemThaiDo: Number(raw?.DiemThaiDo ?? diemCu.NhanVien ?? raw?.SoSao ?? 0),
      DiemDungGio: Number(raw?.DiemDungGio ?? diemCu.DungGio ?? raw?.SoSao ?? 0),
      DiemThongTin: Number(raw?.DiemThongTin ?? diemCu.ThongTin ?? raw?.SoSao ?? 0),
      DiemTienNghi: Number(raw?.DiemTienNghi ?? diemCu.TienNghi ?? raw?.SoSao ?? 0),
      TrangThai: raw?.TrangThai ?? 'hien-thi',
      PhanHoi: phanHoi,
      ThoiGianPhanHoi: raw?.ThoiGianPhanHoi,
      TenNhanVienPhanHoi: raw?.TenNhanVienPhanHoi,
      TrangThaiXuLy: raw?.TrangThaiXuLy ?? 'moi',
      MucDoKhanCap: raw?.MucDoKhanCap ?? 'thap',
      TreGio: raw?.TreGio,
      GhiChuNoiBo: raw?.GhiChuNoiBo,
      TagNguyenNhan: raw?.TagNguyenNhan ?? '',
      XacThuc: raw?.XacThuc ?? '',
      BienSoXe: String(raw?.BienSoXe ?? ''),
      GioKhoiHanh: String(raw?.GioKhoiHanh ?? raw?.GioChay ?? ''),
      TaiXe: String(raw?.TaiXe ?? ''),
      LichSuLoiTaiXe: String(raw?.LichSuLoiTaiXe ?? ''),
      SoFeedbackCungChuyen: Number(raw?.SoFeedbackCungChuyen ?? 0),
      SlaTimeLimit: String(raw?.SlaTimeLimit ?? new Date().toISOString())
    };
  }

  private TaoMaKhachHang(sdt: string) {
    const digits = sdt.replace(/\D/g, '').slice(-8);
    return `KH${digits || '00000000'}`;
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

    let lowestAvg = 5.0;
    let chuyenXeTeNhat = 'Không có';
    
    Object.keys(tripScores).forEach(maChuyen => {
      const avg = tripScores[maChuyen].total / tripScores[maChuyen].count;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        chuyenXeTeNhat = maChuyen;
      }
    });

    const labelChuyenXeTeNhat = chuyenXeTeNhat !== 'Không có' ? `${chuyenXeTeNhat} (${lowestAvg.toFixed(1)}★)` : 'Không có';

    return { TongSo, Moi, DangXuLy, DaXong, chuyenXeTeNhat: labelChuyenXeTeNhat };
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

  // Ghi nhật ký lịch sử hệ thống (Activity Log)
  private GhiLog(HanhDong: string, ChiTiet: string) {
    const LogCu = localStorage.getItem('viago_activity_log');
    let DanhSachLog = [];
    if (LogCu) {
      try {
        DanhSachLog = JSON.parse(LogCu);
      } catch (e) {
        console.error('Lỗi parse log', e);
      }
    }
    DanhSachLog.unshift({
      ThoiGian: new Date().toISOString(),
      NguoiThucHien: 'Nhân viên CSKH',
      HanhDong,
      ChiTiet
    });
    localStorage.setItem('viago_activity_log', JSON.stringify(DanhSachLog));
  }

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
    this.HienModalPhanHoi.set(false);
  }

  DatTrangThaiXuLy(dg: DanhGia, trangThai: DanhGia['TrangThaiXuLy']) {
    const CapNhat = this.DanhSachDanhGia().map(item => {
      if (item.MaDanhGia !== dg.MaDanhGia) return item;
      const updated = { ...item, TrangThaiXuLy: trangThai };
      if (this.DanhGiaDuocChon()?.MaDanhGia === dg.MaDanhGia) {
        this.DanhGiaDuocChon.set(updated);
      }
      return updated;
    });

    this.DanhSachDanhGia.set(CapNhat);
    this.LuuDuLieu(CapNhat);
    this.HienToast('Đã cập nhật trạng thái xử lý.', 'thanh-cong');
  }

  // Lưu Ghi chú Nội bộ & Tags nguyên nhân & Mức độ xác thực
  LuuGhiChuCskh(dg: DanhGia, note: string, tag: string, xacThuc: string) {
    const CapNhat = this.DanhSachDanhGia().map(item => {
      if (item.MaDanhGia === dg.MaDanhGia) {
        let updated: DanhGia = {
          ...item,
          GhiChuNoiBo: note,
          TagNguyenNhan: tag as any,
          XacThuc: xacThuc as any
        };
        // Auto-recalculate workflow status and urgency
        updated = this.tinhToanTuDong(updated);
        if (this.DanhGiaDuocChon()?.MaDanhGia === dg.MaDanhGia) {
          this.DanhGiaDuocChon.set(updated);
        }
        return updated;
      }
      return item;
    });
    this.DanhSachDanhGia.set(CapNhat);
    this.LuuDuLieu(CapNhat);
    this.HienToast('Đã lưu thông tin nội bộ thành công!', 'thanh-cong');
  }

  // Phản hồi nhanh - Macro button auto-fill
  CapNhatNoiBo(dg: DanhGia, changes: Partial<Pick<DanhGia, 'GhiChuNoiBo' | 'TagNguyenNhan' | 'XacThuc'>>) {
    const CapNhat = this.DanhSachDanhGia().map(item => {
      if (item.MaDanhGia !== dg.MaDanhGia) return item;

      let updated: DanhGia = {
        ...item,
        ...changes
      };
      updated = this.tinhToanTuDong(updated);

      if (this.DanhGiaDuocChon()?.MaDanhGia === dg.MaDanhGia) {
        this.DanhGiaDuocChon.set(updated);
      }
      return updated;
    });

    this.DanhSachDanhGia.set(CapNhat);
    this.LuuDuLieu(CapNhat);
  }

  ApDungPhanHoiNhanh(text: string) {
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

    this.NoiDungPhanHoi.set(noiDung.slice(0, 500));
  }

  // Lưu phản hồi trực tiếp (inline, không qua modal)
  LuuPhanHoiTrucTiep(dg: DanhGia): boolean {
    const NoiDungDanhGia = this.NoiDungPhanHoi().trim();
    if (NoiDungDanhGia.length > 500) {
      this.HienToast('Nội dung phản hồi không được vượt quá 500 ký tự.', 'loi');
      return false;
    }

    const CapNhat = this.DanhSachDanhGia().map(item => {
      if (item.MaDanhGia === dg.MaDanhGia) {
        this.GhiLog(
          'Lưu phản hồi trực tiếp',
          `Mã: ${item.MaDanhGia}, Nội dung: ${NoiDungDanhGia}`
        );
        let updated: DanhGia = {
          ...item,
          PhanHoi: NoiDungDanhGia || undefined,
          ThoiGianPhanHoi: NoiDungDanhGia ? new Date().toISOString() : undefined,
          TenNhanVienPhanHoi: NoiDungDanhGia ? 'Nhân viên CSKH' : undefined,
          TrangThaiXuLy: NoiDungDanhGia ? 'da-xong' : 'moi'
        };
        // Auto recalculate status and urgency
        updated = this.tinhToanTuDong(updated);
        if (this.DanhGiaDuocChon()?.MaDanhGia === dg.MaDanhGia) {
          this.DanhGiaDuocChon.set(updated);
        }
        return updated;
      }
      return item;
    });

    this.DanhSachDanhGia.set(CapNhat);
    this.LuuDuLieu(CapNhat);
    this.HienToast(NoiDungDanhGia ? 'Đã gửi phản hồi thành công!' : 'Đã xóa phản hồi!', 'thanh-cong');
    this.HienModalPhanHoi.set(false);
    return true;
  }

  LuuPhanHoiVaChonTiep(dg: DanhGia) {
    if (!this.LuuPhanHoiTrucTiep(dg)) return;

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

  XacNhanXoaPhanHoi() {
    const target = this.PhanHoiMuonXoa();
    if (!target) return;
    this.PhanHoiMuonXoa.set(null);
    this.NoiDungPhanHoi.set('');
    this.LuuPhanHoiTrucTiep(target);
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
    this.DanhGiaMuonAn.set(DanhGia);
    this.HienModalXacNhanAn.set(true);
  }

  DongModalXacNhanAn() {
    this.HienModalXacNhanAn.set(false);
    this.DanhGiaMuonAn.set(null);
  }

  XacNhanDaoTrangThai() {
    const target = this.DanhGiaMuonAn();
    if (!target) return;

    const CapNhat = this.DanhSachDanhGia().map(dg => {
      if (dg.MaDanhGia === target.MaDanhGia) {
        const TrangThaiMoi: 'hien-thi' | 'an' = dg.TrangThai === 'hien-thi' ? 'an' : 'hien-thi';
        this.HienToast(
          `Đã ${TrangThaiMoi === 'an' ? 'ẩn' : 'hiển thị lại'} đánh giá của ${dg.HoTenKhachHang}`,
          'thanh-cong'
        );
        this.GhiLog(
          `${TrangThaiMoi === 'an' ? 'Ẩn' : 'Hiển thị'} đánh giá`,
          `Mã đánh giá: ${dg.MaDanhGia}, Khách: ${dg.HoTenKhachHang}`
        );
        const updated = { ...dg, TrangThai: TrangThaiMoi };
        if (this.DanhGiaDuocChon()?.MaDanhGia === target.MaDanhGia) {
          this.DanhGiaDuocChon.set(updated);
        }
        return updated;
      }
      return dg;
    });

    this.DanhSachDanhGia.set(CapNhat);
    this.LuuDuLieu(CapNhat);
    this.DongModalXacNhanAn();
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
    setTimeout(() => this.ThongBaoToast.set(null), 3000);
  }
}


