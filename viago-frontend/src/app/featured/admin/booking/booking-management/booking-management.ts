import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker';
import { SidebarStateService } from '../../../../core/services/sidebar-state.service';
import { BookingDialog, printBookingReceipts } from '../booking-dialog';
import { HostListener } from '@angular/core';
import { BookingState, normalizeTicket, paymentLabel, ticketLabel, paymentVariant, normalizedName, validName, validPhone, validEmail, countdown, couponResult, localQr } from '../booking-rules';
import { Toast } from '../../../../shared/components/toast/toast';
import { Button } from '../../../../shared/components/button/button';
import { Badge } from '../../../../shared/components/badge/badge';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

type PhuongThucThanhToan = 'tien-mat' | 'chuyen-khoan' | 'the';
type TrangThaiDonHang = 'cho-thanh-toan' | 'da-thanh-toan';
type TrangThaiVe = 'cho-khoi-hanh' | 'da-hoan-thanh' | 'da-huy';
type NguonDat = 'tai-quay' | 'hotline' | 'online';
type LoaiXeId = 'limousine' | 'giuong-nam' | 'cabin';
type LoaiGheId = 'giuong-nam' | 'limousine' | 'cabin-don' | 'cabin-doi';

interface XeKhach {
  maXe: string;
  tenXe: string;
  bienSo: string;
  loaiXe: LoaiXeId;
  soCho: number;
}

interface VeXe extends BookingState {
  MaVe: string;
  MaDonHang?: string;
  MaKhachHang?: string;
  MaNVBanVe?: string;
  HoTenNguoiDi: string;
  SdtNguoiDi: string;
  EmailNguoiDi?: string;
  ThoiGianDat: string;
  SoLuongVeDaDat?: number;
  TienBaoHiem?: number;
  TongGiaVe?: number;
  ThoiGianXuatVe?: string;
  MaQRVe?: string;
  MaLichTrinh: string;
  MaXe?: string;
  MaGheChuyen?: string;
  LoaiXe?: string;
  LoaiGhe?: string;
  TenXe?: string;
  BienSoXe?: string;
  TenTuyenXe: string;
  NgayKhoiHanh: string;
  GioKhoiHanh: string;
  SoGhe: string;
  GiaVe: number;
  MaGiamGia?: string;
  GiamGia?: number;
  MaDiemDon: string;
  MaDiemTra: string;
  PhuongThucThanhToan: PhuongThucThanhToan;
  TrangThaiDonHang: TrangThaiDonHang;
  TrangThaiVe: TrangThaiVe;
  GhiChu?: string;
  NguonDat?: NguonDat;
  SoLanDaSua?: number;
  NguoiHuy?: string;
  ThoiGianHuy?: string;
  TrangThaiGiaoDich?: 'da-hoan' | 'chua-hoan';
}

interface HoanTienInfo {
  tiLe: number;
  soTien: number;
  phiHuy: number;
  moTa: string;
}

interface DonHangTraCuu {
  MaDonHang: string;
  DaiDien: VeXe;
  SoVe: number;
  SoVeHieuLuc: number;
  TongHieuLuc: number;
  Ghe: string;
}

@Component({
  selector: 'app-booking-management',
  standalone: true,
  imports: [DatePickerComponent, Toast, BookingDialog, Button, Badge, ModalComponent, Pagination, CommonModule, FormsModule],
  templateUrl: './booking-management.html',
  styleUrl: './booking-management.css'
})
export class BookingManagement implements OnInit, AfterViewInit {
  PaymentLabel = (ve: VeXe) => (ve.balanceDue || 0) > 0 || normalizeTicket(ve).paymentStatus === 'pending' ? 'Chờ thanh toán' : paymentLabel(ve);
  PaymentVariant = (ve: VeXe) => (ve.balanceDue || 0) > 0 ? 'warning' as const : paymentVariant(ve); Countdown = countdown;
  TicketLifecycleLabel(ve: VeXe): string {
    const state = normalizeTicket(ve).orderStatus;
    if (state === 'expired') return 'Hết hạn';
    if (state === 'cancelled' || ve.TrangThaiVe === 'da-huy') return 'Đã hủy';
    if (state === 'used' || ve.TrangThaiVe === 'da-hoan-thanh') return 'Đã hoàn thành';
    return state === 'held' ? 'Đang giữ chỗ' : 'Chờ khởi hành';
  }
  TicketLabel = (ve: VeXe) => normalizeTicket(ve).orderStatus === 'used' ? 'Đã hoàn thành' : ve.TrangThaiVe === 'da-huy' ? 'Đã hủy' : ve.TrangThaiDonHang === 'da-thanh-toan' ? 'Đã thanh toán' : 'Chờ thanh toán';
  readonly currentUser = { id: 'NVBV001', name: 'Nguyễn An Ninh' };
  locNguonDat = signal('tat-ca');
  editPassengers = signal<Record<string, string>>({});
  printing = signal(false);
  resendState = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  EditCount(ve: VeXe) { return Math.max(0, ve.SoLanDaSua || 0, ...this.TatCaVeCungDon(ve).map(v => v.SoLanDaSua || 0)); }
  CancelReason(ve: VeXe): string {
    const state = normalizeTicket(ve).orderStatus;
    if (state === 'cancelled') return 'Vé đã hủy.';
    if (state === 'expired') return 'Giữ chỗ đã hết hạn.';
    if (state === 'used') return 'Vé đã hoàn thành, không thể hủy.';
    if (ve.tripStatus === 'departed' || this.SoGioTruocKhoiHanh(ve) <= 0) return 'Đã qua giờ khởi hành, không thể hủy vé.';
    return this.CoTheHuy(ve) ? '' : 'Vé không còn đủ điều kiện hủy.';
  }
  private BookingTime(value: string): number {
    const local = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (local) {
      const time = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      return new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]), Number(time?.[1] || 0), Number(time?.[2] || 0), Number(time?.[3] || 0)).getTime();
    }
    const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : 0;
  }
  private NewestFirst(a: VeXe, b: VeXe): number {
    return this.BookingTime(b.ThoiGianDat) - this.BookingTime(a.ThoiGianDat)
      || (b.MaDonHang || '').localeCompare(a.MaDonHang || '', 'vi', { numeric: true })
      || b.MaVe.localeCompare(a.MaVe, 'vi', { numeric: true });
  }
  PassengerName(ve: VeXe) { return ve.passengerName || ve.HoTenNguoiDi; }
  ChangePassenger(code: string, value: string) { this.editPassengers.update(names => ({ ...names, [code]: value })); }
  OrderLabel(ve: VeXe) {
    const all = this.TatCaVeCungDon(ve); const active = all.filter(v => v.TrangThaiVe !== 'da-huy');
    return !active.length ? 'Đã hủy' : active.length < all.length ? 'Hủy một phần' : active.every(v => v.TrangThaiVe === 'da-hoan-thanh' || v.orderStatus === 'used') ? 'Đã hoàn thành' : active.some(v => v.TrangThaiDonHang !== 'da-thanh-toan' || (v.balanceDue || 0) > 0) ? 'Chờ thanh toán' : 'Đã thanh toán';
  }
  OrderVariant(ve: VeXe): 'success' | 'warning' | 'danger' | 'info' | 'neutral' { const label = this.OrderLabel(ve); return label === 'Đã hủy' ? 'danger' : label === 'Hủy một phần' ? 'warning' : label === 'Chờ thanh toán' ? 'info' : 'success'; }
  PaymentDue(ve: VeXe) { return this.NhomVeCungDon(ve).reduce((sum,v) => sum + (v.TrangThaiDonHang === 'da-thanh-toan' ? v.balanceDue || 0 : v.GiaVe), 0); }
  OrderSeats(ve: VeXe) { return this.NhomVeCungDon(ve).map(v => v.SoGhe).join(', '); }
  RefundLabel(ve: VeXe) { const status = ve.refundStatus || (ve.paymentStatus === 'refunded' ? 'completed' : ve.paymentStatus === 'refund-failed' ? 'failed' : 'processing'); return ({ processing: 'Đang xử lý', completed: 'Đã hoàn', failed: 'Thất bại' })[status]; }
  MemberPoints(ve: VeXe) { return this.danhSachVe().filter(v => v.SdtNguoiDi === ve.SdtNguoiDi).reduce((sum,v) => sum + (v.membershipPoints ?? (v.TrangThaiDonHang === 'da-thanh-toan' && v.TrangThaiVe !== 'da-huy' ? Math.floor(v.GiaVe / 10000) : 0)), 0); }
  TransferSeats(ve: VeXe) {
    const available = this.LayGheTrongCuaChuyen(ve.MaLichTrinh);
    return this.seatLayouts[this.LoaiXeIdTheoVe(ve)].map(code => {
      const occupant = this.danhSachVe().find(v => v.MaLichTrinh === ve.MaLichTrinh && v.SoGhe === code && v.TrangThaiVe !== 'da-huy');
      const label = !this.CoTheSua(ve) ? 'Không thể chọn' : code === this.selectedNewSeat() ? 'Đang chọn' : code === ve.SoGhe ? 'Ghế hiện tại' : !occupant ? 'Trống' : normalizeTicket(occupant).orderStatus === 'held' ? 'Đang giữ' : 'Đã bán';
      return { code, label, disabled: !this.DuocDoiGheTrucTiep(ve) || code === ve.SoGhe || !available.includes(code) };
    });
  }

  editCouponFeedback = computed(() => {
    const ve = this.veDuocChon(); if (!ve || !this.CoTheSuaMaGiamGia(ve)) return '';
    const route = this.tuyenList.find(t => t.name === ve.TenTuyenXe)?.id ?? '';
    const subtotal = this.NhomVeCungDon(ve).reduce((sum, t) => sum + t.GiaVe + (t.GiamGia || 0), 0);
    const result = couponResult(this.editMaGiamGia(), route, subtotal);
    return result.error || (result.valid ? 'Mã giảm giá hợp lệ.' : '');
  });
  processing = signal(false); closeConfirm = signal(false); cancellationOther = signal('');
  clockNow = signal(Date.now());
  private clockTimer?: ReturnType<typeof setInterval>;
  ngOnDestroy() { if (this.clockTimer) clearInterval(this.clockTimer); }
  private refreshExpiry() {
    this.clockNow.set(Date.now()); const old = this.danhSachVe(); const next = old.map(v => normalizeTicket(v));
    if (next.some((v, i) => v.orderStatus !== old[i].orderStatus)) {
      this.danhSachVe.set(next); this.LuuDuLieu(next);
      const selected = this.veDuocChon(); if (selected) this.veDuocChon.set(next.find(v => v.MaVe === selected.MaVe) ?? null);
    }
  }
  private closeTarget: 'edit' | 'cancel' | 'transfer' = 'edit';
  DiscardChanges() { if (this.closeTarget === 'edit') this.showEditModal.set(false); else if (this.closeTarget === 'cancel') this.showCancelModal.set(false); else this.showTransferModal.set(false); this.closeConfirm.set(false); }
  CloseCancel() { if (this.processing()) return; this.closeTarget = 'cancel'; if (this.selectedCancelReason() !== 'Khách yêu cầu' || this.cancellationOther().trim() || this.applyCancelToGroup()) this.closeConfirm.set(true); else this.showCancelModal.set(false); }
  CloseTransfer() { if (this.processing()) return; this.closeTarget = 'transfer'; if (this.selectedNewSeat()) this.closeConfirm.set(true); else this.showTransferModal.set(false); }
  CloseEdit() { this.closeTarget = 'edit'; if (this.processing()) return; if (this.coThayDoiSua()) this.closeConfirm.set(true); else this.showEditModal.set(false); }
  Escape() { if (this.closeConfirm() || this.processing()) return; if (this.showPaymentConfirmModal()) this.showPaymentConfirmModal.set(false); else if (this.showCancelConfirmModal()) this.showCancelConfirmModal.set(false); else if (this.showCancelModal()) this.CloseCancel(); else if (this.showTransferModal()) this.CloseTransfer(); else if (this.showEditModal()) this.CloseEdit(); else this.DongTatCaModal(); }
  EditReason(ve: VeXe) { return ve.tripStatus && ve.tripStatus !== 'open' ? 'Chuyến đã khóa, hủy hoặc khởi hành.' : this.SoGioTruocKhoiHanh(ve) < 2 ? 'Chỉ được sửa trước giờ đi ít nhất 2 giờ.' : this.EditCount(ve) >= 2 ? 'Đơn đã đạt giới hạn 2 lần chỉnh sửa.' : this.CoTheSua(ve) ? '' : 'Vé không còn hiệu lực.'; }
  ValidName = validName; ValidPhone = validPhone; ValidEmail = validEmail; NormalizedName = normalizedName;
  SanitizePhone(value: string) { this.editSdt.set(value.replace(/\D/g, '').slice(0, 10)); }
  EditValid() { const ve = this.veDuocChon(); return !this.processing() && !!ve && this.NhomVeCungDon(ve).every(v => this.CoTheSua(v) && validName(this.editPassengers()[v.MaVe] ?? '')) && this.CoTheSua(ve) && (!this.CoTheSuaMaGiamGia(ve) || !this.editMaGiamGia().trim() || couponResult(this.editMaGiamGia(), this.tuyenList.find(t => t.name === ve.TenTuyenXe)?.id ?? '', this.NhomVeCungDon(ve).reduce((sum, t) => sum + t.GiaVe + (t.GiamGia || 0), 0)).valid) && validName(this.editTen()) && validPhone(this.editSdt()) && validEmail(this.editEmail()) && this.LayDiemDonTheoTuyen(ve.TenTuyenXe).includes(this.editDiemDon()) && this.LayDiemTraTheoTuyen(ve.TenTuyenXe).includes(this.editDiemTra()); }
  async FinishRefund(success: boolean) {
    const selected = this.veDuocChon(); if (!selected || this.processing() || (!['refund-processing','refund-failed'].includes(selected.paymentStatus || '') && !['processing','failed'].includes(selected.refundStatus || ''))) return;
    this.processing.set(true); await new Promise(r => setTimeout(r, 500));
    const next = this.danhSachVe().map(v => v.MaVe === selected.MaVe ? { ...v,
      paymentStatus: v.TrangThaiVe === 'da-huy' ? success ? 'refunded' as const : 'refund-failed' as const : v.paymentStatus,
      refundStatus: success ? 'completed' as const : 'failed' as const,
      refundedAt: success ? new Date().toISOString() : undefined,
      refundedAmount: (v.refundedAmount || 0) + (success ? v.refundAmount || 0 : 0),
      membershipPoints: v.TrangThaiVe === 'da-huy' ? 0 : Math.floor(v.GiaVe / 10000),
      TrangThaiGiaoDich: success ? 'da-hoan' as const : 'chua-hoan' as const } : v);
    this.danhSachVe.set(next); this.LuuDuLieu(next); this.veDuocChon.set(next.find(v => v.MaVe === selected.MaVe)!); this.processing.set(false);
    this.HienToast(success ? 'Đã hoàn tiền.' : 'Hoàn tiền thất bại. Vui lòng thử lại.', success ? 'success' : 'danger');
  }
  async MockOnlinePayment(success: boolean) {
    const selected = this.veDuocChon(); if (!selected || selected.bookingSource !== 'online' || normalizeTicket(selected).orderStatus !== 'held' || this.processing()) return;
    if (success) { this.MoXacNhanThanhToan(); return; }
    this.processing.set(true); await new Promise(r => setTimeout(r, 400)); this.refreshExpiry();
    const next = this.danhSachVe().map(v => v.MaDonHang === selected.MaDonHang && normalizeTicket(v).orderStatus === 'held' ? { ...v, paymentStatus: 'failed' as const } : v);
    this.danhSachVe.set(next); this.LuuDuLieu(next); this.veDuocChon.set(next.find(v => v.MaVe === selected.MaVe)!); this.processing.set(false);
  }
  readonly storageKey = 'viago_ticket_bookings_v3';

  readonly danhSachXe: XeKhach[] = [
    { maXe: 'LIMO01', tenXe: 'VIAGO Limousine 01', bienSo: '51B-123.45', loaiXe: 'limousine', soCho: 9 },
    { maXe: 'LIMO02', tenXe: 'VIAGO Limousine 02', bienSo: '51B-234.56', loaiXe: 'limousine', soCho: 9 },
    { maXe: 'LIMO03', tenXe: 'VIAGO Limousine 03', bienSo: '51B-345.67', loaiXe: 'limousine', soCho: 9 },
    { maXe: 'GN01', tenXe: 'VIAGO Giường Nằm 01', bienSo: '51F-456.78', loaiXe: 'giuong-nam', soCho: 34 },
    { maXe: 'GN02', tenXe: 'VIAGO Giường Nằm 02', bienSo: '51F-567.89', loaiXe: 'giuong-nam', soCho: 34 },
    { maXe: 'GN03', tenXe: 'VIAGO Giường Nằm 03', bienSo: '51F-678.90', loaiXe: 'giuong-nam', soCho: 34 },
    { maXe: 'CAB01', tenXe: 'VIAGO Cabin 01', bienSo: '51F-789.12', loaiXe: 'cabin', soCho: 22 },
    { maXe: 'CAB02', tenXe: 'VIAGO Cabin 02', bienSo: '51F-890.23', loaiXe: 'cabin', soCho: 22 },
    { maXe: 'CAB03', tenXe: 'VIAGO Cabin 03', bienSo: '51F-901.34', loaiXe: 'cabin', soCho: 22 },
    { maXe: 'GN04', tenXe: 'VIAGO Giường Nằm 04', bienSo: '51F-112.45', loaiXe: 'giuong-nam', soCho: 34 }
  ];

  readonly giaCoSoTheoTuyen: Record<string, number> = {
    'TP.HCM ↔ Cần Thơ': 180000,
    'TP.HCM ↔ Vũng Tàu': 180000,
    'Đà Lạt ↔ Buôn Ma Thuột': 220000,
    'Đà Lạt ↔ Nha Trang': 220000,
    'Cần Thơ ↔ Rạch Giá': 180000,
    'TP.HCM ↔ Phan Thiết': 220000,
    'TP.HCM ↔ Đà Lạt': 320000,
    'TP.HCM ↔ Nha Trang': 420000,
    'Nha Trang ↔ Đà Nẵng': 380000
  };

  readonly seatLayouts: Record<LoaiXeId, string[]> = {
    limousine: ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A'],
    'giuong-nam': [
      '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A', '13A', '14A', '15A', '16A', '17A',
      '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B', '13B', '14B', '15B', '16B', '17B'
    ],
    cabin: ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A', '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B']
  };

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  danhSachVe = signal<VeXe[]>([]);

  traCuuSdt = signal('');
  traCuuMaDonHang = signal('');
  loiTraCuuDonHang = signal('');
  maDonHangDangXem = signal('');
  maDonHangTimThay = signal<string[]>([]);

  tuKhoa = signal('');
  locTuyen = signal('');
  locNgay = signal('');
  locTrangThaiVe = signal('tat-ca');
  locTrangThaiDonHang = signal('tat-ca');
  trangHienTai = signal(1);
  soDongMoiTrang = signal(8);

  veDuocChon = signal<VeXe | null>(null);
  showDetailModal = signal(false);
  showEditModal = signal(false);
  showCancelModal = signal(false);
  showCancelConfirmModal = signal(false);
  showPrintModal = signal(false);
  showConfirmChangesModal = signal(false);
  veDangIn = signal<VeXe[]>([]);
  danhSachThayDoi = signal<{ truong: string; nhan: string; cu: string; moi: string }[]>([]);

  editTen = signal('');
  editSdt = signal('');
  editEmail = signal('');
  editDiemDon = signal('');
  editDiemTra = signal('');
  editThanhToan = signal<TrangThaiDonHang>('cho-thanh-toan');
  editHinhThuc = signal<PhuongThucThanhToan>('tien-mat');
  editMaGiamGia = signal('');
  editGiamGia = signal(0);
  editGhiChu = signal('');
  editNguonDat = signal<NguonDat>('tai-quay');
  showTuyenSuggestions = signal(false);
  showPromoSuggestions = signal(false);
  showTransferModal = signal(false);
  selectedNewSeat = signal('');
  selectedNewCabinType = signal<'don' | 'doi'>('don');

  showPaymentConfirmModal = signal(false);

  editTamTinh = computed(() => {
    const selected = this.veDuocChon();
    if (!selected) return 0;
    return this.NhomVeCungDon(selected).reduce((sum, v) => sum + v.GiaVe + (v.GiamGia || 0), 0);
  });

  editSoTienGiam = computed(() => {
    const selected = this.veDuocChon(); if (!selected) return 0;
    if (!this.CoTheSuaMaGiamGia(selected)) return this.NhomVeCungDon(selected).reduce((sum, v) => sum + (v.GiamGia || 0), 0);
    return couponResult(this.editMaGiamGia(), this.tuyenList.find(t => t.name === selected.TenTuyenXe)?.id ?? '', this.editTamTinh()).amount;
  });

  editTongTien = computed(() => {
    return Math.max(0, this.editTamTinh() - this.editSoTienGiam());
  });

  lichSuGiaoDichKhach = computed(() => {
    const selected = this.veDuocChon();
    if (!selected) return [];
    const sdt = selected.SdtNguoiDi.trim();
    const cleanInput = sdt.replace(/\D/g, '');
    return this.danhSachVe()
      .filter(v => v.SdtNguoiDi.replace(/\D/g, '') === cleanInput)
      .sort((a, b) => this.NewestFirst(a, b));
  });

  CapNhatMaGiamGia(value: string) {
    this.editMaGiamGia.set(value.toUpperCase());
  }

  SelectPromoCode(code: string) {
    this.editMaGiamGia.set(code);
    this.showPromoSuggestions.set(false);
  }

  onPromoBlur() {
    setTimeout(() => this.showPromoSuggestions.set(false), 200);
  }

  readonly maGiamGiaList = [
    { code: '', label: 'Không dùng mã giảm giá', amount: 0 },
    { code: 'VIP10', label: 'VIP10 - giảm 10%', amount: 0, percent: 10 },
    { code: 'VIAGO50', label: 'VIAGO50 - giảm 50.000đ', amount: 50000 }
  ];

  applyCancelToGroup = signal(false);
  applyUpdateToGroup = signal(true);
  applyPaymentToGroup = signal(true);
  cancelStaff = signal(this.currentUser.name);

  selectedCancelReason = signal('Khách yêu cầu');

  readonly cancelReasons = ['Khách yêu cầu', 'Đổi lịch', 'Đổi chuyến', 'Lỗi đặt vé', 'Khác'];

  readonly cancelPolicies = [
    { title: 'Hoàn 100%', description: 'Hủy trước 24 giờ khởi hành: hoàn 100% giá trị vé.' },
    { title: 'Hoàn 50%', description: 'Hủy từ 12 đến 24 giờ trước khởi hành: hoàn 50% giá trị vé.' },
    { title: 'Không hoàn', description: 'Hủy dưới 12 giờ trước khởi hành: không hoàn tiền.' }
  ];

  toast = signal<{ msg: string; type: 'success' | 'danger' } | null>(null);

  tuyenList = [
    { id: 'tat-ca', name: 'Tất cả tuyến' },
    { id: 'TP.HCM ↔ Cần Thơ', name: 'TP.HCM ↔ Cần Thơ' },
    { id: 'TP.HCM ↔ Vũng Tàu', name: 'TP.HCM ↔ Vũng Tàu' },
    { id: 'Đà Lạt ↔ Buôn Ma Thuột', name: 'Đà Lạt ↔ Buôn Ma Thuột' },
    { id: 'Đà Lạt ↔ Nha Trang', name: 'Đà Lạt ↔ Nha Trang' },
    { id: 'Cần Thơ ↔ Rạch Giá', name: 'Cần Thơ ↔ Rạch Giá' },
    { id: 'TP.HCM ↔ Phan Thiết', name: 'TP.HCM ↔ Phan Thiết' },
    { id: 'TP.HCM ↔ Đà Lạt', name: 'TP.HCM ↔ Đà Lạt' },
    { id: 'TP.HCM ↔ Nha Trang', name: 'TP.HCM ↔ Nha Trang' },
    { id: 'Nha Trang ↔ Đà Nẵng', name: 'Nha Trang ↔ Đà Nẵng' }
  ];

  private readonly diemTheoTuyen: Record<string, { don: string[]; tra: string[] }> = {
    'TP.HCM ↔ Cần Thơ': {
      don: ['Bến xe Miền Đông Mới', 'Bến xe Miền Tây', 'Văn phòng Quận 1', 'Văn phòng Quận 5', 'Văn phòng Quận 10', 'Ngã tư Thủ Đức', 'Ngã tư An Sương', 'Suối Tiên'],
      tra: ['Bến xe Trung tâm Cần Thơ', 'Văn phòng Ninh Kiều', 'Bến Ninh Kiều', 'Đại học Cần Thơ']
    },
    'TP.HCM ↔ Vũng Tàu': {
      don: ['Bến xe Miền Đông Mới', 'Bến xe Miền Tây', 'Văn phòng Quận 1', 'Văn phòng Quận 5', 'Văn phòng Quận 10', 'Ngã tư Thủ Đức', 'Ngã tư An Sương', 'Suối Tiên'],
      tra: ['Bến xe Vũng Tàu', 'Văn phòng Vũng Tàu', 'Bãi Sau', 'Bãi Trước']
    },
    'Đà Lạt ↔ Buôn Ma Thuột': {
      don: ['Bến xe Liên Tỉnh Đà Lạt', 'Chợ Đà Lạt', 'Hồ Xuân Hương', 'Quảng trường Lâm Viên'],
      tra: ['Bến xe Phía Nam Buôn Ma Thuột', 'Ngã Sáu Buôn Ma Thuột', 'Coopmart Buôn Ma Thuột']
    },
    'Đà Lạt ↔ Nha Trang': {
      don: ['Bến xe Liên Tỉnh Đà Lạt', 'Chợ Đà Lạt', 'Hồ Xuân Hương', 'Quảng trường Lâm Viên'],
      tra: ['Bến xe phía Nam Nha Trang', 'Ga Nha Trang', 'Quảng trường 2/4', 'Vinpearl Harbour']
    },
    'Cần Thơ ↔ Rạch Giá': {
      don: ['Bến xe Trung tâm Cần Thơ', 'Văn phòng Ninh Kiều', 'Bến Ninh Kiều', 'Đại học Cần Thơ'],
      tra: ['Bến xe Rạch Giá', 'Bến tàu Rạch Giá', 'Văn phòng Rạch Giá']
    },
    'TP.HCM ↔ Phan Thiết': {
      don: ['Bến xe Miền Đông Mới', 'Bến xe Miền Tây', 'Văn phòng Quận 1', 'Văn phòng Quận 5', 'Văn phòng Quận 10', 'Ngã tư Thủ Đức', 'Ngã tư An Sương', 'Suối Tiên'],
      tra: ['Bến xe Phan Thiết', 'Chợ Phan Thiết', 'Mũi Né', 'NovaWorld Phan Thiết']
    },
    'TP.HCM ↔ Đà Lạt': {
      don: ['Bến xe Miền Đông Mới', 'Bến xe Miền Tây', 'Văn phòng Quận 1', 'Văn phòng Quận 5', 'Văn phòng Quận 10', 'Ngã tư Thủ Đức', 'Ngã tư An Sương', 'Suối Tiên'],
      tra: ['Bến xe Liên Tỉnh Đà Lạt', 'Chợ Đà Lạt', 'Hồ Xuân Hương', 'Quảng trường Lâm Viên']
    },
    'TP.HCM ↔ Nha Trang': {
      don: ['Bến xe Miền Đông Mới', 'Bến xe Miền Tây', 'Văn phòng Quận 1', 'Văn phòng Quận 5', 'Văn phòng Quận 10', 'Ngã tư Thủ Đức', 'Ngã tư An Sương', 'Suối Tiên'],
      tra: ['Bến xe phía Nam Nha Trang', 'Ga Nha Trang', 'Quảng trường 2/4', 'Vinpearl Harbour']
    },
    'Nha Trang ↔ Đà Nẵng': {
      don: ['Bến xe phía Nam Nha Trang', 'Ga Nha Trang', 'Quảng trường 2/4', 'Vinpearl Harbour'],
      tra: ['Bến xe Trung tâm Đà Nẵng', 'Sân bay Đà Nẵng', 'Công viên Biển Đông', 'Cầu Rồng']
    }
  };

  private readonly maXeTheoTuyenId: Record<string, string> = {
    'HCM-CT': 'LIMO01',
    'HCM-VT': 'LIMO02',
    'DL-BMT': 'GN02',
    'DL-NT': 'CAB01',
    'CT-RG': 'GN03',
    'HCM-PT': 'GN04',
    'HCM-DL': 'CAB02',
    'HCM-NT': 'GN01',
    'NT-DN': 'CAB03'
  };

  goiYTuyen = computed(() => {
    const routes = [
      ...this.tuyenList.filter(tuyen => tuyen.id !== 'tat-ca').map(tuyen => this.HienThiTuyen(tuyen.name)),
      ...this.danhSachVe().map(ve => this.HienThiTuyen(ve.TenTuyenXe))
    ];

    return Array.from(new Set(routes)).sort((a, b) => a.localeCompare(b, 'vi'));
  });

  goiYTuyenLoc = computed(() => {
    const query = this.locTuyen();
    if (!query) return this.goiYTuyen();
    return this.goiYTuyen().filter(tuyen => this.KhopLocTuyenMotChieu(tuyen, query));
  });

  danhSachLoc = computed(() => {
    const query = this.tuKhoa();
    const queryDigits = query.replace(/\D/g, '');
    const tuyen = this.locTuyen();
    const ngay = this.locNgay();
    const trangThai = this.locTrangThaiVe();
    const trangThaiDonHang = this.locTrangThaiDonHang();

    return this.danhSachVe()
      .filter(v => {
        const keyword = [
          v.MaDonHang,
          v.MaVe,
          v.HoTenNguoiDi,
          v.SdtNguoiDi,
          v.SoGhe,
          v.TenTuyenXe,
          v.NgayKhoiHanh,
          this.DinhDangNgay(v.NgayKhoiHanh),
          v.GioKhoiHanh,
          v.MaDiemDon,
          v.MaDiemTra,
          v.MaXe,
          v.LoaiXe,
          v.LoaiGhe,
          v.TenXe,
          v.BienSoXe,
          v.MaLichTrinh
        ].join(' ');
        const ticketDigits = [v.SdtNguoiDi, v.MaDonHang, v.MaVe].join(' ').replace(/\D/g, '');
        const matchSearch = query ? this.MatchSearchText(keyword, query) || (queryDigits ? ticketDigits.includes(queryDigits) : false) : true;
        const matchTuyen = tuyen ? this.KhopLocTuyenMotChieu(v.TenTuyenXe, tuyen) : true;
        const matchNgay = ngay ? v.NgayKhoiHanh === ngay : true;
        const matchTrangThai = this.KhopTrangThaiLoc(v, trangThai);
        const matchTrangThaiDonHang = this.KhopTrangThaiDonHangLoc(v, trangThaiDonHang) && (this.locNguonDat() === 'tat-ca' || (v.bookingSource || v.NguonDat) === this.locNguonDat());

        return matchSearch &&
          matchTuyen &&
          matchNgay &&
          matchTrangThai &&
          matchTrangThaiDonHang;
      })
      .sort((a, b) => this.NewestFirst(a, b));
  });

  veTrongDonDangXem = computed(() => {
    const maDonHang = this.maDonHangDangXem();
    if (!maDonHang) return [];

    return this.danhSachVe()
      .filter(ve => ve.MaDonHang === maDonHang)
      .sort((a, b) => this.SoThuTuGhe(a.SoGhe) - this.SoThuTuGhe(b.SoGhe));
  });

  donHangDangXem = computed(() => {
    const tickets = this.veTrongDonDangXem();
    return tickets.length > 0 ? tickets[0] : null;
  });

  donHangTimThay = computed<DonHangTraCuu[]>(() => {
    return this.maDonHangTimThay()
      .map(maDonHang => {
        const tickets = this.danhSachVe()
          .filter(ve => ve.MaDonHang === maDonHang)
          .sort((a, b) => this.SoThuTuGhe(a.SoGhe) - this.SoThuTuGhe(b.SoGhe));

        const daiDien = tickets[0];
        if (!daiDien) return null;

        const veHieuLuc = tickets.filter(ve => ve.TrangThaiVe !== 'da-huy');
        return {
          MaDonHang: maDonHang,
          DaiDien: daiDien,
          SoVe: tickets.length,
          SoVeHieuLuc: veHieuLuc.length,
          TongHieuLuc: veHieuLuc.reduce((sum, ve) => sum + ve.GiaVe, 0),
          Ghe: tickets.map(ve => ve.SoGhe).join(', ')
        };
      })
      .filter((item): item is DonHangTraCuu => !!item);
  });

  tongGiaTriDonDangXem = computed(() => {
    return this.veTrongDonDangXem().reduce((sum, ve) => sum + ve.GiaVe, 0);
  });

  tongGiaTriDonHieuLuc = computed(() => {
    return this.veTrongDonDangXem()
      .filter(ve => ve.TrangThaiVe !== 'da-huy')
      .reduce((sum, ve) => sum + ve.GiaVe, 0);
  });

  thongKe = computed(() => {
    const list = this.danhSachLoc();
    const paid = (v: VeXe) => v.paidAmount ?? (v.TrangThaiDonHang === 'da-thanh-toan' ? v.GiaVe : 0);
    const refunded = (v: VeXe) => v.refundStatus === 'completed' || v.paymentStatus === 'refunded';
    const refund = (v: VeXe) => v.refundAmount ?? 0;
    const completed = (v: VeXe) => v.refundedAmount ?? (refunded(v) ? refund(v) : 0);
    return { tong: list.length, daBan: list.filter(v => v.TrangThaiDonHang === 'da-thanh-toan' && v.TrangThaiVe !== 'da-huy').length,
      giuCho: list.filter(v => v.TrangThaiVe !== 'da-huy' && (v.TrangThaiDonHang !== 'da-thanh-toan' || (v.balanceDue || 0) > 0)).length,
      daHuy: list.filter(v => v.TrangThaiVe === 'da-huy').length,
      doanhThu: list.reduce((sum,v) => sum + paid(v) - completed(v), 0),
      choHoan: list.filter(v => !refunded(v)).reduce((sum,v) => sum + refund(v), 0),
      daHoan: list.reduce((sum,v) => sum + completed(v), 0) };
  });

  tongTrang = computed(() => {
    return Math.max(1, Math.ceil(this.danhSachLoc().length / this.soDongMoiTrang()));
  });

  trangHopLe = computed(() => {
    return Math.min(Math.max(this.trangHienTai(), 1), this.tongTrang());
  });

  danhSachPhanTrang = computed(() => {
    const start = (this.trangHopLe() - 1) * this.soDongMoiTrang();
    return this.danhSachLoc().slice(start, start + this.soDongMoiTrang());
  });

  chiSoDauTrang = computed(() => {
    if (this.danhSachLoc().length === 0) return 0;
    return (this.trangHopLe() - 1) * this.soDongMoiTrang() + 1;
  });

  chiSoCuoiTrang = computed(() => {
    return Math.min(this.trangHopLe() * this.soDongMoiTrang(), this.danhSachLoc().length);
  });

coThayDoiSua = computed(() => {
    const selected = this.veDuocChon();
    if (!selected) return false;
    const canEditDiscount = this.CoTheSuaMaGiamGia(selected);

    return (
      this.NhomVeCungDon(selected).some(v => normalizedName(this.editPassengers()[v.MaVe] || '') !== this.PassengerName(v)) ||
      this.editTen().trim() !== selected.HoTenNguoiDi ||
      this.editSdt().trim() !== selected.SdtNguoiDi ||
      this.editEmail().trim() !== (selected.EmailNguoiDi || '') ||
      this.editDiemDon().trim() !== selected.MaDiemDon ||
      this.editDiemTra().trim() !== selected.MaDiemTra ||
      this.editThanhToan() !== selected.TrangThaiDonHang ||
      this.editHinhThuc() !== selected.PhuongThucThanhToan ||
      (canEditDiscount && this.editMaGiamGia().trim() !== (selected.MaGiamGia || '')) ||
      this.editGhiChu().trim() !== this.LayGhiChuSach(selected.GhiChu) ||
      this.editNguonDat() !== (selected.NguonDat || 'tai-quay')
    );
  });

  constructor(private route: ActivatedRoute, private router: Router, private sidebarState: SidebarStateService) { }

  ngAfterViewInit() {
    setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
  }

  ngOnInit() {
    if (window.innerWidth < 768) this.sidebarState.collapse();
    this.clockTimer = setInterval(() => this.refreshExpiry(), 1000);
    this.TaiDuLieu();
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey) {
        this.TaiDuLieu();
      }
    });

    this.route.queryParams.subscribe(params => {
      const editVal = params['edit'];
      const searchVal = editVal || params['search'];
      const actionVal = String(params['action'] ?? '').toLowerCase();
      if (searchVal) {
        this.tuKhoa.set(searchVal);
        const ve = this.danhSachVe().find(v => v.MaVe === searchVal);
        if (ve) {
          this.veDuocChon.set(ve);
          this.showDetailModal.set(false);
          this.showEditModal.set(false);
          if ((editVal || actionVal === 'edit') && this.CoTheSua(ve)) {
            this.NapFormSua(ve);
            this.showEditModal.set(true);
          } else {
            this.showDetailModal.set(true);
          }
        }

        // Immediately clean up URL parameters to prevent browser back loop issues
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { search: null, action: null, edit: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });
  }

  ChonVe(ve: VeXe) {
    this.resendState.set('idle');
    this.veDuocChon.set(ve);
    this.NapFormSua(ve);
    this.showDetailModal.set(true);
  }

  TraCuuDonHang() {
    let phone = this.traCuuSdt().replace(/\D/g, '');
    let orderCode = this.traCuuMaDonHang().trim().toUpperCase();
    const keyword = this.tuKhoa().trim();

    if (!phone && !orderCode && keyword) {
      const keywordDigits = keyword.replace(/\D/g, '');
      if (keywordDigits.length >= 9 && !/[A-Za-zÀ-ỹ]/.test(keyword)) {
        phone = keywordDigits;
      } else {
        orderCode = keyword.toUpperCase();
      }
    }

    if (!phone && !orderCode) {
      this.loiTraCuuDonHang.set('Nhập số điện thoại hoặc mã đơn hàng để tra cứu.');
      this.maDonHangDangXem.set('');
      this.maDonHangTimThay.set([]);
      return;
    }

    const orderTickets = this.danhSachVe().filter(ve =>
      (phone ? ve.SdtNguoiDi.replace(/\D/g, '').includes(phone) : true) &&
      (orderCode ? (ve.MaDonHang || '').toUpperCase() === orderCode || ve.MaVe.toUpperCase() === orderCode : true)
    );

    if (orderTickets.length === 0) {
      this.loiTraCuuDonHang.set('Không tìm thấy đơn hàng phù hợp.');
      this.maDonHangDangXem.set('');
      this.maDonHangTimThay.set([]);
      return;
    }

    const orderCodes = Array.from(new Set(orderTickets.map(ve => ve.MaDonHang || ve.MaVe)));
    this.loiTraCuuDonHang.set('');
    this.maDonHangTimThay.set(orderCodes);
    this.maDonHangDangXem.set(orderCodes.length === 1 ? orderCodes[0] : '');
    this.tuKhoa.set(orderCode || phone);
    this.trangHienTai.set(1);
  }

  CapNhatTuKhoa(value: string) {
    this.tuKhoa.set(value);
    this.loiTraCuuDonHang.set('');
    this.trangHienTai.set(1);
  }

  TimKiemTongHop() {
    const keyword = this.tuKhoa().trim();
    if (!keyword) {
      this.trangHienTai.set(1);
      return;
    }

    const keywordDigits = keyword.replace(/\D/g, '');
    const upperKeyword = keyword.toUpperCase();
    const looksLikeOrder = /^(DH|VE)[A-Z0-9-]+$/.test(upperKeyword);
    const looksLikePhone = keywordDigits.length >= 4 && !/[A-Za-zÀ-ỹ]/.test(keyword);

    if (looksLikeOrder || looksLikePhone) {
      this.TraCuuDonHang();
      return;
    }

    this.maDonHangDangXem.set('');
    this.maDonHangTimThay.set([]);
    this.loiTraCuuDonHang.set('');
    this.trangHienTai.set(1);
  }

  ApDungBoLoc() {
    if (this.traCuuMaDonHang().trim() || this.traCuuSdt().trim()) {
      this.TraCuuDonHang();
      return;
    }
    this.TimKiemTongHop();
  }

  ChonDonHangTraCuu(maDonHang: string) {
    this.maDonHangDangXem.set(maDonHang);
    this.tuKhoa.set(maDonHang);
    this.trangHienTai.set(1);
  }

  DongTraCuuDonHang() {
    this.maDonHangDangXem.set('');
    this.maDonHangTimThay.set([]);
    this.loiTraCuuDonHang.set('');
    this.traCuuSdt.set('');
    this.traCuuMaDonHang.set('');
    this.tuKhoa.set('');
    this.trangHienTai.set(1);
  }

  MoSuaDonHangTuVe(ve: VeXe) {
    if (!this.CoTheSua(ve)) return;
    this.veDuocChon.set(ve);
    this.NapFormSua(ve);
    this.applyUpdateToGroup.set(true);
    this.showDetailModal.set(false);
    this.showEditModal.set(true);
  }

  MoHuyTungVe(ve: VeXe) {
    if (!this.CoTheHuy(ve)) {
      this.HienToast('Vé này không còn ở trạng thái có thể hủy.', 'danger');
      return;
    }

    this.veDuocChon.set(ve);
    this.NapFormSua(ve);
    this.applyCancelToGroup.set(false);
    this.selectedCancelReason.set('Khách yêu cầu'); this.cancellationOther.set('');
    this.showDetailModal.set(false);
    this.showCancelModal.set(true);
  }

  MoInVeRieng(ve: VeXe) {
    this.MoPrintModal(ve, 'ticket');
  }

  MoInDonHang(ve: VeXe) {
    this.MoPrintModal(ve, 'order');
  }

  DongTatCaModal() {
    this.showDetailModal.set(false);
    this.showEditModal.set(false);
    this.showCancelModal.set(false);
    this.showCancelConfirmModal.set(false);
    this.showPrintModal.set(false);
    this.veDangIn.set([]);
  }

  MoEditModal() {
    const selected = this.veDuocChon();
    if (!selected || !this.CoTheSua(selected)) return;
    this.NapFormSua(selected);
    this.applyUpdateToGroup.set(true);
    this.showEditModal.set(true);
  }

  LuuSuaThongTin() {
    const selected = this.veDuocChon();
    if (!selected || !this.EditValid()) return;
    this.editTen.set(normalizedName(this.editTen()));

    if (!this.editTen().trim()) {
      this.HienToast('Vui lòng nhập họ tên hành khách.', 'danger');
      return;
    }

    const cleanPhone = this.editSdt().trim();
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(cleanPhone)) {
      this.HienToast('Số điện thoại không đúng định dạng Việt Nam (phải gồm 10 số bắt đầu bằng 03, 05, 07, 08, 09).', 'danger');
      return;
    }

    if (!this.coThayDoiSua()) {
      this.HienToast('Thông tin đơn hàng chưa có thay đổi.', 'danger');
      return;
    }

    const list: { truong: string; nhan: string; cu: string; moi: string }[] = [];
    const compare = (field: string, label: string, oldVal: string, newVal: string) => {
      if (oldVal.trim() !== newVal.trim()) {
        list.push({ truong: field, nhan: label, cu: oldVal, moi: newVal });
      }
    };

    compare('HoTenNguoiDi', 'Người đặt', selected.HoTenNguoiDi || '', this.editTen());
    compare('SdtNguoiDi', 'SỐ ĐIỆN THOẠI', selected.SdtNguoiDi || '', this.editSdt());
    compare('EmailNguoiDi', 'EMAIL', selected.EmailNguoiDi || '', this.editEmail());
    compare('MaDiemDon', 'ĐIỂM ĐÓN', selected.MaDiemDon || '', this.editDiemDon());
    compare('MaDiemTra', 'ĐIỂM TRẢ', selected.MaDiemTra || '', this.editDiemTra());
    compare('PhuongThucThanhToan', 'HÌNH THỨC THANH TOÁN', this.LabelHinhThuc(selected.PhuongThucThanhToan), this.LabelHinhThuc(this.editHinhThuc()));
    compare('TrangThaiDonHang', 'TRẠNG THÁI THANH TOÁN', this.LabelThanhToan(selected.TrangThaiDonHang), this.LabelThanhToan(this.editThanhToan()));
    if (this.CoTheSuaMaGiamGia(selected)) {
      compare('MaGiamGia', 'MÃ GIẢM GIÁ', selected.MaGiamGia || 'Không dùng', this.editMaGiamGia().trim().toUpperCase() || 'Không dùng');
    }
    compare('NguonDat', 'NGUỒN ĐẶT', this.LabelNguonDat(selected.NguonDat), this.LabelNguonDat(this.editNguonDat()));
    compare('GhiChu', 'GHI CHÚ', selected.GhiChu || '', this.editGhiChu());

    for (const v of this.NhomVeCungDon(selected)) compare('passenger-' + v.MaVe, 'Hành khách ghế ' + v.SoGhe, this.PassengerName(v), normalizedName(this.editPassengers()[v.MaVe] || this.PassengerName(v)));
    this.danhSachThayDoi.set(list);
    this.showConfirmChangesModal.set(true);
  }

  async XacNhanLuuThayDoi() {
    const selected = this.veDuocChon();
    if (!selected || !this.EditValid()) return;

    this.processing.set(true); await new Promise(r => setTimeout(r, 400)); this.refreshExpiry();
    const groupTickets = this.NhomVeCungDon(selected);
    if (!groupTickets.every(v => this.CoTheSua(v))) { this.processing.set(false); this.HienToast('Đơn không còn đủ điều kiện chỉnh sửa.', 'danger'); return; }
    const groupIds = groupTickets.map(g => g.MaVe);

    const subtotal = groupTickets.reduce((sum, v) => sum + v.GiaVe + (v.GiamGia || 0), 0);
    const result = couponResult(this.editMaGiamGia(), this.tuyenList.find(t => t.name === selected.TenTuyenXe)?.id ?? '', subtotal);
    let discountRemaining = result.amount;
    const updated = this.danhSachVe().map(v => {
      if (!groupIds.includes(v.MaVe)) return v;

      const canEditDiscount = this.CoTheSuaMaGiamGia(v);
      const cleanNewCode = canEditDiscount ? this.editMaGiamGia().trim().toUpperCase() : (v.MaGiamGia || '');
      const basePrice = v.GiaVe + (v.GiamGia || 0);
      let finalDiscount = v.GiamGia || 0;
      let finalPrice = v.GiaVe;

      if (canEditDiscount) {
        const proportion = Math.min(basePrice, Math.floor(result.amount * basePrice / subtotal));
        finalDiscount = groupIds[groupIds.length - 1] === v.MaVe ? Math.min(basePrice, discountRemaining) : proportion;
        discountRemaining -= finalDiscount; finalPrice = basePrice - finalDiscount;
      }

      const next = {
        ...v,
        HoTenNguoiDi: this.editTen().trim(),
        SdtNguoiDi: this.editSdt().trim(),
        EmailNguoiDi: this.editEmail().trim(),
        MaDiemDon: this.editDiemDon().trim(),
        MaDiemTra: this.editDiemTra().trim(),
        TrangThaiDonHang: v.TrangThaiDonHang,
        PhuongThucThanhToan: v.TrangThaiDonHang === 'da-thanh-toan' ? v.PhuongThucThanhToan : this.editHinhThuc(),
        passengerName: normalizedName(this.editPassengers()[v.MaVe] || this.PassengerName(v)),
        MaGiamGia: cleanNewCode || undefined,
        GiamGia: finalDiscount,
        GiaVe: finalPrice,
        TongGiaVe: this.CoTheSuaMaGiamGia(selected) ? subtotal - result.amount : v.TongGiaVe,
        GhiChu: this.editGhiChu().trim(),
        NguonDat: v.NguonDat,
        SoLanDaSua: this.EditCount(selected) + 1
      };

      if (v.MaVe === selected.MaVe) {
        this.veDuocChon.set(next);
      }
      return next;
    });

    this.danhSachVe.set(updated);
    this.LuuDuLieu(updated);
    this.showConfirmChangesModal.set(false);
    this.showEditModal.set(false);
    this.processing.set(false);
    this.HienToast(`Đã cập nhật thông tin đơn hàng ${selected.MaDonHang || selected.MaVe} cho ${groupIds.length} vé.`, 'success');
  }

  DanhDauDaThanhToan() { this.MoXacNhanThanhToan(); }

  MoCancelModal() {
    const selected = this.veDuocChon();
    if (!selected || !this.CoTheHuy(selected)) return;
    this.selectedCancelReason.set('Khách yêu cầu'); this.cancellationOther.set('');
    this.applyCancelToGroup.set(false);
    this.showCancelModal.set(true);
  }

  MoCancelConfirmModal() {
    if (this.selectedCancelReason() === 'Khác' && !this.cancellationOther().trim()) return;
    this.showCancelConfirmModal.set(true);
  }

  TieuDeXacNhanHuy() {
    return this.applyCancelToGroup()
      ? 'Bạn có chắc chắn muốn hủy toàn bộ vé hiệu lực trong đơn không?'
      : 'Bạn có chắc chắn muốn hủy vé này không?';
  }

  MoTaXacNhanHuy(ve: VeXe) {
    if (this.applyCancelToGroup()) {
      return `${this.LaySoLuongGheLienQuan(ve)} vé hiệu lực trong đơn ${ve.MaDonHang || ve.MaVe} sẽ chuyển sang trạng thái "Đã hủy".`;
    }

    return `Vé ${ve.MaVe} sẽ chuyển sang trạng thái "Đã hủy".`;
  }

  async XacNhanHuyVeXe() {
    if (this.processing()) return;
    const selected = this.veDuocChon();
    if (!selected || !this.CoTheHuy(selected)) return;
    if (this.selectedCancelReason() === 'Khác' && !this.cancellationOther().trim()) return;
    this.processing.set(true); await new Promise(r => setTimeout(r, 350));
    if (!this.CoTheHuy(selected) || (this.applyCancelToGroup() && !this.NhomVeCungDon(selected).every(v => this.CoTheHuy(v)))) { this.processing.set(false); return; }

    if (!this.selectedCancelReason().trim()) {
      this.processing.set(false);
      this.HienToast('Vui lòng chọn lý do hủy vé.', 'danger');
      return;
    }

    const cancelGroup = this.applyCancelToGroup();
    const groupTickets = cancelGroup ? this.NhomVeCungDon(selected) : [selected];
    const groupIds = groupTickets.map(g => g.MaVe);

    const bayGio = new Date();
    const hh = String(bayGio.getHours()).padStart(2, '0');
    const mm = String(bayGio.getMinutes()).padStart(2, '0');
    const dd = String(bayGio.getDate()).padStart(2, '0');
    const MM = String(bayGio.getMonth() + 1).padStart(2, '0');
    const yyyy = bayGio.getFullYear();
    const thoiGianHuy = `${hh}:${mm} ngày ${dd}/${MM}/${yyyy}`;

    const updated = this.danhSachVe().map(v => {
      if (!groupIds.includes(v.MaVe)) return v;

      const refund = this.TinhHoanTien(v);
      const cancelDetail = v.TrangThaiDonHang !== 'da-thanh-toan' ? `Hủy giữ chỗ - Lý do: ${this.selectedCancelReason() === 'Khác' ? this.cancellationOther().trim() : this.selectedCancelReason()}` : `Đã hủy lúc ${thoiGianHuy} - Lý do: ${this.selectedCancelReason() === 'Khác' ? this.cancellationOther().trim() : this.selectedCancelReason()} - Hoàn: ${refund.soTien.toLocaleString('vi-VN')} đ`;
      const note = [v.GhiChu || '', cancelDetail].filter(Boolean).join(' | ');

      const next = {
        ...v,
        TrangThaiVe: 'da-huy' as TrangThaiVe,
        orderStatus: 'cancelled' as const,
        paymentStatus: v.TrangThaiDonHang === 'da-thanh-toan' ? (refund.soTien > 0 ? 'refund-processing' as const : 'paid' as const) : v.paymentStatus, 
        GhiChu: note,
        NguoiHuy: this.currentUser.name,
        paidAmount: v.paidAmount ?? (v.TrangThaiDonHang === 'da-thanh-toan' ? v.GiaVe : 0),
        refundAmount: refund.soTien, refundFee: refund.phiHuy,
        refundReason: this.selectedCancelReason() === 'Khác' ? this.cancellationOther().trim() : this.selectedCancelReason(),
        refundStatus: refund.soTien > 0 ? 'processing' as const : undefined,
        membershipPoints: 0, pointsReversed: v.membershipPoints ?? Math.floor(v.GiaVe / 10000),
        balanceDue: 0,
        ThoiGianHuy: bayGio.toISOString(),
        TrangThaiGiaoDich: v.TrangThaiDonHang === 'da-thanh-toan' ? 'chua-hoan' as const : undefined
      };

      if (v.MaVe === selected.MaVe) {
        this.veDuocChon.set(next);
      }
      return next;
    });

    this.processing.set(false);
    this.danhSachVe.set(updated);
    this.LuuDuLieu(updated);
    this.showCancelModal.set(false);
    this.showCancelConfirmModal.set(false);
    this.HienToast(
      cancelGroup
        ? `Đã hủy ${groupIds.length} vé hiệu lực trong đơn ${selected.MaDonHang || selected.MaVe}.`
        : `Đã hủy vé ${selected.MaVe}.`,
      'success'
    );
  }

  MoPrintModal(ve?: VeXe, scope: 'ticket' | 'order' = 'order') {
    const selected = ve ?? this.veDuocChon();
    if (!selected) return;

    this.veDuocChon.set(selected);
    const tickets = scope === 'ticket' ? [selected] : this.NhomVeCungDon(selected);
    const printableTickets = tickets.filter(item => item.TrangThaiVe !== 'da-huy');
    if (printableTickets.length === 0) {
      this.HienToast('Đơn hàng này không còn vé hiệu lực để in.', 'danger');
      return;
    }

    this.veDangIn.set(printableTickets);
    this.showPrintModal.set(true);
  }

  InVeXe() {
    if (!this.veDangIn().length || this.printing()) return;
    this.printing.set(true); const ids = this.veDangIn().map(v => v.MaVe);
    const opened = printBookingReceipts(() => {
      const entry = { at: new Date().toISOString(), staff: this.currentUser.name };
      const next = this.danhSachVe().map(v => ids.includes(v.MaVe) ? { ...v, printHistory: [...(v.printHistory || []), entry] } : v);
      this.danhSachVe.set(next); this.LuuDuLieu(next); this.veDangIn.set(next.filter(v => ids.includes(v.MaVe)));
      const selected = this.veDuocChon(); if (selected) this.veDuocChon.set(next.find(v => v.MaVe === selected.MaVe)!);
      this.printing.set(false); this.HienToast('Đã hoàn tất luồng in.', 'success');
    });
    if (!opened) { this.printing.set(false); this.HienToast('Không có nội dung vé để in.', 'danger'); }
  }

  async GuiLaiThongBao() {
    const selected = this.veDuocChon(); if (!selected || this.resendState() === 'loading') return;
    this.resendState.set('loading'); await new Promise(r => setTimeout(r, 500));
    const success = validPhone(selected.SdtNguoiDi) && validEmail(selected.EmailNguoiDi || '');
    this.resendState.set(success ? 'success' : 'error');
    if (success) { const next = this.danhSachVe().map(v => v.MaDonHang === selected.MaDonHang ? { ...v, notificationAt: new Date().toISOString() } : v); this.danhSachVe.set(next); this.LuuDuLieu(next); }
    this.HienToast(success ? 'Đã gửi lại thông báo.' : 'Không thể gửi. Kiểm tra số điện thoại và email của người đặt.', success ? 'success' : 'danger');
  }

  XoaBoLoc() {
    this.tuKhoa.set('');
    this.traCuuSdt.set('');
    this.traCuuMaDonHang.set('');
    this.maDonHangDangXem.set('');
    this.maDonHangTimThay.set([]);
    this.loiTraCuuDonHang.set('');
    this.locTuyen.set('');
    this.showTuyenSuggestions.set(false);
    this.locNgay.set('');
    this.locTrangThaiVe.set('tat-ca'); this.locNguonDat.set('tat-ca');
    this.locTrangThaiDonHang.set('tat-ca');
    this.trangHienTai.set(1);
  }

  CapNhatLocTuyen(value: string) {
    this.locTuyen.set(value);
    this.showTuyenSuggestions.set(true);
    this.trangHienTai.set(1);
  }

  XoaLocTuyen() {
    this.locTuyen.set('');
    this.showTuyenSuggestions.set(false);
    this.trangHienTai.set(1);
  }

  CapNhatLocNgay(value: string) {
    this.locNgay.set(value);
    this.trangHienTai.set(1);
  }

  MoGoiYTuyen() {
    this.showTuyenSuggestions.set(true);
  }

  ToggleGoiYTuyen() {
    this.showTuyenSuggestions.set(!this.showTuyenSuggestions());
  }

  DongGoiYTuyenTre() {
    setTimeout(() => this.showTuyenSuggestions.set(false), 120);
  }

  ChonLocTuyen(tuyen: string) {
    this.locTuyen.set(this.HienThiTuyen(tuyen));
    this.showTuyenSuggestions.set(false);
    this.trangHienTai.set(1);
  }

  ChuyenTrang(page: number) {
    this.trangHienTai.set(Math.min(Math.max(page, 1), this.tongTrang()));
  }

  CapNhatSoDongMoiTrang(value: string) {
    this.soDongMoiTrang.set(Number(value));
    this.trangHienTai.set(1);
  }

  CapNhatTrangThaiThanhToan(value: string) {
    this.editThanhToan.set(value as TrangThaiDonHang);
  }

  CapNhatHinhThuc(value: string) {
    if (this.veDuocChon()?.TrangThaiDonHang !== 'da-thanh-toan' && ['tien-mat','chuyen-khoan','the'].includes(value)) this.editHinhThuc.set(value as PhuongThucThanhToan);
  }

  CapNhatCancelReason(value: string) {
    this.selectedCancelReason.set(value);
  }

  CoTheSua(ve: VeXe) { const t = normalizeTicket(ve); return (!ve.tripStatus || ve.tripStatus === 'open') && ['held','confirmed'].includes(t.orderStatus!) && this.SoGioTruocKhoiHanh(ve) >= 2 && this.EditCount(ve) < 2; }

  CoTheSuaMaGiamGia(ve: VeXe | null | undefined) { return !!ve && this.CoTheSua(ve) && ve.TrangThaiDonHang !== 'da-thanh-toan'; }

  CoTheHuy(ve: VeXe) { return ve.tripStatus !== 'departed' && ['held','confirmed'].includes(normalizeTicket(ve).orderStatus!) && this.SoGioTruocKhoiHanh(ve) > 0; }

  LayDiemDonTheoTuyen(tuyenName: string): string[] { return this.veDuocChon()?.ChieuTuyen === 've' ? this.diemTheoTuyen[tuyenName]?.tra ?? [] : this.diemTheoTuyen[tuyenName]?.don ?? []; }

  LayDiemTraTheoTuyen(tuyenName: string): string[] { return this.veDuocChon()?.ChieuTuyen === 've' ? this.diemTheoTuyen[tuyenName]?.don ?? [] : this.diemTheoTuyen[tuyenName]?.tra ?? []; }

  DinhDangNgay(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  LayGioCoMat(gio: string): string {
    const ve = this.veDuocChon();
    const offset = ve ? Math.max(0, this.LayDiemDonTheoTuyen(ve.TenTuyenXe).indexOf(ve.MaDiemDon)) * 10 : 0;
    const minutes = (Number(gio.slice(0, 2)) * 60 + Number(gio.slice(3)) + offset - 15 + 1440) % 1440;
    return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  }

  TinhHoanTien(ve: VeXe): HoanTienInfo {
    if (ve.TrangThaiDonHang !== 'da-thanh-toan') {
      return { tiLe: 0, soTien: 0, phiHuy: 0, moTa: 'Vé giữ chỗ, không phát sinh hoàn tiền' };
    }

    const paid = Math.min(ve.GiaVe, (ve.paidAmount ?? ve.GiaVe) - (ve.refundedAmount || 0));
    const gioConLai = this.SoGioTruocKhoiHanh(ve);
    if (gioConLai >= 24) {
      return { tiLe: 100, soTien: paid, phiHuy: 0, moTa: 'Trước giờ đi từ 24 giờ' };
    }

    if (gioConLai >= 12) {
      const soTien = Math.round(paid * 0.5);
      return { tiLe: 50, soTien, phiHuy: paid - soTien, moTa: 'Trước giờ đi từ 12 đến 24 giờ' };
    }

    return { tiLe: 0, soTien: 0, phiHuy: paid, moTa: 'Trước giờ đi dưới 12 giờ' };
  }

  SoGioTruocKhoiHanh(ve: VeXe) {
    const departure = new Date(`${ve.NgayKhoiHanh}T${ve.GioKhoiHanh}:00`);
    const diffMs = departure.getTime() - Date.now();
    return Math.max(0, diffMs / 36e5);
  }

  NhomVeCungDon(ticket: VeXe) {
    if (!ticket.MaDonHang) return ticket.TrangThaiVe === 'da-huy' ? [] : [ticket];
    const group = this.danhSachVe().filter(v =>
      v.MaDonHang === ticket.MaDonHang &&
      v.TrangThaiVe !== 'da-huy'
    );
    return group;
  }

  TatCaVeCungDon(ticket: VeXe) {
    if (!ticket.MaDonHang) return [ticket];
    const group = this.danhSachVe().filter(v => v.MaDonHang === ticket.MaDonHang);
    return group.length > 0 ? group : [ticket];
  }

  TongGiaTriDonHang(ve: VeXe | null | undefined): number {
    if (!ve) return 0;
    return this.TatCaVeCungDon(ve).reduce((sum, item) => sum + item.GiaVe, 0);
  }

  TongGiaTriVeHieuLuc(ve: VeXe | null | undefined): number {
    if (!ve) return 0;
    return this.TatCaVeCungDon(ve)
      .filter(item => item.TrangThaiVe !== 'da-huy')
      .reduce((sum, item) => sum + item.GiaVe, 0);
  }

  SoVeHieuLucTrongDon(ve: VeXe | null | undefined): number {
    if (!ve) return 0;
    return this.TatCaVeCungDon(ve).filter(item => item.TrangThaiVe !== 'da-huy').length;
  }

  LaySoLuongGheLienQuan(ve: VeXe): number {
    return this.NhomVeCungDon(ve).length;
  }

  TinhTongHoanTienNhom(ticket: VeXe): number {
    const group = this.NhomVeCungDon(ticket);
    return group.reduce((sum, v) => sum + this.TinhHoanTien(v).soTien, 0);
  }

  TinhTongPhiHuyNhom(ticket: VeXe): number {
    const group = this.NhomVeCungDon(ticket);
    return group.reduce((sum, v) => sum + this.TinhHoanTien(v).phiHuy, 0);
  }

  TinhTongGiaGocNhom(ticket: VeXe): number {
    const group = this.NhomVeCungDon(ticket);
    return group.reduce((sum, v) => sum + v.GiaVe, 0);
  }

  SoLuongVeIn(ticket: VeXe): number {
    return this.NhomVeCungDon(ticket).length;
  }

  DanhSachMaVeIn(ticket: VeXe): string {
    const group = this.NhomVeCungDon(ticket);
    const codes = group.map(v => v.MaVe);
    if (codes.length <= 4) return codes.join(', ');
    return `${codes[0]} ... ${codes[codes.length - 1]} (${codes.length} vé)`;
  }

  DanhSachGheIn(ticket: VeXe): string {
    return this.NhomVeCungDon(ticket).map(v => v.SoGhe).join(', ');
  }

  DanhSachGheTrongDon(ticket: VeXe): string {
    return this.TatCaVeCungDon(ticket).map(v => v.SoGhe).join(', ');
  }

  LabelThanhToan(value: TrangThaiDonHang) {
    return value === 'da-thanh-toan' ? 'Đã thanh toán' : 'Chờ thanh toán';
  }

  LabelTrangThaiVe(value: TrangThaiVe) {
    const labels: Record<TrangThaiVe, string> = {
      'cho-khoi-hanh': 'Chờ khởi hành',
      'da-hoan-thanh': 'Đã hoàn thành',
      'da-huy': 'Đã hủy'
    };
    return labels[value];
  }

  LabelHinhThuc(value: PhuongThucThanhToan) {
    const labels: Record<PhuongThucThanhToan, string> = {
      'tien-mat': 'Tiền mặt',
      'chuyen-khoan': 'Chuyển khoản',
      the: 'Thẻ'
    };
    return labels[value];
  }

  LabelNguonDat(value?: NguonDat) {
    if (value === 'hotline') return 'Hotline';
    if (value === 'online') return 'Website';
    return 'Tại quầy';
  }

  SoHieuXe(ve: VeXe) {
    return this.TenXeTheoVe(ve);
  }

  TenXeTheoVe(ve: VeXe) {
    const xe = this.LayXeTheoVe(ve);
    return ve.TenXe || xe?.tenXe || 'Chưa xác định';
  }

  LayBienSoTheoVe(ve: VeXe) {
    const xe = this.LayXeTheoVe(ve);
    return ve.BienSoXe || xe?.bienSo || '';
  }

  MoTaGheNgan(ve: VeXe) {
    return ve.LoaiGhe || this.LabelLoaiGhe(this.LoaiGheTheoSoGhe(ve.SoGhe, this.LoaiXeIdTheoVe(ve)));
  }

  MoTaGheTheoSoGhe(soGhe: string, ve: VeXe) {
    const loaiXe = this.LoaiXeIdTheoVe(ve);
    if (loaiXe === 'giuong-nam') return 'Giường đơn';
    if (loaiXe === 'limousine') return 'Ghế VIP';
    return 'Cabin đơn/Cabin đôi';
  }

  LaVeCabin(ve: VeXe) {
    return this.LoaiXeIdTheoVe(ve) === 'cabin';
  }

  LoaiCabinHienTai(ve: VeXe): 'don' | 'doi' {
    return this.LoaiGheIdTuLabel(ve.LoaiGhe) === 'cabin-doi' ? 'doi' : 'don';
  }

  ChonLoaiCabinDoiGhe(value: string) {
    this.selectedNewCabinType.set(value === 'doi' ? 'doi' : 'don');
  }

  GiaCabinDon(ve: VeXe) {
    return this.GiaVeTheoLoaiGhe('cabin-don', this.LayGiaCoSoTheoTuyen(ve.TenTuyenXe));
  }

  GiaCabinDoi(ve: VeXe) {
    return this.GiaVeTheoLoaiGhe('cabin-doi', this.LayGiaCoSoTheoTuyen(ve.TenTuyenXe));
  }

  GiaVeSauDoiGhe(ve: VeXe) {
    const loaiGhe = this.LoaiGheDoiGhe(ve);
    const giaGocMoi = this.GiaVeTheoLoaiGhe(loaiGhe, this.LayGiaCoSoTheoTuyen(ve.TenTuyenXe));
    return Math.max(0, giaGocMoi - (ve.GiamGia || 0));
  }

  ChenhLechDoiGhe(ve: VeXe) {
    return this.GiaVeSauDoiGhe(ve) - ve.GiaVe;
  }

  LabelChenhLechDoiGhe(ve: VeXe) {
    const diff = this.ChenhLechDoiGhe(ve);
    if (diff > 0) return `Thu thêm ${diff.toLocaleString('vi-VN')}đ`;
    if (diff < 0) return `Hoàn lại ${Math.abs(diff).toLocaleString('vi-VN')}đ`;
    return 'Không đổi giá';
  }

  CoThayDoiDoiGhe(ve: VeXe) {
    const gheMoi = this.selectedNewSeat();
    const doiGhe = !!gheMoi && gheMoi !== ve.SoGhe;
    const doiLoaiCabin = this.LaVeCabin(ve) && this.selectedNewCabinType() !== this.LoaiCabinHienTai(ve);
    return doiGhe || doiLoaiCabin;
  }

  DuocDoiGheTrucTiep(ve: VeXe) { return this.CoTheSua(ve) && !(ve.balanceDue || 0) && !['processing','failed'].includes(ve.refundStatus || ''); }

  private LoaiGheDoiGhe(ve: VeXe): LoaiGheId {
    if (this.LaVeCabin(ve)) {
      return this.selectedNewCabinType() === 'doi' ? 'cabin-doi' : 'cabin-don';
    }
    return this.LoaiGheTheoSoGhe(this.selectedNewSeat() || ve.SoGhe, this.LoaiXeIdTheoVe(ve));
  }

  LabelLoaiGhe(value?: LoaiGheId | string) {
    const labels: Record<LoaiGheId, string> = {
      'giuong-nam': 'Giường đơn',
      limousine: 'Ghế VIP',
      'cabin-don': 'Cabin đơn',
      'cabin-doi': 'Cabin đôi'
    };
    return value && value in labels ? labels[value as LoaiGheId] : String(value || '');
  }

  LabelLoaiXeId(value?: LoaiXeId | string) {
    const labels: Record<LoaiXeId, string> = {
      limousine: 'Limousine',
      'giuong-nam': 'Giường nằm',
      cabin: 'Cabin'
    };
    return value && value in labels ? labels[value as LoaiXeId] : String(value || '');
  }

  private LayXeTheoVe(ve: VeXe) {
    return this.danhSachXe.find(xe => xe.maXe === ve.MaXe)
      ?? this.danhSachXe.find(xe => xe.bienSo === ve.BienSoXe)
      ?? null;
  }

  private LoaiXeIdTheoVe(ve: VeXe): LoaiXeId {
    const xe = this.LayXeTheoVe(ve);
    if (xe) return xe.loaiXe;
    const normalized = this.NormalizeSearchText(ve.LoaiXe || '');
    if (normalized.includes('giuong')) return 'giuong-nam';
    if (normalized.includes('cabin')) return 'cabin';
    return 'limousine';
  }

  private LoaiGheTheoSoGhe(soGhe: string, loaiXe: LoaiXeId): LoaiGheId {
    if (loaiXe === 'limousine') return 'limousine';
    if (loaiXe === 'giuong-nam') return 'giuong-nam';
    return 'cabin-don';
  }

  private LoaiGheIdTuLabel(value?: string): LoaiGheId | null {
    const normalized = this.NormalizeSearchText(value || '');
    if (normalized.includes('cabin') && normalized.includes('doi')) return 'cabin-doi';
    if (normalized.includes('cabin')) return 'cabin-don';
    if (normalized.includes('limousine') || normalized.includes('vip')) return 'limousine';
    if (normalized.includes('giuong')) return 'giuong-nam';
    return null;
  }

  private GiaVeTheoLoaiGhe(loaiGhe: LoaiGheId, giaCoSo: number) {
    const phuThu: Record<LoaiGheId, number> = {
      'giuong-nam': 0,
      limousine: 40000,
      'cabin-don': 60000,
      'cabin-doi': 260000
    };
    return giaCoSo + phuThu[loaiGhe];
  }

  private LayGiaCoSoTheoTuyen(tuyen: string) {
    return this.giaCoSoTheoTuyen[tuyen]
      ?? this.giaCoSoTheoTuyen[this.HienThiTuyen(tuyen).replace(' - ', ' ↔ ')]
      ?? 180000;
  }

  MaQr(ve: VeXe) { return localQr(ve.MaQRVe || ve.MaVe); }

  private TaiDuLieu() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map(ve => this.ChuanHoaVeXe(ve));
          this.danhSachVe.set(normalized);
          this.LuuDuLieu(normalized);
          return;
        }
      } catch (error) {
        console.error('Không đọc được dữ liệu vé', error);
      }
    }

    const sample = this.TaoDuLieuMau().map(ve => this.ChuanHoaVeXe(ve));
    this.danhSachVe.set(sample);
    this.LuuDuLieu(sample);
  }

  private LuuDuLieu(ds: VeXe[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(ds.map(ve => this.ChuanHoaVeXe(ve))));
  }

  private ChuanHoaVeXe(raw: any): VeXe {
    const maVe = String(raw?.MaVe ?? `VE${Date.now()}`);
    const sdt = String(raw?.SdtNguoiDi ?? raw?.SoDienThoai ?? '');
    const soGhe = this.NormalizeSeatCode(String(raw?.SoGhe ?? ''));
    const maDonHang = String(raw?.MaDonHang ?? `DH${maVe.replace(/\D/g, '') || Date.now()}`);
    const maLichTrinh = String(raw?.MaLichTrinh ?? raw?.MaChuyenXe ?? '');
    const thoiGianDat = String(raw?.ThoiGianDat ?? raw?.ThoiGianTao ?? new Date().toISOString());
    const rawMaXe = String(raw?.MaXe ?? '');
    const maXeDuPhong = this.LayMaXeTheoMaLichTrinh(maLichTrinh);
    const maXe = this.danhSachXe.some(xe => xe.maXe === rawMaXe) ? rawMaXe : maXeDuPhong;
    const xe = this.danhSachXe.find(item => item.maXe === maXe);
    const tenTuyenXe = String(raw?.TenTuyenXe ?? raw?.TuyenXe ?? '');
    const loaiXeId = xe?.loaiXe ?? 'limousine';
    const loaiGheId = this.LoaiGheIdTuLabel(raw?.LoaiGhe) ?? this.LoaiGheTheoSoGhe(soGhe, loaiXeId);
    const loaiGhe = String(raw?.LoaiGhe ?? this.LabelLoaiGhe(loaiGheId));
    const legacyRefund = String(raw?.GhiChu || '').match(/Hoàn:\s*([\d.,]+)\s*đ/);
    const refundAmount = raw?.refundAmount ?? (legacyRefund ? Number(legacyRefund[1].replace(/[.,]/g, '')) : undefined);
    const soLuongVeDaDat = Number(raw?.SoLuongVeDaDat ?? 1);
    const giaCoSo = this.LayGiaCoSoTheoTuyen(tenTuyenXe);
    const giaVe = raw?.LoaiGhe ? Number(raw?.GiaVe ?? 0) : this.GiaVeTheoLoaiGhe(loaiGheId, giaCoSo);

    return normalizeTicket({
      ...raw,
      refundAmount,
      refundStatus: raw?.refundStatus ?? (refundAmount > 0 ? raw?.TrangThaiGiaoDich === 'da-hoan' ? 'completed' : 'processing' : undefined),
      refundedAmount: raw?.refundedAmount ?? (raw?.TrangThaiGiaoDich === 'da-hoan' ? refundAmount || 0 : 0),
      refundFee: raw?.refundFee ?? (refundAmount !== undefined ? Math.max(0, giaVe - refundAmount) : undefined),
      refundReason: raw?.refundReason ?? (legacyRefund ? String(raw?.GhiChu || '').match(/Lý do:\s*(.*?)\s*-\s*Hoàn:/)?.[1] : undefined),
      MaVe: maVe,
      MaDonHang: maDonHang,
      MaKhachHang: raw?.MaKhachHang ?? this.TaoMaKhachHang(sdt),
      MaNVBanVe: raw?.MaNVBanVe ?? 'NVBV001',
      HoTenNguoiDi: String(raw?.HoTenNguoiDi ?? raw?.TenKhachHang ?? ''),
      SdtNguoiDi: sdt,
      EmailNguoiDi: String(raw?.EmailNguoiDi ?? raw?.Email ?? ''),
      ThoiGianDat: thoiGianDat,
      SoLuongVeDaDat: soLuongVeDaDat,
      TienBaoHiem: Number(raw?.TienBaoHiem ?? 0),
      TongGiaVe: raw?.LoaiGhe ? Number(raw?.TongGiaVe ?? giaVe) : giaVe * soLuongVeDaDat,
      ThoiGianXuatVe: String(raw?.ThoiGianXuatVe ?? thoiGianDat),
      MaQRVe: String(raw?.MaQRVe ?? this.TaoMaQrVe(maDonHang, soGhe)),
      MaLichTrinh: maLichTrinh,
      MaXe: maXe,
      MaGheChuyen: String(raw?.MaGheChuyen ?? this.TaoMaGheChuyen(maLichTrinh, soGhe)),
      LoaiXe: String(raw?.LoaiXe ?? this.LabelLoaiXeId(loaiXeId)),
      LoaiGhe: loaiGhe,
      TenXe: String(raw?.TenXe ?? xe?.tenXe ?? ''),
      BienSoXe: String(raw?.BienSoXe ?? xe?.bienSo ?? ''),
      TenTuyenXe: tenTuyenXe,
      NgayKhoiHanh: String(raw?.NgayKhoiHanh ?? raw?.NgayDi ?? this.todayString()),
      GioKhoiHanh: String(raw?.GioKhoiHanh ?? raw?.GioChay ?? '10:45'),
      SoGhe: soGhe,
      GiaVe: giaVe,
      MaGiamGia: raw?.MaGiamGia,
      GiamGia: Number(raw?.GiamGia ?? 0),
      MaDiemDon: String(raw?.MaDiemDon ?? raw?.DiemDon ?? ''),
      MaDiemTra: String(raw?.MaDiemTra ?? raw?.DiemTra ?? ''),
      PhuongThucThanhToan: (raw?.PhuongThucThanhToan ?? raw?.HinhThucThanhToan ?? 'tien-mat') as PhuongThucThanhToan,
      TrangThaiDonHang: (raw?.TrangThaiDonHang ?? raw?.TrangThaiThanhToan ?? 'cho-thanh-toan') as TrangThaiDonHang,
      TrangThaiVe: (raw?.TrangThaiVe ?? 'cho-khoi-hanh') as TrangThaiVe,
      GhiChu: String(raw?.GhiChu ?? ''),
      NguonDat: (raw?.NguonDat ?? 'tai-quay') as NguonDat,
      SoLanDaSua: Number(raw?.SoLanDaSua ?? raw?.SoLanSua ?? 0),
      NguoiHuy: raw?.NguoiHuy,
      ThoiGianHuy: raw?.ThoiGianHuy ?? raw?.NgayHuy,
      TrangThaiGiaoDich: raw?.TrangThaiGiaoDich ?? raw?.TrangThaiHoan
    });
  }

  MoChuyenGhe(ve: VeXe) {
    if (!this.CoTheSua(ve)) return;
    this.veDuocChon.set(ve);
    this.selectedNewSeat.set('');
    this.selectedNewCabinType.set(this.LoaiCabinHienTai(ve));
    this.showTransferModal.set(true);
  }

  async XacNhanChuyenGhe() {
    const ve = this.veDuocChon();
    if (!ve || !this.CoTheSua(ve)) return;
    if (!ve) return;
    if (!this.CoThayDoiDoiGhe(ve)) {
      this.HienToast('Vui lòng chọn ghế mới hoặc đổi loại cabin trước khi xác nhận.', 'danger');
      return;
    }
    if (!this.DuocDoiGheTrucTiep(ve)) {
      this.HienToast('Vé đã thanh toán có chênh lệch tiền: hãy hủy vé cũ rồi tạo/giữ vé mới.', 'danger');
      return;
    }
    if (this.processing()) return; this.processing.set(true); await new Promise(r => setTimeout(r, 400)); this.refreshExpiry();
    if (!this.CoTheSua(ve)) { this.processing.set(false); this.HienToast('Vé không còn đủ điều kiện đổi ghế.', 'danger'); return; }
    const newSeat = this.selectedNewSeat() || ve.SoGhe;
    this.DoiGheXe(ve, newSeat); this.processing.set(false);
  }

  LayGheTrongCuaChuyen(MaLichTrinh: string): string[] {
    const veDaiDien = this.danhSachVe().find(v => v.MaLichTrinh === MaLichTrinh);
    const loaiXe = veDaiDien ? this.LoaiXeIdTheoVe(veDaiDien) : 'cabin';
    const allSeats = this.seatLayouts[loaiXe];
    const occupiedSeats = this.danhSachVe()
      .filter(v => v.MaLichTrinh === MaLichTrinh && v.TrangThaiVe !== 'da-huy')
      .map(v => v.SoGhe);
    return allSeats.filter(s => !occupiedSeats.includes(s));
  }

  DoiGheXe(ticket: VeXe, newSeat: string) {
    ticket = this.danhSachVe().find(v => v.MaVe === ticket.MaVe) ?? ticket;
    if (!this.DuocDoiGheTrucTiep(ticket)) { this.HienToast('Vé không còn đủ điều kiện đổi ghế.', 'danger'); return; }
    if (newSeat !== ticket.SoGhe && !this.LayGheTrongCuaChuyen(ticket.MaLichTrinh).includes(newSeat)) { this.HienToast('Ghế này vừa được giữ. Vui lòng chọn ghế khác.', 'danger'); return; }
    const nextEditCount = this.EditCount(ticket) + 1;
    const loaiGheCu = this.LoaiGheIdTuLabel(ticket.LoaiGhe) ?? this.LoaiGheTheoSoGhe(ticket.SoGhe, this.LoaiXeIdTheoVe(ticket));
    const loaiGheMoi = this.LoaiGheDoiGhe(ticket);
    const labelLoaiGheCu = this.LabelLoaiGhe(loaiGheCu);
    const labelLoaiGheMoi = this.LabelLoaiGhe(loaiGheMoi);
    const giaVeMoi = this.GiaVeSauDoiGhe(ticket);
    const chenhLech = giaVeMoi - ticket.GiaVe;
    const bayGio = new Date();
    const hh = String(bayGio.getHours()).padStart(2, '0');
    const mm = String(bayGio.getMinutes()).padStart(2, '0');
    const dd = String(bayGio.getDate()).padStart(2, '0');
    const MM = String(bayGio.getMonth() + 1).padStart(2, '0');
    const yyyy = bayGio.getFullYear();
    const thoiGianStr = `${hh}:${mm} ngày ${dd}/${MM}/${yyyy}`;
    const thayDoi = [
      ticket.SoGhe !== newSeat ? `đổi ghế từ ${ticket.SoGhe} sang ${newSeat}` : '',
      loaiGheCu !== loaiGheMoi ? `đổi loại ghế từ ${labelLoaiGheCu} sang ${labelLoaiGheMoi}` : '',
      chenhLech > 0 ? `thu thêm ${chenhLech.toLocaleString('vi-VN')}đ` : '',
      chenhLech < 0 ? `hoàn lại ${Math.abs(chenhLech).toLocaleString('vi-VN')}đ` : ''
    ].filter(Boolean).join(', ');
    const logGhe = `Đổi ghế: ${thayDoi} lúc ${thoiGianStr}`;

    const updated = this.danhSachVe().map(v => {
      if (v.MaVe === ticket.MaVe) {
        const note = [v.GhiChu || '', logGhe].filter(Boolean).join(' | ');
        return {
          ...v,
          SoGhe: newSeat,
          SoLanDaSua: nextEditCount,
          LoaiGhe: labelLoaiGheMoi,
          GiaVe: giaVeMoi,
          TongGiaVe: this.TongGiaTriDonHang(ticket) + chenhLech,
          paidAmount: v.paidAmount ?? (v.TrangThaiDonHang === 'da-thanh-toan' ? v.GiaVe : 0),
          balanceDue: v.TrangThaiDonHang === 'da-thanh-toan' ? Math.max(0, giaVeMoi - ((v.paidAmount ?? v.GiaVe) - (v.refundedAmount || 0))) : 0,
          refundAmount: v.TrangThaiDonHang === 'da-thanh-toan' && chenhLech < 0 ? Math.abs(chenhLech) : v.refundAmount,
          refundStatus: v.TrangThaiDonHang === 'da-thanh-toan' && chenhLech < 0 ? 'processing' as const : v.refundStatus,
          refundReason: chenhLech < 0 ? 'Chênh lệch đổi ghế' : v.refundReason,
          refundFee: chenhLech < 0 ? 0 : v.refundFee,
          previousQr: v.MaQRVe,
          MaGheChuyen: this.TaoMaGheChuyen(v.MaLichTrinh, newSeat),
          MaQRVe: this.TaoMaQrVe(v.MaDonHang || v.MaVe, newSeat) + '-' + Date.now(),
          GhiChu: note
        };
      }
      return v;
    });

    const total = updated.filter(v => v.MaDonHang === ticket.MaDonHang).reduce((sum,v) => sum + v.GiaVe, 0);
    for (const v of updated) if (v.MaDonHang === ticket.MaDonHang) { v.TongGiaVe = total; if (v.MaVe !== ticket.MaVe) v.SoLanDaSua = nextEditCount; }
    this.danhSachVe.set(updated);
    this.LuuDuLieu(updated);
    this.showTransferModal.set(false);

    const next = updated.find(v => v.MaVe === ticket.MaVe);
    if (next) this.veDuocChon.set(next);

    const toastGia = chenhLech === 0 ? '' : ` (${this.LabelChenhLechDoiGhe(ticket)})`;
    this.HienToast(`Đã cập nhật ghế ${newSeat} - ${labelLoaiGheMoi}${toastGia}.`, 'success');
  }

  async XacNhanThanhToanTuChiTiet() {
    const ve = this.veDuocChon(); if (!ve || this.processing() || this.PaymentDue(ve) <= 0) return;
    this.processing.set(true); await new Promise(r => setTimeout(r, 400)); this.refreshExpiry();
    const group = this.NhomVeCungDon(ve); const ids = group.filter(v => normalizeTicket(v).orderStatus === 'held' || (v.balanceDue || 0) > 0).map(v => v.MaVe);
    if (ids.length) {
      const now = new Date().toISOString(); const transaction = 'GD-' + Date.now();
      const next = this.danhSachVe().map(v => ids.includes(v.MaVe) ? { ...v, paymentStatus: 'paid' as const, orderStatus: 'confirmed' as const,
        TrangThaiDonHang: 'da-thanh-toan' as const, ThoiGianXuatVe: v.ThoiGianXuatVe || now, paidAmount: (v.paidAmount ?? (v.TrangThaiDonHang === 'da-thanh-toan' ? v.GiaVe : 0)) + (v.TrangThaiDonHang === 'da-thanh-toan' ? v.balanceDue || 0 : v.GiaVe),
        balanceDue: 0, paymentAt: now, paymentStaff: this.currentUser.name, transactionCode: transaction, membershipPoints: Math.floor(v.GiaVe / 10000) } : v);
      this.danhSachVe.set(next); this.LuuDuLieu(next); this.veDuocChon.set(next.find(v => v.MaVe === ve.MaVe)!); this.HienToast('Đã thu đủ tiền toàn bộ đơn.', 'success');
    } else this.HienToast('Không còn vé hợp lệ để thanh toán.', 'danger');
    this.processing.set(false); this.showPaymentConfirmModal.set(false);
  }

  GuiSmsEmail(ve: VeXe) { this.veDuocChon.set(ve); void this.GuiLaiThongBao(); }

  LayGhiChuSach(ghiChu?: string): string {
    if (!ghiChu) return '';
    return ghiChu.split(' | ')
      .filter(part =>
        !part.includes('Đã hủy lúc') &&
        !part.includes('Đổi ghế từ') &&
        !part.includes('Xác nhận thanh toán')
      )
      .join(' | ');
  }

  MoXacNhanThanhToan() {
    const selected = this.veDuocChon(); if (selected && this.PaymentDue(selected) > 0 && !this.processing()) this.showPaymentConfirmModal.set(true);
  }

  // printing and resending trigger directly without verify popup


  private NapFormSua(ve: VeXe) {
    this.editPassengers.set(Object.fromEntries(this.NhomVeCungDon(ve).map(v => [v.MaVe, this.PassengerName(v)])));
    this.editTen.set(ve.HoTenNguoiDi);
    this.editSdt.set(ve.SdtNguoiDi);
    this.editEmail.set(ve.EmailNguoiDi || '');
    this.editDiemDon.set(ve.MaDiemDon);
    this.editDiemTra.set(ve.MaDiemTra);
    this.editThanhToan.set(ve.TrangThaiDonHang);
    this.editHinhThuc.set(ve.PhuongThucThanhToan);
    this.editMaGiamGia.set(ve.MaGiamGia || '');
    this.editGiamGia.set(ve.GiamGia || 0);
    this.editGhiChu.set(this.LayGhiChuSach(ve.GhiChu));
    this.editNguonDat.set(ve.NguonDat || 'tai-quay');
  }

  private NormalizeSeatCode(soGhe: string) {
    const trimmed = soGhe.trim().toUpperCase();
    const oldFormat = trimmed.match(/^([AB])(\d{1,2})$/);
    if (!oldFormat) return trimmed;
    return `${oldFormat[2]}${oldFormat[1]}`;
  }

  private SoThuTuGhe(soGhe: string) {
    const match = soGhe.match(/^(\d+)([AB])$/i);
    if (!match) return Number.MAX_SAFE_INTEGER;
    const hang = Number(match[1]);
    const tang = match[2].toUpperCase() === 'A' ? 0 : 100;
    return tang + hang;
  }

  private TaoMaKhachHang(sdt: string) {
    const digits = sdt.replace(/\D/g, '').slice(-8);
    return `KH${digits || '00000000'}`;
  }

  private LayMaXeTheoMaLichTrinh(maLichTrinh: string) {
    const xeTrongLich = this.danhSachXe.find(xe => maLichTrinh.includes(`-${xe.maXe}-`));
    if (xeTrongLich) return xeTrongLich.maXe;
    const tuyenId = Object.keys(this.maXeTheoTuyenId).find(id => maLichTrinh.startsWith(`${id}-`));
    return tuyenId ? this.maXeTheoTuyenId[tuyenId] : this.danhSachXe[0].maXe;
  }

  private TaoMaGheChuyen(maLichTrinh: string, soGhe: string) {
    return `GC-${maLichTrinh}-${soGhe}`.replace(/\s+/g, '');
  }

  private TaoMaQrVe(maDonHang: string, soGhe: string) {
    return `QR-${maDonHang}-${soGhe}`.replace(/\s+/g, '');
  }

  private KhopTrangThaiLoc(ve: VeXe, status: string) { const labels: Record<string,string> = { 'cho-thanh-toan': 'Chờ thanh toán', 'da-thanh-toan': 'Đã thanh toán', 'da-hoan-thanh': 'Đã hoàn thành', 'da-huy': 'Đã hủy', 'huy-mot-phan': 'Hủy một phần' }; return status === 'tat-ca' || this.OrderLabel(ve) === labels[status]; }

  private KhopTrangThaiDonHangLoc(ve: VeXe, filter: string) { return filter === 'tat-ca' || normalizeTicket(ve).paymentStatus === (filter === 'da-thanh-toan' ? 'paid' : filter); }

  private DonHangDaHuyToanBo(ve: VeXe) {
    const tickets = this.TatCaVeCungDon(ve);
    return tickets.length > 0 && tickets.every(item => item.TrangThaiVe === 'da-huy');
  }

  private MatchSearchText(source: string, query: string) {
    const normalizedSource = this.NormalizeSearchText(source);
    const normalizedQuery = this.NormalizeSearchText(query);
    if (!normalizedQuery) return true;
    return normalizedQuery.split(' ').every(term => normalizedSource.includes(term));
  }

  HienThiTuyen(tuyen: string, direction: 'di' | 've' = 'di') { const parts = this.TachDiemTuyen(tuyen); return (direction === 've' ? parts.reverse() : parts).join(' → '); }

  private KhopLocTuyenMotChieu(tuyen: string, query: string) { return this.MatchSearchText(this.TuyenSearchText(tuyen), query); }

  private TachDiemTuyen(tuyen: string) {
    return (tuyen || '')
      .split(/\s+(?:↔|<->|->|→|-)\s+/)
      .map(part => part.trim())
      .filter(Boolean)
      .slice(0, 2);
  }

  private TuyenSearchText(tuyen: string) {
    const diem = this.TachDiemTuyen(tuyen);
    const aliasDiem = diem.map(part => this.TuyenDiemSearchText(part)).join(' ');
    const hienThi = this.HienThiTuyen(tuyen);
    return `${hienThi} ${aliasDiem}`;
  }

  private TuyenDiemSearchText(diem: string) {
    const aliases: string[] = [];
    if (diem.includes('TP.HCM')) aliases.push('TPHCM HCM TP HCM Sài Gòn SG Hồ Chí Minh');
    if (diem.includes('Cần Thơ')) aliases.push('Cantho CT');
    if (diem.includes('Đà Lạt')) aliases.push('Dalat DL');
    if (diem.includes('Vũng Tàu')) aliases.push('VT Vungtau');
    if (diem.includes('Nha Trang')) aliases.push('NT Nhatrang');
    if (diem.includes('Đà Nẵng')) aliases.push('DN Danang');
    if (diem.includes('Rạch Giá')) aliases.push('RG Rachgia');
    if (diem.includes('Phan Thiết')) aliases.push('PT Phanthiet');
    if (diem.includes('Buôn Ma Thuột')) aliases.push('BMT Buonmathuot');
    return `${diem} ${aliases.join(' ')}`;
  }

  private NormalizeText(value: string) {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  private NormalizeSearchText(value: string) {
    return this.NormalizeText(value)
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private HienToast(msg: string, type: 'success' | 'danger') {
    this.toast.set({ msg, type });
  }

  private TaoDuLieuMau(): VeXe[] {
    const today = this.todayString();
    const now = new Date().toISOString();
    const tuyenTheoId: Record<string, { name: string; giaGoc: number; maXe: string }> = {
      'HCM-CT': { name: 'TP.HCM ↔ Cần Thơ', giaGoc: 180000, maXe: 'LIMO01' },
      'HCM-VT': { name: 'TP.HCM ↔ Vũng Tàu', giaGoc: 180000, maXe: 'LIMO02' },
      'DL-BMT': { name: 'Đà Lạt ↔ Buôn Ma Thuột', giaGoc: 220000, maXe: 'GN02' },
      'DL-NT': { name: 'Đà Lạt ↔ Nha Trang', giaGoc: 220000, maXe: 'CAB01' },
      'CT-RG': { name: 'Cần Thơ ↔ Rạch Giá', giaGoc: 180000, maXe: 'GN03' },
      'HCM-PT': { name: 'TP.HCM ↔ Phan Thiết', giaGoc: 220000, maXe: 'GN04' },
      'HCM-DL': { name: 'TP.HCM ↔ Đà Lạt', giaGoc: 320000, maXe: 'CAB02' },
      'HCM-NT': { name: 'TP.HCM ↔ Nha Trang', giaGoc: 420000, maXe: 'GN01' },
      'NT-DN': { name: 'Nha Trang ↔ Đà Nẵng', giaGoc: 380000, maXe: 'CAB03' }
    };

    const thongTinTuyen = (tuyenId: string) => tuyenTheoId[tuyenId] ?? tuyenTheoId['HCM-CT'];
    const thongTinChuyen = (tuyenId: string, gio: string) => {
      const tuyen = thongTinTuyen(tuyenId);
      return {
        MaLichTrinh: `${tuyenId}-${today.replaceAll('-', '')}-${gio.replace(':', '')}`,
        TenTuyenXe: tuyen.name,
        NgayKhoiHanh: today,
        GioKhoiHanh: gio,
        MaXe: tuyen.maXe,
        MaNVBanVe: 'NVBV001',
        ThoiGianDat: now,
        ThoiGianXuatVe: now
      };
    };
    const tongGiaTriDon = (tuyenId: string, soVe: number) => thongTinTuyen(tuyenId).giaGoc * soVe;

    return [
      {
        ...thongTinChuyen('HCM-CT', '05:30'),
        MaVe: 'VE10000018-1',
        MaDonHang: 'DH10000018',
        MaKhachHang: 'KH00234567',
        HoTenNguoiDi: 'Mỹ Mỹ',
        SdtNguoiDi: '0900234567',
        EmailNguoiDi: 'myan@example.com',
        SoLuongVeDaDat: 3,
        TongGiaVe: tongGiaTriDon('HCM-CT', 3),
        MaQRVe: 'QR-VE10000018-1A',
        SoGhe: '1A',
        GiaVe: thongTinTuyen('HCM-CT').giaGoc,
        MaDiemDon: 'Bến xe Miền Đông Mới',
        MaDiemTra: 'Bến xe Trung tâm Cần Thơ',
        PhuongThucThanhToan: 'chuyen-khoan',
        TrangThaiDonHang: 'da-thanh-toan',
        TrangThaiVe: 'cho-khoi-hanh',
        GhiChu: 'Đơn 3 vé tuyến TP.HCM - Cần Thơ, khách đi gia đình.',
        NguonDat: 'tai-quay',
        SoLanDaSua: 0
      },
      {
        ...thongTinChuyen('HCM-CT', '05:30'),
        MaVe: 'VE10000018-2',
        MaDonHang: 'DH10000018',
        MaKhachHang: 'KH00234567',
        HoTenNguoiDi: 'Mỹ Mỹ',
        SdtNguoiDi: '0900234567',
        EmailNguoiDi: 'myan@example.com',
        SoLuongVeDaDat: 3,
        TongGiaVe: tongGiaTriDon('HCM-CT', 3),
        MaQRVe: 'QR-VE10000018-2A',
        SoGhe: '2A',
        GiaVe: thongTinTuyen('HCM-CT').giaGoc,
        MaDiemDon: 'Bến xe Miền Đông Mới',
        MaDiemTra: 'Bến xe Trung tâm Cần Thơ',
        PhuongThucThanhToan: 'chuyen-khoan',
        TrangThaiDonHang: 'da-thanh-toan',
        TrangThaiVe: 'cho-khoi-hanh',
        GhiChu: 'Đơn 3 vé tuyến TP.HCM - Cần Thơ, khách đi gia đình.',
        NguonDat: 'tai-quay',
        SoLanDaSua: 0
      },
      {
        ...thongTinChuyen('HCM-CT', '05:30'),
        MaVe: 'VE10000018-3',
        MaDonHang: 'DH10000018',
        MaKhachHang: 'KH00234567',
        HoTenNguoiDi: 'Mỹ Mỹ',
        SdtNguoiDi: '0900234567',
        EmailNguoiDi: 'myan@example.com',
        SoLuongVeDaDat: 3,
        TongGiaVe: tongGiaTriDon('HCM-CT', 3),
        MaQRVe: 'QR-VE10000018-3A',
        SoGhe: '3A',
        GiaVe: thongTinTuyen('HCM-CT').giaGoc,
        MaDiemDon: 'Bến xe Miền Đông Mới',
        MaDiemTra: 'Bến xe Trung tâm Cần Thơ',
        PhuongThucThanhToan: 'chuyen-khoan',
        TrangThaiDonHang: 'da-thanh-toan',
        TrangThaiVe: 'da-huy',
        GhiChu: 'Đơn 3 vé tuyến TP.HCM - Cần Thơ, khách đi gia đình. | Đã hủy lúc 09:20 ngày 24/06/2026 - Lý do: Tôi đổi kế hoạch - Hoàn: 180.000 đ',
        NguonDat: 'tai-quay',
        SoLanDaSua: 0,
        NguoiHuy: 'Nguyen An Ninh',
        ThoiGianHuy: now,
        TrangThaiGiaoDich: 'da-hoan'
      },
      {
        ...thongTinChuyen('HCM-VT', '07:00'),
        MaVe: 'VE10000019-1',
        MaDonHang: 'DH10000019',
        MaKhachHang: 'KH98776655',
        HoTenNguoiDi: 'Nguyễn Văn Minh',
        SdtNguoiDi: '0988776655',
        EmailNguoiDi: 'minh.nguyen@gmail.com',
        SoLuongVeDaDat: 1,
        TongGiaVe: tongGiaTriDon('HCM-VT', 1),
        MaQRVe: 'QR-VE10000019-5A',
        SoGhe: '5A',
        GiaVe: thongTinTuyen('HCM-VT').giaGoc,
        MaDiemDon: 'Văn phòng Quận 1',
        MaDiemTra: 'Bãi Sau',
        PhuongThucThanhToan: 'tien-mat',
        TrangThaiDonHang: 'cho-thanh-toan',
        TrangThaiVe: 'cho-khoi-hanh',
        GhiChu: 'Khách hotline, giữ chỗ tuyến TP.HCM - Vũng Tàu.',
        NguonDat: 'hotline',
        SoLanDaSua: 1
      },
      {
        ...thongTinChuyen('DL-BMT', '08:00'),
        MaVe: 'VE10000020-1',
        MaDonHang: 'DH10000020',
        MaKhachHang: 'KH12345678',
        HoTenNguoiDi: 'Trần Hoài Nam',
        SdtNguoiDi: '0912345678',
        EmailNguoiDi: 'nam.tran@example.com',
        SoLuongVeDaDat: 1,
        TongGiaVe: tongGiaTriDon('DL-BMT', 1),
        MaQRVe: 'QR-VE10000020-3B',
        SoGhe: '3B',
        GiaVe: thongTinTuyen('DL-BMT').giaGoc,
        MaDiemDon: 'Bến xe Liên Tỉnh Đà Lạt',
        MaDiemTra: 'Bến xe Phía Nam Buôn Ma Thuột',
        PhuongThucThanhToan: 'the',
        TrangThaiDonHang: 'da-thanh-toan',
        TrangThaiVe: 'cho-khoi-hanh',
        GhiChu: 'Khách đi công tác, cần xuất hóa đơn.',
        NguonDat: 'online',
        SoLanDaSua: 0
      },
      {
        ...thongTinChuyen('DL-NT', '09:30'),
        MaVe: 'VE10000021-1',
        MaDonHang: 'DH10000021',
        MaKhachHang: 'KH44556677',
        HoTenNguoiDi: 'Lê Thu Hương',
        SdtNguoiDi: '0981335599',
        EmailNguoiDi: 'huong.le@example.com',
        SoLuongVeDaDat: 1,
        TongGiaVe: tongGiaTriDon('DL-NT', 1),
        MaQRVe: 'QR-VE10000021-7A',
        SoGhe: '7A',
        GiaVe: thongTinTuyen('DL-NT').giaGoc,
        MaDiemDon: 'Chợ Đà Lạt',
        MaDiemTra: 'Ga Nha Trang',
        PhuongThucThanhToan: 'chuyen-khoan',
        TrangThaiDonHang: 'da-thanh-toan',
        TrangThaiVe: 'cho-khoi-hanh',
        GhiChu: 'Khách chọn điểm đón trung tâm Đà Lạt.',
        NguonDat: 'tai-quay',
        SoLanDaSua: 0
      },
      {
        ...thongTinChuyen('CT-RG', '10:00'),
        MaVe: 'VE10000022-1',
        MaDonHang: 'DH10000022',
        MaKhachHang: 'KH55667788',
        HoTenNguoiDi: 'Hoàng Minh Quân',
        SdtNguoiDi: '0348995511',
        EmailNguoiDi: 'quan.hoang@example.com',
        SoLuongVeDaDat: 1,
        TongGiaVe: tongGiaTriDon('CT-RG', 1),
        MaQRVe: 'QR-VE10000022-9A',
        SoGhe: '9A',
        GiaVe: thongTinTuyen('CT-RG').giaGoc,
        MaDiemDon: 'Bến Ninh Kiều',
        MaDiemTra: 'Bến tàu Rạch Giá',
        PhuongThucThanhToan: 'tien-mat',
        TrangThaiDonHang: 'cho-thanh-toan',
        TrangThaiVe: 'cho-khoi-hanh',
        GhiChu: 'Giữ chỗ chờ khách ra quầy thanh toán.',
        NguonDat: 'hotline',
        SoLanDaSua: 0
      },
      {
        ...thongTinChuyen('HCM-PT', '13:00'),
        MaVe: 'VE10000023-1',
        MaDonHang: 'DH10000023',
        MaKhachHang: 'KH66778899',
        HoTenNguoiDi: 'Phạm Thị Thúy',
        SdtNguoiDi: '0975612345',
        EmailNguoiDi: 'thuy.pham@example.com',
        SoLuongVeDaDat: 1,
        TongGiaVe: tongGiaTriDon('HCM-PT', 1),
        MaQRVe: 'QR-VE10000023-11A',
        SoGhe: '11A',
        GiaVe: thongTinTuyen('HCM-PT').giaGoc,
        MaDiemDon: 'Ngã tư Thủ Đức',
        MaDiemTra: 'Mũi Né',
        PhuongThucThanhToan: 'the',
        TrangThaiDonHang: 'da-thanh-toan',
        TrangThaiVe: 'cho-khoi-hanh',
        GhiChu: 'Khách có hành lý gửi khoang.',
        NguonDat: 'online',
        SoLanDaSua: 0
      },
      {
        ...thongTinChuyen('HCM-DL', '21:00'),
        MaVe: 'VE10000024-1',
        MaDonHang: 'DH10000024',
        MaKhachHang: 'KH77889900',
        HoTenNguoiDi: 'Vũ Hoài Lâm',
        SdtNguoiDi: '0932114477',
        EmailNguoiDi: 'lam.vu@example.com',
        SoLuongVeDaDat: 1,
        TongGiaVe: tongGiaTriDon('HCM-DL', 1),
        MaQRVe: 'QR-VE10000024-1B',
        SoGhe: '1B',
        GiaVe: thongTinTuyen('HCM-DL').giaGoc,
        MaDiemDon: 'Bến xe Miền Tây',
        MaDiemTra: 'Quảng trường Lâm Viên',
        PhuongThucThanhToan: 'chuyen-khoan',
        TrangThaiDonHang: 'da-thanh-toan',
        TrangThaiVe: 'cho-khoi-hanh',
        GhiChu: 'Chuyến đêm, khách cần nhắc giờ lên xe.',
        NguonDat: 'tai-quay',
        SoLanDaSua: 0
      },
      {
        ...thongTinChuyen('HCM-NT', '22:15'),
        MaVe: 'VE10000025-1',
        MaDonHang: 'DH10000025',
        MaKhachHang: 'KH88990011',
        HoTenNguoiDi: 'Bùi Thị Hà',
        SdtNguoiDi: '0918776655',
        EmailNguoiDi: 'ha.bui@example.com',
        SoLuongVeDaDat: 1,
        TongGiaVe: tongGiaTriDon('HCM-NT', 1),
        MaQRVe: 'QR-VE10000025-4B',
        SoGhe: '4B',
        GiaVe: thongTinTuyen('HCM-NT').giaGoc,
        MaDiemDon: 'Suối Tiên',
        MaDiemTra: 'Vinpearl Harbour',
        PhuongThucThanhToan: 'tien-mat',
        TrangThaiDonHang: 'cho-thanh-toan',
        TrangThaiVe: 'cho-khoi-hanh',
        GhiChu: 'Khách đặt trước qua tổng đài.',
        NguonDat: 'hotline',
        SoLanDaSua: 0
      },
      {
        ...thongTinChuyen('NT-DN', '23:00'),
        MaVe: 'VE10000026-1',
        MaDonHang: 'DH10000026',
        MaKhachHang: 'KH99001122',
        HoTenNguoiDi: 'Nguyễn Văn Đạt',
        SdtNguoiDi: '0909552233',
        EmailNguoiDi: 'dat.nguyen@example.com',
        SoLuongVeDaDat: 1,
        TongGiaVe: tongGiaTriDon('NT-DN', 1),
        MaQRVe: 'QR-VE10000026-8B',
        SoGhe: '8B',
        GiaVe: thongTinTuyen('NT-DN').giaGoc,
        MaDiemDon: 'Bến xe phía Nam Nha Trang',
        MaDiemTra: 'Cầu Rồng',
        PhuongThucThanhToan: 'chuyen-khoan',
        TrangThaiDonHang: 'da-thanh-toan',
        TrangThaiVe: 'cho-khoi-hanh',
        GhiChu: 'Khách cần xuống gần trung tâm Đà Nẵng.',
        NguonDat: 'online',
        SoLanDaSua: 0
      }
    ];
  }

  private todayString() {
    const date = new Date();
    return this.FormatDateInput(date);
  }

  private FormatDateInput(date: Date) {
    const yyyy = date.getFullYear();
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const dd = `${date.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}


export { BookingManagement as DanhSachVeComponent };
