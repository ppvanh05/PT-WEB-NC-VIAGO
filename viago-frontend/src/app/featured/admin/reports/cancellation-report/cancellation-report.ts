import { AdminTabs } from '../../../../shared/components/admin-tabs/admin-tabs';
import { AdminPageHeader } from '../../../../shared/components/admin-page-header/admin-page-header';
import { inject } from '@angular/core';
import { Component, OnInit, computed, signal } from '@angular/core';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../shared/components/button/button';
import { Input } from '../../../../shared/components/input/input';
import { Select } from '../../../../shared/components/input/select/select';
import { Badge } from '../../../../shared/components/badge/badge';
import { Toast } from '../../../../shared/components/toast/toast';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker';
import { SidebarStateService } from '../../../../core/services/sidebar-state.service';
import { Pagination } from '../../../../shared/components/pagination/pagination';

type CheDoXemBaoCao = 'bieu-do' | 'danh-sach';
type NguonDat = 'tai-quay' | 'hotline' | 'online';
type TrangThaiDonHang = 'cho-thanh-toan' | 'da-thanh-toan';
type TrangThaiDonHangLoc = TrangThaiDonHang | 'da-huy' | 'tat-ca';
type TrangThaiHoanTien = 'da-hoan' | 'cho-hoan' | 'dang-xu-ly' | 'khong-hoan';
type LoaiXeId = 'limousine' | 'giuong-nam' | 'cabin';
type LoaiGheId = 'giuong-nam' | 'limousine' | 'cabin-don' | 'cabin-doi';
type Tone = 'success' | 'warning' | 'danger' | 'info';

interface XeKhach {
  maXe: string;
  tenXe: string;
  bienSo: string;
  loaiXe: LoaiXeId;
  soCho: number;
}

interface LichSuHuyVe {
  MaLichSuHuy: string;
  MaVe: string;
  MaDonHang: string;
  MaChinhSach: string;
  NguonHuy: 'KhachHang' | 'NhanVienBanVe';
  NguonDat: NguonDat;
  MaKhachHang: string;
  MaNVBanVe: string;
  HoTenNguoiDi: string;
  SdtNguoiDi: string;
  TenTuyenXe: string;
  NgayKhoiHanh: string;
  GioKhoiHanh: string;
  SoGhe: string;
  MaXe: string;
  TenXe: string;
  BienSoXe: string;
  LoaiXe: string;
  LoaiGhe: string;
  TienVeGoc: number;
  TyLePhiHuyApDung: number;
  LePhiHuy: number;
  TienHoanLai: number;
  MaGiaoDichHoan?: string;
  ThoiGianHuy: string;
  ThoiDiemHuyIso?: string;
  LyDoHuy: string;
  TrangThaiGiaoDich: TrangThaiHoanTien;
  TrangThaiDonHang: TrangThaiDonHang;
  DonHangDaHuyToanBo: boolean;
  TongVeTrongDon: number;
  SoVeDaHuyTrongDon: number;
  PhuongThucThanhToan: string;
}

/** Một dòng của GET admin/reports/cancellations (lich_su_huy_ve + hoàn tiền) */
interface ApiCancellation {
  id: string;
  ticketId: string;
  orderId: string;
  customerId: string | null;
  policyId: string | null;
  cancelledBy: string;
  staff: { id: string; name: string } | null;
  channel: string;
  passengerName: string;
  passengerPhone: string;
  route: string;
  departureDate: string;
  departureTime: string;
  seat: string;
  seatType: string | null;
  roomType: string | null;
  vehicle: { id: string; name: string; plateNumber: string; type: string };
  originalPrice: number;
  fee: number;
  refundAmount: number;
  refundTransactionId: string | null;
  refundStatus: 'refunded' | 'pending' | 'processing' | 'failed' | 'none';
  reason: string;
  cancelledAt: string;
  orderStatus: string;
  orderFullyCancelled: boolean;
  ticketsInOrder: number;
  cancelledTicketsInOrder: number;
  paymentMethod: string | null;
}

const REFUND_MAP: Record<ApiCancellation['refundStatus'], TrangThaiHoanTien> = {
  refunded: 'da-hoan',
  processing: 'dang-xu-ly',
  pending: 'cho-hoan',
  failed: 'cho-hoan',
  none: 'khong-hoan',
};

const PAYMENT_LABELS: Record<string, string> = {
  TIEN_MAT: 'Tiền mặt', CHUYEN_KHOAN: 'Chuyển khoản', VIETQR: 'VietQR', VNPAY: 'VNPay', MOMO: 'MoMo', ZALOPAY: 'ZaloPay', THE: 'Thẻ ngân hàng',
};

interface XuHuongHuyTheoNgay {
  date: string;
  label: string;
  count: number;
  refund: number;
  fee: number;
  countPct: number;
}

interface XuHuongLinePoint extends XuHuongHuyTheoNgay {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'middle' | 'end';
  tooltipX: number;
  tooltipY: number;
  shortLabel: string;
  valueLabel: string;
  showLabel: boolean;
}

interface XuHuongLineChart {
  points: XuHuongLinePoint[];
  linePoints: string;
  areaPoints: string;
  yTicks: Array<{ value: number; y: number; label: string }>;
  maxCount: number;
  totalCount: number;
}

interface TrangThaiHoanTienChart {
  key: TrangThaiHoanTien;
  label: string;
  count: number;
  amount: number;
  pct: number;
  tone: Exclude<Tone, 'info'>;
}

interface TrangThaiHoanTienSegment extends TrangThaiHoanTienChart {
  offset: number;
}

interface MucPhiHuyChart {
  key: string;
  label: string;
  count: number;
  fee: number;
  pct: number;
  tone: Exclude<Tone, 'info'>;
}

interface TuyenRiskChart {
  route: string;
  sold: number;
  canceled: number;
  rate: number;
  refund: number;
  fee: number;
  ratePct: number;
  priorityScore: number;
  isSmallSample: boolean;
  tone: Tone;
}

interface ThoiDiemHuyChart {
  key: string;
  label: string;
  help: string;
  count: number;
  pct: number;
  barPct: number;
  refund: number;
  tone: Exclude<Tone, 'info'>;
}

interface TacDongDoanhThu {
  doanhThuHuy: number;
  tienHoan: number;
  phiGiuLai: number;
  tienChoHoan: number;
  tyLeGiuLai: number;
  tyLeDaHoan: number;
  giaTriTrungBinh: number;
}

interface DoanhThuStackSegment {
  key: string;
  label: string;
  value: number;
  pct: number;
  tone: 'refund' | 'pending' | 'fee';
}

interface CanhBaoQuanTri {
  tone: Tone;
  title: string;
  detail: string;
  value: string;
}

interface NguonDatChart {
  key: NguonDat;
  label: string;
  count: number;
  pct: number;
  refund: number;
}

interface LoaiXeChart {
  key: string;
  label: string;
  count: number;
  pct: number;
  refund: number;
  fee: number;
  tone: Tone;
}

@Component({
  selector: 'app-cancellation-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Pagination,
    Button,
    Input,
    Select,
    Badge,
    Toast,
    DatePickerComponent,
    AdminPageHeader,
    AdminTabs,
  ],
  templateUrl: './cancellation-report.html',
  styleUrl: './cancellation-report.css'
})
export class CancellationReport implements OnInit {
  private readonly tuyenRiskLimit = 6;

  readonly loaiXeOptions: Array<{ value: LoaiXeId | 'tat-ca'; label: string }> = [
    { value: 'tat-ca', label: 'Tất cả loại xe' },
    { value: 'limousine', label: 'Limousine' },
    { value: 'giuong-nam', label: 'Giường nằm' },
    { value: 'cabin', label: 'Cabin' }
  ];

  readonly loaiGheOptions: Array<{ value: LoaiGheId | 'tat-ca'; label: string }> = [
    { value: 'tat-ca', label: 'Tất cả loại ghế' },
    { value: 'limousine', label: 'Ghế VIP' },
    { value: 'giuong-nam', label: 'Giường đơn' },
    { value: 'cabin-don', label: 'Cabin đơn' },
    { value: 'cabin-doi', label: 'Cabin đôi' }
  ];

  private readonly api = inject(AccountsApiService);
  dangTai = signal(false);
  private readonly tenNhanVien = new Map<string, string>();

  danhSachHuy = signal<LichSuHuyVe[]>([]);
  totalBookingsCount = signal(0);
  tongVeTheoTuyen = signal<Record<string, number>>({});

  tuKhoa = signal('');
  locTuyen = signal('tat-ca');
  locLyDo = signal('tat-ca');
  locTrangThai = signal('tat-ca');
  locTrangThaiDonHang = signal<TrangThaiDonHangLoc>('tat-ca');
  locTuNgay = signal('');
  locDenNgay = signal('');
  locNguonDat = signal('tat-ca');
  locNhanVien = signal('tat-ca');
  locLoaiXe = signal<LoaiXeId | 'tat-ca'>('tat-ca');
  locLoaiGhe = signal<LoaiGheId | 'tat-ca'>('tat-ca');
  cheDoXem = signal<CheDoXemBaoCao>('bieu-do');

  trangHienTai = signal(1);
  soDongMoiTrang = signal(8);
  toast = signal<{ msg: string; type: 'success' | 'danger' } | null>(null);

  /** Lý do hủy lấy từ dữ liệu thật */
  get reasonList(): string[] {
    return Array.from(new Set(this.danhSachHuy().map(v => v.LyDoHuy).filter(Boolean)));
  }

  readonly nguonDatOptions: Array<{ value: NguonDat | 'tat-ca'; label: string }> = [
    { value: 'tat-ca', label: 'Tất cả nguồn' },
    { value: 'tai-quay', label: 'Tại quầy' },
    { value: 'hotline', label: 'Hotline' },
    { value: 'online', label: 'Online' }
  ];

  tuyenList = computed(() => {
    const routes = [
      ...Object.keys(this.tongVeTheoTuyen()),
      ...this.danhSachHuy().map(v => v.TenTuyenXe)
    ].filter(Boolean);
    return ['tat-ca', ...Array.from(new Set(routes))];
  });

  nhanVienList = computed(() => {
    const staff = this.danhSachHuy().map(v => v.MaNVBanVe).filter(Boolean);
    return ['tat-ca', ...Array.from(new Set(staff))];
  });

  danhSachLoc = computed(() => {
    const query = this.NormalizeSearchText(this.tuKhoa().trim());
    const tuyen = this.locTuyen();
    const lydo = this.locLyDo();
    const trangthai = this.locTrangThai();
    const trangThaiDonHang = this.locTrangThaiDonHang();
    const tuNgay = this.locTuNgay();
    const denNgay = this.locDenNgay();
    const nguonDat = this.locNguonDat();
    const nhanVien = this.locNhanVien();
    const loaiXe = this.locLoaiXe();
    const loaiGhe = this.locLoaiGhe();

    return this.danhSachHuy()
      .filter(v => {
        const keyword = [
          v.MaDonHang,
          v.MaVe,
          v.HoTenNguoiDi,
          v.SdtNguoiDi,
          v.LyDoHuy,
          v.TenTuyenXe,
          v.SoGhe,
          v.LoaiXe,
          v.LoaiGhe,
          v.TenXe,
          v.BienSoXe
        ].join(' ');
        const keywordText = this.NormalizeSearchText(keyword);
        const matchSearch = query ? keywordText.includes(query) : true;
        const matchTuyen = tuyen === 'tat-ca' ? true : v.TenTuyenXe === tuyen;
        const matchLyDo = lydo === 'tat-ca' ? true : v.LyDoHuy === lydo;
        const matchTrangThai = trangthai === 'tat-ca' ? true : v.TrangThaiGiaoDich === trangthai;
        const matchTrangThaiDonHang = this.KhopTrangThaiDonHangLoc(v, trangThaiDonHang);
        const matchTuNgay = tuNgay ? v.ThoiGianHuy >= tuNgay : true;
        const matchDenNgay = denNgay ? v.ThoiGianHuy <= denNgay : true;
        const matchNguonDat = nguonDat === 'tat-ca' ? true : v.NguonDat === nguonDat;
        const matchNhanVien = nhanVien === 'tat-ca' || v.MaNVBanVe === nhanVien;
        const matchLoaiXe = loaiXe === 'tat-ca' ? true : this.LoaiXeIdTuLabel(v.LoaiXe) === loaiXe;
        const matchLoaiGhe = loaiGhe === 'tat-ca' ? true : this.LoaiGheIdTuLabel(v.LoaiGhe) === loaiGhe;

        return matchSearch && matchTuyen && matchLyDo && matchTrangThai && matchTrangThaiDonHang && matchTuNgay && matchDenNgay && matchNguonDat && matchNhanVien && matchLoaiXe && matchLoaiGhe;
      })
      .sort((a, b) => {
        const aTime = a.ThoiDiemHuyIso || a.ThoiGianHuy;
        const bTime = b.ThoiDiemHuyIso || b.ThoiGianHuy;
        return bTime.localeCompare(aTime);
      });
  });

  thongKe = computed(() => {
    const list = this.danhSachLoc();
    const count = list.length;
    const refundTotal = list.reduce((sum, v) => sum + v.TienHoanLai, 0);
    const feeTotal = list.reduce((sum, v) => sum + v.LePhiHuy, 0);
    const canceledRevenue = list.reduce((sum, v) => sum + v.TienVeGoc, 0);
    const pendingCount = list.filter(v => v.TrangThaiGiaoDich === 'cho-hoan' || v.TrangThaiGiaoDich === 'dang-xu-ly').length;
    const totalBookings = Math.max(count, this.tongVeTheoBoLoc());
    const cancelRate = totalBookings > 0 ? (count / totalBookings) * 100 : 0;
    const daHoanCount = list.filter(v => v.TrangThaiGiaoDich === 'da-hoan').length;

    return {
      tongLuotHuy: count,
      tongTienHoan: refundTotal,
      tongPhiHuy: feeTotal,
      doanhThuVeHuy: canceledRevenue,
      giaTriTrungBinh: count > 0 ? Math.round(canceledRevenue / count) : 0,
      choHoan: pendingCount,
      tiLeDaHoan: count > 0 ? Math.round((daHoanCount / count) * 1000) / 10 : 0,
      tiLeHuy: Math.round(cancelRate * 10) / 10
    };
  });

  tacDongDoanhThu = computed<TacDongDoanhThu>(() => {
    const list = this.danhSachLoc();
    const count = list.length;
    const doanhThuHuy = list.reduce((sum, v) => sum + v.TienVeGoc, 0);
    const tienHoan = list.reduce((sum, v) => sum + v.TienHoanLai, 0);
    const phiGiuLai = list.reduce((sum, v) => sum + v.LePhiHuy, 0);
    const tienChoHoan = list
      .filter(v => v.TrangThaiGiaoDich === 'cho-hoan' || v.TrangThaiGiaoDich === 'dang-xu-ly')
      .reduce((sum, v) => sum + v.TienHoanLai, 0);
    const daHoanCount = list.filter(v => v.TrangThaiGiaoDich === 'da-hoan').length;

    return {
      doanhThuHuy,
      tienHoan,
      phiGiuLai,
      tienChoHoan,
      tyLeGiuLai: doanhThuHuy > 0 ? Math.round((phiGiuLai / doanhThuHuy) * 1000) / 10 : 0,
      tyLeDaHoan: count > 0 ? Math.round((daHoanCount / count) * 1000) / 10 : 0,
      giaTriTrungBinh: count > 0 ? Math.round(doanhThuHuy / count) : 0
    };
  });

  doanhThuStackSegments = computed<DoanhThuStackSegment[]>(() => {
    const impact = this.tacDongDoanhThu();
    const total = Math.max(1, impact.doanhThuHuy);
    const daHoan = Math.max(0, impact.tienHoan - impact.tienChoHoan);
    const segments: DoanhThuStackSegment[] = [
      { key: 'da-hoan', label: 'Đã hoàn cho khách', value: daHoan, pct: 0, tone: 'refund' },
      { key: 'cho-hoan', label: 'Còn chờ hoàn', value: impact.tienChoHoan, pct: 0, tone: 'pending' },
      { key: 'phi-giu-lai', label: 'Phí giữ lại', value: impact.phiGiuLai, pct: 0, tone: 'fee' }
    ];

    return segments.map(item => ({
      ...item,
      pct: impact.doanhThuHuy > 0 ? Math.round((item.value / total) * 1000) / 10 : 0
    }));
  });

  lyDoDistribution = computed(() => {
    const list = this.danhSachLoc();
    const total = list.length;
    if (total === 0) return [];

    const grouped: Record<string, number> = {};
    list.forEach(v => {
      grouped[v.LyDoHuy] = (grouped[v.LyDoHuy] || 0) + 1;
    });

    return Object.keys(grouped)
      .map(reason => {
        const count = grouped[reason];
        return {
          reason,
          count,
          pct: Math.round((count / total) * 100)
        };
      })
      .sort((a, b) => b.count - a.count);
  });

  tuyenRiskRows = computed<TuyenRiskChart[]>(() => {
    const grouped: Record<string, { canceled: number; refund: number; fee: number }> = {};
    this.danhSachLoc().forEach(v => {
      const route = v.TenTuyenXe || 'Chưa có tuyến';
      grouped[route] ??= { canceled: 0, refund: 0, fee: 0 };
      grouped[route].canceled += 1;
      grouped[route].refund += v.TienHoanLai;
      grouped[route].fee += v.LePhiHuy;
    });

    const rows = Object.entries(grouped).map(([route, value]) => {
      const sold = Math.max(this.tongVeTheoTuyen()[route] || 0, value.canceled);
      const rate = sold > 0 ? Math.round((value.canceled / sold) * 1000) / 10 : 0;
      const impact = value.refund + value.fee;
      const isSmallSample = sold < 5;
      const priorityScore = (rate * (isSmallSample ? 0.55 : 1))
        + value.canceled * 8
        + Math.log10(impact + 1) * 6;
      return {
        route,
        sold,
        canceled: value.canceled,
        rate,
        refund: value.refund,
        fee: value.fee,
        ratePct: Math.min(100, Math.round(rate)),
        priorityScore,
        isSmallSample,
        tone: isSmallSample && value.canceled < 2 ? 'warning' : rate >= 15 ? 'danger' : rate >= 8 ? 'warning' : 'success'
      } as TuyenRiskChart;
    });

    return rows.sort((a, b) =>
      b.priorityScore - a.priorityScore
      || b.canceled - a.canceled
      || b.rate - a.rate
    );
  });

  tuyenRiskChart = computed<TuyenRiskChart[]>(() => this.tuyenRiskRows().slice(0, this.tuyenRiskLimit));

  tuyenRiskHiddenCount = computed(() => Math.max(0, this.tuyenRiskRows().length - this.tuyenRiskLimit));

  xuHuongHuyTheoNgay = computed<XuHuongHuyTheoNgay[]>(() => {
    const grouped: Record<string, { count: number; refund: number; fee: number }> = {};

    this.danhSachLoc().forEach(v => {
      const date = v.ThoiGianHuy || 'Chưa có ngày';
      grouped[date] ??= { count: 0, refund: 0, fee: 0 };
      grouped[date].count += 1;
      grouped[date].refund += v.TienHoanLai;
      grouped[date].fee += v.LePhiHuy;
    });

    const rows = Object.entries(grouped)
      .map(([date, value]) => ({
        date,
        label: date === 'Chưa có ngày' ? date : this.DinhDangNgay(date),
        ...value
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const maxCount = Math.max(1, ...rows.map(item => item.count));

    return rows.map(item => ({
      ...item,
      countPct: Math.max(8, Math.round((item.count / maxCount) * 100))
    }));
  });

  xuHuongLineChart = computed<XuHuongLineChart>(() => {
    const rows = this.xuHuongHuyTheoNgay();
    const width = 640;
    const height = 220;
    const padding = { top: 18, right: 16, bottom: 42, left: 48 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const baseline = padding.top + plotHeight;
    const maxCount = Math.max(1, ...rows.map(item => item.count));
    const labelStep = Math.max(1, Math.ceil(rows.length / 6));

    const points = rows.map((item, index) => {
      const x = rows.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (index / (rows.length - 1)) * plotWidth;
      const y = padding.top + ((maxCount - item.count) / maxCount) * plotHeight;
      const labelX = index === 0
        ? x + 8
        : index === rows.length - 1
          ? x - 8
          : x;
      const labelAnchor: XuHuongLinePoint['labelAnchor'] = index === 0
        ? 'start'
        : index === rows.length - 1
          ? 'end'
          : 'middle';
      return {
        ...item,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        labelX: Math.round(labelX * 10) / 10,
        labelY: Math.round(Math.max(padding.top + 8, y - 10) * 10) / 10,
        labelAnchor,
        tooltipX: Math.round(Math.min(Math.max(x, 92), width - 92) * 10) / 10,
        tooltipY: Math.round(Math.max(42, y - 42) * 10) / 10,
        shortLabel: item.label.slice(0, 5),
        valueLabel: `${item.count} lượt hủy · Hoàn ${item.refund.toLocaleString('vi-VN')} đ`,
        showLabel: rows.length <= 7 || index === 0 || index === rows.length - 1 || index % labelStep === 0
      };
    });

    const tickValues = Array.from(new Set([
      maxCount,
      Math.max(1, Math.round(maxCount / 2)),
      0
    ]));

    const yTicks = tickValues.map(value => ({
      value,
      label: `${value}`,
      y: Math.round((padding.top + ((maxCount - value) / maxCount) * plotHeight) * 10) / 10
    }));

    const linePoints = points.map(point => `${point.x},${point.y}`).join(' ');
    const areaPoints = points.length > 0
      ? `${points[0].x},${baseline} ${linePoints} ${points[points.length - 1].x},${baseline}`
      : '';

    return {
      points,
      linePoints,
      areaPoints,
      yTicks,
      maxCount,
      totalCount: rows.reduce((sum, item) => sum + item.count, 0)
    };
  });

  thoiDiemHuyChart = computed<ThoiDiemHuyChart[]>(() => {
    const buckets: ThoiDiemHuyChart[] = [
      { key: 'gt24', label: 'Trước >24h', help: 'Còn khả năng bán lại ghế tốt', count: 0, pct: 0, barPct: 0, refund: 0, tone: 'success' },
      { key: 'h12-24', label: '12-24h', help: 'Cần theo dõi chính sách đổi chuyến', count: 0, pct: 0, barPct: 0, refund: 0, tone: 'warning' },
      { key: 'h6-12', label: '6-12h', help: 'Khó tối ưu lại công suất ghế', count: 0, pct: 0, barPct: 0, refund: 0, tone: 'warning' },
      { key: 'lt6', label: '<6h / sát giờ', help: 'Rủi ro mất doanh thu cao nhất', count: 0, pct: 0, barPct: 0, refund: 0, tone: 'danger' }
    ];

    this.danhSachLoc().forEach(item => {
      const hours = this.SoGioTruocKhoiHanh(item);
      const bucket = hours >= 24
        ? buckets[0]
        : hours >= 12
          ? buckets[1]
          : hours >= 6
            ? buckets[2]
            : buckets[3];
      bucket.count += 1;
      bucket.refund += item.TienHoanLai;
    });

    const total = Math.max(1, this.danhSachLoc().length);
    const maxCount = Math.max(1, ...buckets.map(item => item.count));

    return buckets.map(item => ({
      ...item,
      pct: Math.round((item.count / total) * 100),
      barPct: Math.max(6, Math.round((item.count / maxCount) * 100))
    }));
  });

  trangThaiHoanTienChart = computed<TrangThaiHoanTienChart[]>(() => {
    const list = this.danhSachLoc();
    const total = list.length;
    if (total === 0) return [];

    const chart: TrangThaiHoanTienChart[] = [
      { key: 'da-hoan', label: 'Đã hoàn tiền', count: 0, amount: 0, pct: 0, tone: 'success' },
      { key: 'dang-xu-ly', label: 'Đang xử lý', count: 0, amount: 0, pct: 0, tone: 'warning' },
      { key: 'cho-hoan', label: 'Chờ hoàn tiền', count: 0, amount: 0, pct: 0, tone: 'danger' },
      { key: 'khong-hoan', label: 'Không hoàn (chưa thanh toán)', count: 0, amount: 0, pct: 0, tone: 'success' }
    ];

    list.forEach(v => {
      const item = chart.find(row => row.key === v.TrangThaiGiaoDich);
      if (!item) return;
      item.count += 1;
      item.amount += v.TienHoanLai;
    });

    return chart
      .map(item => ({
        ...item,
        pct: Math.round((item.count / total) * 100)
      }))
      .filter(item => item.count > 0);
  });

  trangThaiHoanTienSegments = computed<TrangThaiHoanTienSegment[]>(() => {
    let offset = 0;
    return this.trangThaiHoanTienChart().map(item => {
      const segment = { ...item, offset };
      offset += item.pct;
      return segment;
    });
  });

  mucPhiHuyChart = computed<MucPhiHuyChart[]>(() => {
    const list = this.danhSachLoc();
    const total = list.length;
    if (total === 0) return [];

    const buckets: MucPhiHuyChart[] = [
      { key: 'mien-phi', label: 'Miễn phí hủy', count: 0, fee: 0, pct: 0, tone: 'success' },
      { key: 'phi-mot-phan', label: 'Phí hủy đến 50%', count: 0, fee: 0, pct: 0, tone: 'warning' },
      { key: 'phi-cao', label: 'Phí hủy trên 50%', count: 0, fee: 0, pct: 0, tone: 'danger' }
    ];

    list.forEach(v => {
      const rate = v.TyLePhiHuyApDung || this.TinhTyLePhiHuy(v.LePhiHuy, v.TienVeGoc);
      const bucket = rate === 0 ? buckets[0] : rate <= 50 ? buckets[1] : buckets[2];
      bucket.count += 1;
      bucket.fee += v.LePhiHuy;
    });

    return buckets.map(item => ({
      ...item,
      pct: Math.round((item.count / total) * 100)
    }));
  });

  nguonDatChart = computed<NguonDatChart[]>(() => {
    const list = this.danhSachLoc();
    const total = list.length;
    if (total === 0) return [];
    const grouped: Record<NguonDat, NguonDatChart> = {
      'tai-quay': { key: 'tai-quay', label: 'Tại quầy', count: 0, pct: 0, refund: 0 },
      hotline: { key: 'hotline', label: 'Hotline', count: 0, pct: 0, refund: 0 },
      online: { key: 'online', label: 'Online', count: 0, pct: 0, refund: 0 }
    };

    list.forEach(v => {
      grouped[v.NguonDat].count += 1;
      grouped[v.NguonDat].refund += v.TienHoanLai;
    });

    return Object.values(grouped)
      .filter(item => item.count > 0)
      .map(item => ({
        ...item,
        pct: Math.round((item.count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  });

  loaiXeChart = computed<LoaiXeChart[]>(() => {
    const list = this.danhSachLoc();
    const total = list.length;
    if (total === 0) return [];

    const grouped: Record<string, LoaiXeChart> = {};
    list.forEach(v => {
      const key = this.LoaiXeIdTuLabel(v.LoaiXe) ?? 'limousine';
      const label = this.LabelLoaiXe(key);
      grouped[key] ??= { key, label, count: 0, pct: 0, refund: 0, fee: 0, tone: key === 'cabin' ? 'warning' : key === 'giuong-nam' ? 'info' : 'success' };
      grouped[key].count += 1;
      grouped[key].refund += v.TienHoanLai;
      grouped[key].fee += v.LePhiHuy;
    });

    return Object.values(grouped)
      .map(item => ({
        ...item,
        pct: Math.round((item.count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  });

  canhBaoQuanTri = computed<CanhBaoQuanTri[]>(() => {
    const alerts: CanhBaoQuanTri[] = [];
    const route = this.tuyenRiskChart()[0];
    const impact = this.tacDongDoanhThu();
    const late = this.thoiDiemHuyChart().find(item => item.key === 'lt6');

    if (route && route.rate >= 8) {
      alerts.push({
        tone: route.rate >= 15 ? 'danger' : 'warning',
        title: 'Tuyến cần theo dõi',
        detail: `${route.route} có tỷ lệ hủy ${route.rate}% trên ${route.sold} vé đã đặt.`,
        value: `${route.canceled} vé`
      });
    }

    if (impact.tienChoHoan > 0) {
      alerts.push({
        tone: 'warning',
        title: 'Tiền hoàn còn tồn',
        detail: 'Cần ưu tiên xử lý các vé chưa hoàn để tránh khách gọi lại nhiều lần.',
        value: this.DinhDangTienRutGon(impact.tienChoHoan)
      });
    }

    if (late && late.pct >= 30) {
      alerts.push({
        tone: 'danger',
        title: 'Hủy sát giờ cao',
        detail: 'Tỷ lệ hủy dưới 6 giờ trước giờ chạy cao, khó bán lại ghế.',
        value: `${late.pct}%`
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        tone: 'success',
        title: 'Vận hành ổn định',
        detail: 'Chưa có tuyến hoặc nhóm hoàn tiền vượt ngưỡng cảnh báo theo bộ lọc hiện tại.',
        value: 'OK'
      });
    }

    return alerts;
  });

  topHuyGanNhat = computed(() => this.danhSachLoc().slice(0, 5));

  tongTrang = computed(() => Math.max(1, Math.ceil(this.danhSachLoc().length / this.soDongMoiTrang())));
  trangHopLe = computed(() => Math.min(Math.max(this.trangHienTai(), 1), this.tongTrang()));
  danhSachPhanTrang = computed(() => {
    const start = (this.trangHopLe() - 1) * this.soDongMoiTrang();
    return this.danhSachLoc().slice(start, start + this.soDongMoiTrang());
  });
  chiSoDauTrang = computed(() => this.danhSachLoc().length === 0 ? 0 : (this.trangHopLe() - 1) * this.soDongMoiTrang() + 1);
  chiSoCuoiTrang = computed(() => Math.min(this.trangHopLe() * this.soDongMoiTrang(), this.danhSachLoc().length));

  readonly tuyenOptions = computed(() => this.tuyenList().map(value => ({
    value, label: value === 'tat-ca' ? 'Tất cả tuyến' : value
  })));
  get lyDoOptions() {
    return [
      { value: 'tat-ca', label: 'Tất cả lý do' },
      ...this.reasonList.map(value => ({ value, label: value }))
    ];
  }
  readonly nhanVienOptions = computed(() => this.nhanVienList().map(value => ({
    value, label: this.LabelNhanVien(value)
  })));
  readonly hoanTienOptions = [
    { value: 'tat-ca', label: 'Tất cả trạng thái' },
    ...['da-hoan', 'dang-xu-ly', 'cho-hoan', 'khong-hoan'].map(value => ({ value, label: this.LabelTrangThaiHoanTien(value) }))
  ];
  readonly trangThaiDonOptions = [
    { value: 'tat-ca', label: 'Tất cả đơn' },
    { value: 'cho-thanh-toan', label: 'Chờ thanh toán' },
    { value: 'da-thanh-toan', label: 'Đã thanh toán' },
    { value: 'da-huy', label: 'Đã hủy' }
  ];

  constructor(private readonly sidebarState: SidebarStateService) {}

  ngOnInit() {
    if (window.innerWidth < 768) this.sidebarState.collapse();
    void this.TaiDuLieu();
  }

  ChuyenTrang(page: number) {
    this.trangHienTai.set(Math.min(Math.max(page, 1), this.tongTrang()));
  }

  ChuyenCheDoXem(mode: CheDoXemBaoCao) {
    this.cheDoXem.set(mode);
  }

  XoaBoLoc() {
    this.tuKhoa.set('');
    this.locTuyen.set('tat-ca');
    this.locLyDo.set('tat-ca');
    this.locTrangThai.set('tat-ca');
    this.locTrangThaiDonHang.set('tat-ca');
    this.locTuNgay.set('');
    this.locDenNgay.set('');
    this.locNguonDat.set('tat-ca');
    this.locNhanVien.set('tat-ca');
    this.locLoaiXe.set('tat-ca');
    this.locLoaiGhe.set('tat-ca');
    this.trangHienTai.set(1);
  }

  ExportToExcel() {
    const rows = this.danhSachLoc();
    if (rows.length === 0) {
      this.HienToast('Không có dữ liệu để xuất Excel.', 'danger');
      return;
    }

    const html = this.TaoNoiDungExcel(rows);
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `bao-cao-hoan-huy-${this.NgayFile()}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    this.HienToast(`Đã xuất ${rows.length} dòng Excel với từng thông tin tách cột riêng.`, 'success');
  }

  PrintReport() {
    document.body.classList.add('print-hoan-huy');
    const cleanup = () => document.body.classList.remove('print-hoan-huy');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 800);
  }

  ExportChartPdf() {
    const lines = this.TaoNoiDungPdfBieuDo();
    const blob = this.TaoPdfVanBan(lines);
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `bao-cao-hoan-huy-bieu-do-${this.NgayFile()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    this.HienToast('Đã tải file PDF báo cáo biểu đồ.', 'success');
  }

  DinhDangNgay(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  DinhDangNgayGio(item: LichSuHuyVe): string {
    const iso = item.ThoiDiemHuyIso;
    if (!iso) return this.DinhDangNgay(item.ThoiGianHuy);
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return this.DinhDangNgay(item.ThoiGianHuy);
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  DinhDangTienRutGon(value: number): string {
    if (Math.abs(value) >= 1000000000) return `${Math.round(value / 100000000) / 10} tỷ`;
    if (Math.abs(value) >= 1000000) return `${Math.round(value / 100000) / 10} triệu`;
    return `${value.toLocaleString('vi-VN')} đ`;
  }

  LabelNguonDat(value?: string): string {
    if (value === 'hotline') return 'Hotline';
    if (value === 'online') return 'Online';
    return 'Tại quầy';
  }

  LabelNguonXuLy(item: LichSuHuyVe): string {
    if (item.NguonHuy === 'KhachHang') return 'Khách tự hủy';
    if (item.NguonDat === 'hotline') return 'CSKH/Hotline hỗ trợ';
    if (item.NguonDat === 'online') return 'Hệ thống/Online';
    return 'Quầy vé hỗ trợ';
  }

  LabelNhanVien(value?: string): string {
    if (!value || value === 'tat-ca') return 'Tất cả nhân viên';
    if (value === 'SYSTEM') return 'Khách tự hủy / Hệ thống';
    return this.tenNhanVien.get(value) ?? value;
  }

  LabelTrangThaiHoanTien(value: string): string {
    if (value === 'da-hoan') return 'Đã hoàn tiền';
    if (value === 'dang-xu-ly') return 'Đang xử lý';
    if (value === 'cho-hoan') return 'Chờ hoàn tiền';
    if (value === 'khong-hoan') return 'Không hoàn';
    return 'Tất cả trạng thái';
  }

  LabelTrangThaiDonHang(value: string): string {
    if (value === 'cho-thanh-toan') return 'Chờ thanh toán';
    if (value === 'da-thanh-toan') return 'Đã thanh toán';
    if (value === 'da-huy') return 'Đã hủy';
    return 'Tất cả đơn';
  }

  LabelTrangThaiDonHangCuaBanGhi(item: LichSuHuyVe): string {
    return item.DonHangDaHuyToanBo ? 'Đã hủy' : this.LabelTrangThaiDonHang(item.TrangThaiDonHang);
  }

  LabelPhamViHuy(item: LichSuHuyVe): string {
    return item.DonHangDaHuyToanBo
      ? `Hủy toàn bộ ${item.TongVeTrongDon} vé`
      : `Hủy ${item.SoVeDaHuyTrongDon}/${item.TongVeTrongDon} vé`;
  }

  LabelLoaiXe(value?: LoaiXeId | string): string {
    const id = this.LoaiXeIdTuLabel(value) ?? 'limousine';
    const labels: Record<LoaiXeId, string> = {
      limousine: 'Limousine',
      'giuong-nam': 'Giường nằm',
      cabin: 'Cabin'
    };
    return labels[id];
  }

  LabelLoaiGhe(value?: LoaiGheId | string): string {
    const id = this.LoaiGheIdTuLabel(value);
    const labels: Record<LoaiGheId, string> = {
      limousine: 'Ghế VIP',
      'giuong-nam': 'Giường đơn',
      'cabin-don': 'Cabin đơn',
      'cabin-doi': 'Cabin đôi'
    };
    return id ? labels[id] : String(value || '');
  }

  MoTaXeGhe(item: LichSuHuyVe): string {
    return [item.LoaiXe, item.LoaiGhe, item.SoGhe ? `Ghế ${item.SoGhe}` : ''].filter(Boolean).join(' · ');
  }

  TrackByIndex(index: number) {
    return index;
  }

  private tongVeTheoBoLoc(): number {
    const tuyen = this.locTuyen();
    const source = this.locNguonDat();
    const totals = this.tongVeTheoTuyen();

    if (tuyen !== 'tat-ca') {
      return totals[tuyen] || this.danhSachLoc().length;
    }

    if (source !== 'tat-ca') {
      const sourceTotal = this.danhSachHuy().filter(v => v.NguonDat === source).length;
      const ratio = this.danhSachHuy().length > 0 ? sourceTotal / this.danhSachHuy().length : 1;
      return Math.max(this.danhSachLoc().length, Math.round(this.totalBookingsCount() * ratio));
    }

    return this.totalBookingsCount();
  }

  private TaoNoiDungPdfBieuDo(): string[] {
    const thongKe = this.thongKe();
    const impact = this.tacDongDoanhThu();
    const lines = [
      'BAO CAO HOAN HUY - QUAN TRI',
      `Ngay xuat: ${new Date().toLocaleString('vi-VN')}`,
      '',
      'BO LOC HIEN TAI',
      `Tu khoa: ${this.tuKhoa().trim() || 'Tat ca'}`,
      `Tuyen xe: ${this.locTuyen() === 'tat-ca' ? 'Tat ca' : this.locTuyen()}`,
      `Ly do huy: ${this.locLyDo() === 'tat-ca' ? 'Tat ca' : this.locLyDo()}`,
      `Tu ngay: ${this.locTuNgay() ? this.DinhDangNgay(this.locTuNgay()) : 'Tat ca'}`,
      `Den ngay: ${this.locDenNgay() ? this.DinhDangNgay(this.locDenNgay()) : 'Tat ca'}`,
      `Nguon dat: ${this.locNguonDat() === 'tat-ca' ? 'Tat ca' : this.LabelNguonDat(this.locNguonDat())}`,
      `Loai xe: ${this.locLoaiXe() === 'tat-ca' ? 'Tat ca' : this.LabelLoaiXe(this.locLoaiXe())}`,
      `Loai ghe: ${this.locLoaiGhe() === 'tat-ca' ? 'Tat ca' : this.LabelLoaiGhe(this.locLoaiGhe())}`,
      `Hoan tien: ${this.LabelTrangThaiHoanTien(this.locTrangThai())}`,
      `Trang thai don: ${this.LabelTrangThaiDonHang(this.locTrangThaiDonHang())}`,
      '',
      'TONG QUAN',
      `Tong luot huy: ${thongKe.tongLuotHuy}`,
      `Doanh thu ve bi huy: ${this.DinhDangTien(thongKe.doanhThuVeHuy)}`,
      `Tong tien hoan tra: ${this.DinhDangTien(thongKe.tongTienHoan)}`,
      `Phi huy giu lai: ${this.DinhDangTien(thongKe.tongPhiHuy)}`,
      `Ti le huy ve: ${thongKe.tiLeHuy}%`,
      `Ti le da hoan: ${thongKe.tiLeDaHoan}%`,
      `Gia tri trung binh/ve huy: ${this.DinhDangTien(thongKe.giaTriTrungBinh)}`,
      '',
      'TAC DONG DOANH THU',
      `Doanh thu bi huy: ${this.DinhDangTien(impact.doanhThuHuy)}`,
      `Da/du kien hoan: ${this.DinhDangTien(impact.tienHoan)}`,
      `Phi giu lai: ${this.DinhDangTien(impact.phiGiuLai)} (${impact.tyLeGiuLai}%)`,
      `Tien cho hoan: ${this.DinhDangTien(impact.tienChoHoan)}`,
      '',
      'CANH BAO QUAN TRI'
    ];

    this.canhBaoQuanTri().forEach(item => lines.push(`${item.title}: ${item.value} - ${item.detail}`));

    lines.push('', 'TY LE HUY THEO TUYEN');
    const routes = this.tuyenRiskChart();
    if (routes.length === 0) {
      lines.push('Khong co du lieu.');
    } else {
      routes.forEach(item => lines.push(`${item.route}: ${item.canceled}/${item.sold} ve, ty le ${item.rate}%`));
    }

    lines.push('', 'HUY THEO LOAI XE');
    const vehicleRows = this.loaiXeChart();
    if (vehicleRows.length === 0) {
      lines.push('Khong co du lieu.');
    } else {
      vehicleRows.forEach(item => lines.push(`${item.label}: ${item.count} luot (${item.pct}%), hoan ${this.DinhDangTien(item.refund)}`));
    }

    lines.push('', 'THOI DIEM HUY TRUOC GIO CHAY');
    this.thoiDiemHuyChart().forEach(item => lines.push(`${item.label}: ${item.count} luot (${item.pct}%)`));

    lines.push('', 'LY DO HUY');
    const reasons = this.lyDoDistribution();
    if (reasons.length === 0) {
      lines.push('Khong co du lieu.');
    } else {
      reasons.forEach(item => lines.push(`${item.reason}: ${item.count} luot (${item.pct}%)`));
    }

    lines.push('', 'TRANG THAI HOAN TIEN');
    const status = this.trangThaiHoanTienChart();
    if (status.length === 0) {
      lines.push('Khong co du lieu.');
    } else {
      status.forEach(item => lines.push(`${item.label}: ${item.count} luot (${item.pct}%), gia tri ${this.DinhDangTien(item.amount)}`));
    }

    return lines.map(line => this.BoDauTiengViet(line));
  }

  private TaoNoiDungExcel(rows: LichSuHuyVe[]): string {
    const columns: Array<{ title: string; value: (item: LichSuHuyVe, index: number) => string | number; text?: boolean }> = [
      { title: 'STT', value: (_item, index) => index + 1 },
      { title: 'Mã đơn hàng', value: item => item.MaDonHang, text: true },
      { title: 'Mã vé', value: item => item.MaVe, text: true },
      { title: 'Họ tên khách', value: item => item.HoTenNguoiDi },
      { title: 'Số điện thoại', value: item => item.SdtNguoiDi, text: true },
      { title: 'Tuyến xe', value: item => item.TenTuyenXe },
      { title: 'Giờ khởi hành', value: item => item.GioKhoiHanh, text: true },
      { title: 'Ngày khởi hành', value: item => this.DinhDangNgay(item.NgayKhoiHanh), text: true },
      { title: 'Số ghế', value: item => item.SoGhe, text: true },
      { title: 'Loại xe', value: item => item.LoaiXe },
      { title: 'Loại ghế', value: item => item.LoaiGhe },
      { title: 'Tên xe', value: item => item.TenXe },
      { title: 'Biển số', value: item => item.BienSoXe, text: true },
      { title: 'Thời gian hủy', value: item => this.DinhDangNgayGio(item), text: true },
      { title: 'Lý do hủy', value: item => item.LyDoHuy },
      { title: 'Nguồn đặt', value: item => this.LabelNguonDat(item.NguonDat) },
      { title: 'Nguồn xử lý', value: item => this.LabelNguonXuLy(item) },
      { title: 'Nhân viên', value: item => this.LabelNhanVien(item.MaNVBanVe) },
      { title: 'Trạng thái đơn', value: item => this.LabelTrangThaiDonHangCuaBanGhi(item) },
      { title: 'Phạm vi hủy', value: item => this.LabelPhamViHuy(item) },
      { title: 'Phương thức thanh toán', value: item => item.PhuongThucThanhToan },
      { title: 'Trạng thái hoàn tiền', value: item => this.LabelTrangThaiHoanTien(item.TrangThaiGiaoDich) },
      { title: 'Giá vé', value: item => item.TienVeGoc },
      { title: 'Phí hủy', value: item => item.LePhiHuy },
      { title: 'Tiền hoàn trả', value: item => item.TienHoanLai },
      { title: 'Tỷ lệ phí hủy (%)', value: item => item.TyLePhiHuyApDung },
      { title: 'Mã chính sách', value: item => item.MaChinhSach, text: true },
      { title: 'Mã giao dịch hoàn', value: item => item.MaGiaoDichHoan || '', text: true }
    ];

    const header = columns.map(column => `<th>${this.EscapeHtml(column.title)}</th>`).join('');
    const body = rows.map((item, index) => {
      const cells = columns.map(column => {
        const value = column.value(item, index);
        const textClass = column.text ? ' class="text-cell"' : '';
        return `<td${textClass}>${this.EscapeHtml(value)}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Inter, sans-serif; font-size: 11pt; }
    th { background: #1e3a8a; color: #ffffff; font-weight: 700; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
    .text-cell { mso-number-format:"\\@"; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${header}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
  }

  private TaoPdfVanBan(lines: string[]): Blob {
    const pageWidth = 595;
    const pageHeight = 842;
    const marginX = 48;
    const fontSize = 11;
    const lineHeight = 16;
    const maxLinesPerPage = Math.floor((pageHeight - 96) / lineHeight);
    const pages = this.ChunkArray(lines.flatMap(line => this.WrapPdfLine(line, 86)), maxLinesPerPage);
    const objects: string[] = [];

    const addObject = (content: string) => {
      objects.push(content);
      return objects.length;
    };

    const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
    const pagesId = addObject('');
    const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const pageIds: number[] = [];

    pages.forEach(pageLines => {
      const content = [
        'BT',
        `/F1 ${fontSize} Tf`,
        `${marginX} ${pageHeight - 52} Td`,
        `${lineHeight} TL`,
        ...pageLines.map(line => `(${this.EscapePdfText(line)}) Tj T*`),
        'ET'
      ].join('\n');
      const streamId = addObject(`<< /Length ${this.ByteLength(content)} >>\nstream\n${content}\nendstream`);
      const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
      pageIds.push(pageId);
    });

    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    objects.forEach((content, index) => {
      offsets.push(this.ByteLength(pdf));
      pdf += `${index + 1} 0 obj\n${content}\nendobj\n`;
    });

    const xrefOffset = this.ByteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
  }

  private WrapPdfLine(line: string, maxLength: number): string[] {
    if (line.length <= maxLength) return [line];
    const words = line.split(' ');
    const result: string[] = [];
    let current = '';

    words.forEach(word => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxLength) {
        if (current) result.push(current);
        current = word;
      } else {
        current = next;
      }
    });

    if (current) result.push(current);
    return result;
  }

  private EscapePdfText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private EscapeHtml(value: string | number): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private ByteLength(value: string): number {
    return new TextEncoder().encode(value).length;
  }

  private ChunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks.length ? chunks : [[]];
  }

  private DinhDangTien(value: number): string {
    return `${value.toLocaleString('vi-VN')} VND`;
  }

  private NgayFile(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private BoDauTiengViet(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  private HienToast(msg: string, type: 'success' | 'danger') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3200);
  }

  private TaoMaKhachHang(sdt: string) {
    const digits = sdt.replace(/\D/g, '').slice(-8);
    return `KH${digits || '00000000'}`;
  }

  private TinhTyLePhiHuy(lePhiHuy: number, tienVeGoc: number) {
    if (!tienVeGoc) return 0;
    return Math.round((lePhiHuy / tienVeGoc) * 100);
  }

  private MaChinhSachTheoPhi(lePhiHuy: number, tienVeGoc: number) {
    const tiLe = this.TinhTyLePhiHuy(lePhiHuy, tienVeGoc);
    if (tiLe === 0) return 'CSH-100';
    if (tiLe <= 50) return 'CSH-50';
    return 'CSH-0';
  }

  private LabelPhuongThucThanhToan(value: string) {
    if (value === 'tien-mat') return 'Tiền mặt';
    if (value === 'chuyen-khoan') return 'Chuyển khoản';
    if (value === 'the') return 'Thẻ ngân hàng';
    return value || 'Tiền mặt';
  }

  private ChuanHoaTrangThaiHoan(value?: string, trangThaiThanhToan?: string): TrangThaiHoanTien {
    if (value === 'da-hoan') return 'da-hoan';
    if (value === 'dang-xu-ly') return 'dang-xu-ly';
    if (value === 'khong-hoan') return 'khong-hoan';
    if (value === 'chua-hoan' || value === 'cho-hoan') return 'cho-hoan';
    return trangThaiThanhToan === 'da-thanh-toan' ? 'cho-hoan' : 'da-hoan';
  }

  private ChuanHoaTrangThaiDonHang(value?: string): TrangThaiDonHang {
    if (value === 'cho-thanh-toan' || value === 'giu-cho' || value === 'chua-thanh-toan') {
      return 'cho-thanh-toan';
    }
    return 'da-thanh-toan';
  }

  private KhopTrangThaiDonHangLoc(item: LichSuHuyVe, filter: TrangThaiDonHangLoc): boolean {
    if (filter === 'tat-ca') return true;
    if (filter === 'da-huy') return item.DonHangDaHuyToanBo;
    return !item.DonHangDaHuyToanBo && item.TrangThaiDonHang === filter;
  }

  private ChuanHoaNguonDat(value?: string): NguonDat {
    if (value === 'hotline' || value === 'online' || value === 'tai-quay') return value;
    return 'tai-quay';
  }

  private NormalizeSearchText(value: unknown): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  private LoaiXeIdTuLabel(value?: string): LoaiXeId | null {
    const normalized = this.NormalizeSearchText(value);
    if (!normalized) return null;
    if (normalized.includes('giuong') || normalized === 'gn') return 'giuong-nam';
    if (normalized.includes('cabin') || normalized.includes('cab')) return 'cabin';
    if (normalized.includes('limousine') || normalized.includes('limo')) return 'limousine';
    return null;
  }

  private LoaiGheIdTuLabel(value?: string): LoaiGheId | null {
    const normalized = this.NormalizeSearchText(value);
    if (!normalized) return null;
    if (normalized.includes('cabin') && normalized.includes('doi')) return 'cabin-doi';
    if (normalized.includes('cabin')) return 'cabin-don';
    if (normalized.includes('limousine') || normalized.includes('vip')) return 'limousine';
    if (normalized.includes('giuong')) return 'giuong-nam';
    return null;
  }

  private LoaiGheTheoSoGhe(soGhe: string, loaiXe: LoaiXeId): LoaiGheId {
    if (loaiXe === 'limousine') return 'limousine';
    if (loaiXe === 'giuong-nam') return 'giuong-nam';
    return 'cabin-don';
  }

  private LayNgayTuChuoi(value: unknown): string {
    if (!value) return '';
    const text = String(value).trim();
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const viMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (viMatch) {
      return `${viMatch[3]}-${viMatch[2].padStart(2, '0')}-${viMatch[1].padStart(2, '0')}`;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
  }

  private LayIsoTuChuoi(value: unknown): string | undefined {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  private TachThongTinGhiChu(ghiChu?: string) {
    const result: { lyDo?: string; ngayHuy?: string; tienHoan?: number } = {};
    if (!ghiChu) return result;

    const reasonMatch = ghiChu.match(/Lý do:\s*([^|#-]+)/i);
    if (reasonMatch?.[1]) result.lyDo = reasonMatch[1].trim();

    const dateMatch = ghiChu.match(/ngày\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (dateMatch?.[1] && dateMatch?.[2] && dateMatch?.[3]) {
      result.ngayHuy = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
    }

    const refundMatch = ghiChu.match(/Hoàn:\s*([\d.]+)/i);
    if (refundMatch?.[1]) result.tienHoan = Number(refundMatch[1].replaceAll('.', ''));

    return result;
  }

  private SoGioTruocKhoiHanh(item: LichSuHuyVe): number {
    const depart = new Date(`${item.NgayKhoiHanh}T${item.GioKhoiHanh || '00:00'}:00`);
    const cancel = item.ThoiDiemHuyIso
      ? new Date(item.ThoiDiemHuyIso)
      : new Date(`${item.ThoiGianHuy}T12:00:00`);

    if (Number.isNaN(depart.getTime()) || Number.isNaN(cancel.getTime())) return 999;
    return (depart.getTime() - cancel.getTime()) / 3600000;
  }

  private ChuanHoaLichSuHuyVe(item: Partial<LichSuHuyVe>, index: number): LichSuHuyVe {
    const tienVeGoc = Number(item.TienVeGoc ?? 0);
    const lePhiHuy = Number(item.LePhiHuy ?? 0);
    const maVe = item.MaVe ?? `VE-HUY-${index + 1}`;
    const trangThai = item.TrangThaiGiaoDich ?? 'cho-hoan';
    const trangThaiDonHang = this.ChuanHoaTrangThaiDonHang(item.TrangThaiDonHang);
    const tongVeTrongDonRaw = Number(item.TongVeTrongDon ?? 1);
    const tongVeTrongDon = Math.max(1, Number.isFinite(tongVeTrongDonRaw) ? tongVeTrongDonRaw : 1);
    const soVeDaHuyRaw = Number(item.SoVeDaHuyTrongDon ?? (item.DonHangDaHuyToanBo === false ? 1 : tongVeTrongDon));
    const soVeDaHuyTrongDon = Math.min(tongVeTrongDon, Math.max(1, Number.isFinite(soVeDaHuyRaw) ? soVeDaHuyRaw : 1));
    const donHangDaHuyToanBo = item.DonHangDaHuyToanBo ?? soVeDaHuyTrongDon >= tongVeTrongDon;
    const thoiGianHuy = this.LayNgayTuChuoi(item.ThoiGianHuy) || this.NgayFile();
    const rawThoiGianHuy = String(item.ThoiGianHuy ?? '');
    const thoiDiemHuyIso = item.ThoiDiemHuyIso
      ?? (rawThoiGianHuy.includes('T') ? this.LayIsoTuChuoi(rawThoiGianHuy) : undefined)
      ?? `${thoiGianHuy}T08:00:00`;
    const maXe = item.MaXe || '';
    const loaiXeId = this.LoaiXeIdTuLabel(item.LoaiXe) ?? 'limousine';
    const loaiGheId = this.LoaiGheIdTuLabel(item.LoaiGhe) ?? this.LoaiGheTheoSoGhe(item.SoGhe || '', loaiXeId);
    return {
      MaLichSuHuy: item.MaLichSuHuy ?? `LSH-${maVe}`,
      MaVe: maVe,
      MaDonHang: item.MaDonHang ?? `DH-${maVe}`,
      MaChinhSach: item.MaChinhSach ?? this.MaChinhSachTheoPhi(lePhiHuy, tienVeGoc),
      NguonHuy: item.NguonHuy ?? 'NhanVienBanVe',
      NguonDat: this.ChuanHoaNguonDat(item.NguonDat),
      MaKhachHang: item.MaKhachHang ?? this.TaoMaKhachHang(item.SdtNguoiDi ?? ''),
      MaNVBanVe: item.MaNVBanVe ?? 'SYSTEM',
      HoTenNguoiDi: item.HoTenNguoiDi ?? '',
      SdtNguoiDi: item.SdtNguoiDi ?? '',
      TenTuyenXe: item.TenTuyenXe ?? '',
      NgayKhoiHanh: item.NgayKhoiHanh ?? '',
      GioKhoiHanh: item.GioKhoiHanh ?? '',
      SoGhe: item.SoGhe ?? '',
      MaXe: maXe,
      TenXe: item.TenXe || '',
      BienSoXe: item.BienSoXe || '',
      LoaiXe: this.LabelLoaiXe(loaiXeId),
      LoaiGhe: this.LabelLoaiGhe(loaiGheId),
      TienVeGoc: tienVeGoc,
      TyLePhiHuyApDung: item.TyLePhiHuyApDung ?? this.TinhTyLePhiHuy(lePhiHuy, tienVeGoc),
      LePhiHuy: lePhiHuy,
      TienHoanLai: Number(item.TienHoanLai ?? Math.max(0, tienVeGoc - lePhiHuy)),
      MaGiaoDichHoan: item.MaGiaoDichHoan,
      ThoiGianHuy: thoiGianHuy,
      ThoiDiemHuyIso: thoiDiemHuyIso,
      LyDoHuy: item.LyDoHuy ?? 'Lý do cá nhân',
      TrangThaiGiaoDich: this.ChuanHoaTrangThaiHoan(trangThai),
      TrangThaiDonHang: trangThaiDonHang,
      DonHangDaHuyToanBo: donHangDaHuyToanBo,
      TongVeTrongDon: tongVeTrongDon,
      SoVeDaHuyTrongDon: soVeDaHuyTrongDon,
      PhuongThucThanhToan: item.PhuongThucThanhToan ?? 'Tiền mặt'
    };
  }

  /** Tải lịch sử hủy vé từ DB và số vé đã bán theo tuyến (để tính tỷ lệ hủy). */
  private async TaiDuLieu() {
    this.dangTai.set(true);
    try {
      const rows: ApiCancellation[] = [];
      let ticketsInPeriod = 0;
      for (let page = 1; ; page++) {
        const res = await this.api.request<{ items: ApiCancellation[]; summary: { ticketsInPeriod: number }; pagination: { totalPages: number } }>(
          `admin/reports/cancellations?page=${page}&pageSize=100`, 'GET', undefined, 'admin');
        rows.push(...res.items);
        ticketsInPeriod = res.summary?.ticketsInPeriod ?? ticketsInPeriod;
        if (page >= res.pagination.totalPages || !res.items.length) break;
      }
      const routes: { name: string; revenue: { ticketsSold: number } }[] = [];
      try {
        for (let page = 1; ; page++) {
          const res = await this.api.request<{ items: { name: string; revenue: { ticketsSold: number } }[]; pagination: { totalPages: number } }>(
            `admin/reports/routes?page=${page}&pageSize=100`, 'GET', undefined, 'admin');
          routes.push(...res.items);
          if (page >= res.pagination.totalPages || !res.items.length) break;
        }
      } catch {
        // Không có quyền báo cáo tuyến: tỷ lệ hủy theo tuyến tính trên số vé hủy
      }

      this.tenNhanVien.clear();
      const list = rows.map((r, index) => {
        if (r.staff) this.tenNhanVien.set(r.staff.id, `${r.staff.id} - ${r.staff.name}`);
        const channel = this.NormalizeSearchText(r.channel);
        return this.ChuanHoaLichSuHuyVe({
          MaLichSuHuy: r.id,
          MaVe: r.ticketId,
          MaDonHang: r.orderId,
          MaChinhSach: r.policyId ?? '',
          NguonHuy: r.cancelledBy === 'KhachHang' ? 'KhachHang' : 'NhanVienBanVe',
          NguonDat: channel.includes('online') ? 'online' : channel.includes('hotline') ? 'hotline' : 'tai-quay',
          MaKhachHang: r.customerId ?? '',
          MaNVBanVe: r.staff?.id ?? 'SYSTEM',
          HoTenNguoiDi: r.passengerName,
          SdtNguoiDi: r.passengerPhone,
          TenTuyenXe: r.route,
          NgayKhoiHanh: r.departureDate,
          GioKhoiHanh: r.departureTime,
          SoGhe: r.seat,
          MaXe: r.vehicle?.id,
          TenXe: r.vehicle?.name,
          BienSoXe: r.vehicle?.plateNumber,
          LoaiXe: r.vehicle?.type,
          LoaiGhe: [r.seatType, r.roomType].filter(v => v && v !== 'KhongApDung').join(' '),
          TienVeGoc: r.originalPrice,
          LePhiHuy: r.fee,
          TienHoanLai: r.refundAmount,
          MaGiaoDichHoan: r.refundTransactionId ?? undefined,
          ThoiGianHuy: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(r.cancelledAt)),
          ThoiDiemHuyIso: r.cancelledAt,
          LyDoHuy: r.reason,
          TrangThaiGiaoDich: REFUND_MAP[r.refundStatus] ?? 'cho-hoan',
          TrangThaiDonHang: r.orderStatus.startsWith('ChoThanhToan') ? 'cho-thanh-toan' : 'da-thanh-toan',
          DonHangDaHuyToanBo: r.orderFullyCancelled,
          TongVeTrongDon: r.ticketsInOrder,
          SoVeDaHuyTrongDon: r.cancelledTicketsInOrder,
          PhuongThucThanhToan: r.paymentMethod ? (PAYMENT_LABELS[r.paymentMethod] ?? r.paymentMethod) : 'Chưa thanh toán',
        }, index);
      });

      const canceledByRoute: Record<string, number> = {};
      list.forEach(v => { canceledByRoute[v.TenTuyenXe] = (canceledByRoute[v.TenTuyenXe] || 0) + 1; });
      const routeTotals: Record<string, number> = {};
      routes.forEach(r => { routeTotals[r.name] = r.revenue.ticketsSold + (canceledByRoute[r.name] || 0); });

      this.danhSachHuy.set(list);
      this.tongVeTheoTuyen.set(routeTotals);
      this.totalBookingsCount.set(Math.max(ticketsInPeriod, list.length));
    } catch (error) {
      this.HienToast(error instanceof Error ? error.message : 'Không tải được báo cáo hoàn hủy.', 'danger');
    } finally {
      this.dangTai.set(false);
    }
  }
}
