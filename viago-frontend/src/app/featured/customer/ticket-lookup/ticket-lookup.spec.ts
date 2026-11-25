import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AccountsApiService } from '../../../core/services/accounts-api.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { AuthService } from '../../../core/services/auth.service';
import { TicketLookup } from './ticket-lookup';

/** Ngày YYYY-MM-DD cách hiện tại một số giờ cho trước, kèm giờ khởi hành khớp. */
function departure(hoursFromNow: number) {
  const at = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    DepartureDate: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
    GioKhoiHanh: `${pad(at.getHours())}:${pad(at.getMinutes())}:00`,
  };
}

const ticket = (over: Record<string, unknown> = {}) => ({
  MaVe: 'VE001',
  SoGhe: 'A01',
  BienSoXe: '51B-890.12',
  DiemDon: 'Văn phòng Quận 1',
  DiemDonThoiGian: '07:30',
  DiemTra: 'Văn phòng Ninh Kiều',
  DiemTraThoiGian: '11:00',
  GiaVe: 180000,
  TrangThaiVe: 'Chờ khởi hành',
  MaQRVe: 'QR001',
  ...over,
});

const order = (over: Record<string, unknown> = {}) => ({
  MaDonHang: 'DH001',
  MaKhachHang: 'KH001',
  HoTenNguoiDi: 'Nguyễn Văn An',
  SoDienThoai: '0912345678',
  Email: 'an@example.com',
  ThoiGianDat: '2026-06-01T10:00:00.000Z',
  SoLuongVeDaDat: 1,
  TenTuyen: 'TP.HCM - Cần Thơ',
  GioTra: '11:00:00',
  DiemDon: 'Văn phòng Quận 1',
  DiemTra: 'Văn phòng Ninh Kiều',
  ThoiGianCoMatTruoc: '30',
  GioCanCoMat: '07:30:00',
  TongGiaVe: 180000,
  PhuongThucThanhToan: 'Tiền mặt',
  TrangThaiDonHang: 'Chờ khởi hành',
  BienSoXe: '51B-890.12',
  MaDiemDon: 'DD001',
  MaDiemTra: 'DD002',
  SoLanDaSua: 0,
  GioiHanChinhSua: 3,
  Tickets: [ticket()],
  ...departure(48),
  ...over,
});

function build(current: ReturnType<typeof order> | null = null) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TicketLookup],
    providers: [
      { provide: AccountsApiService, useValue: { request: async () => ({ items: [], pagination: { totalPages: 1 } }) } },
      { provide: AuthService, useValue: { isLoggedIn: () => false, currentUser: () => null } },
      { provide: AuthModalService, useValue: { open: () => {}, close: () => {}, mode: () => 'login' } },
      { provide: Router, useValue: { navigate: () => Promise.resolve(true), navigateByUrl: () => Promise.resolve(true) } },
    ],
  });
  const page = TestBed.createComponent(TicketLookup).componentInstance;
  page.currentOrder = current as never;
  return page;
}

describe('Customer ticket lookup', () => {
  it('refunds everything more than a day before departure and half inside the last day', () => {
    expect(build(order({ ...departure(48) })).getRefundPercentage()).toBe(100);
    expect(build(order({ ...departure(25) })).getRefundPercentage()).toBe(100);
    expect(build(order({ ...departure(18) })).getRefundPercentage()).toBe(50);
    // Giờ khởi hành chỉ lưu tới phút nên mốc tròn 24 giờ thực tế lùi vài chục
    // giây và rơi vào bậc 50%; lấy 23 giờ cho rõ ý thay vì phụ thuộc giây.
    expect(build(order({ ...departure(23) })).getRefundPercentage()).toBe(50);
  });

  it('refunds nothing inside the last twelve hours or once the coach has left', () => {
    expect(build(order({ ...departure(6) })).getRefundPercentage()).toBe(0);
    expect(build(order({ ...departure(-2) })).getRefundPercentage()).toBe(0);
    expect(build(null).getRefundPercentage()).toBe(0);
  });

  it('allows cancelling only a waiting ticket on a waiting order that still earns a refund', () => {
    const page = build(order({ ...departure(48) }));
    expect(page.canCancelTicket(ticket() as never)).toBe(true);
    expect(page.canCancelTicket(ticket({ TrangThaiVe: 'Đã hủy' }) as never)).toBe(false);
    expect(page.canCancelTicket(ticket({ TrangThaiVe: 'Đã hoàn thành' }) as never)).toBe(false);
    const paid = build(order({ ...departure(48), TrangThaiDonHang: 'Chờ thanh toán' }));
    expect(paid.canCancelTicket(ticket() as never)).toBe(false);
    const late = build(order({ ...departure(6) }));
    expect(late.canCancelTicket(ticket() as never)).toBe(false);
  });

  it('explains on the button why a ticket cannot be cancelled', () => {
    const page = build(order({ ...departure(48) }));
    expect(page.getCancelButtonTitle(ticket({ TrangThaiVe: 'Đã hủy' }) as never))
      .toContain('đã được hủy');
    expect(page.getCancelButtonTitle(ticket({ TrangThaiVe: 'Đã hoàn thành' }) as never))
      .toContain('đang chờ khởi hành');
    expect(build(order({ ...departure(6) })).getCancelButtonTitle(ticket() as never))
      .toContain('dưới 12 giờ');
    expect(page.getCancelButtonTitle(ticket() as never)).toContain('Hủy riêng vé này');
  });

  it('counts the edits left and stops editing once the allowance runs out', () => {
    expect(build(order({ GioiHanChinhSua: 3, SoLanDaSua: 1 })).getEditRemaining()).toBe(2);
    expect(build(order({ GioiHanChinhSua: 3, SoLanDaSua: 3 })).getEditRemaining()).toBe(0);
    // Sửa quá số lần cho phép vẫn không cho ra số âm.
    expect(build(order({ GioiHanChinhSua: 2, SoLanDaSua: 5 })).getEditRemaining()).toBe(0);
    expect(build(order({ GioiHanChinhSua: 3, SoLanDaSua: 3 })).canEditOrder()).toBe(false);
  });

  it('closes editing within two hours of departure even when edits remain', () => {
    expect(build(order({ ...departure(48) })).isEditButtonEnabled).toBe(true);
    expect(build(order({ ...departure(1) })).isEditButtonEnabled).toBe(false);
    expect(build(order({ ...departure(48), SoLanDaSua: 3 })).isEditButtonEnabled).toBe(false);
  });

  it('closes editing once any ticket of the order has been used', () => {
    const page = build(order({
      ...departure(48),
      Tickets: [ticket(), ticket({ MaVe: 'VE002', TrangThaiVe: 'Đã hoàn thành' })],
    }));
    expect(page.isEditButtonEnabled).toBe(false);
    expect(page.isEditButtonDisabled).toBe(true);
  });

  it('separates live tickets from cancelled ones and totals only the live ones', () => {
    const page = build(order({
      Tickets: [
        ticket({ MaVe: 'VE001', GiaVe: 180000 }),
        ticket({ MaVe: 'VE002', GiaVe: 180000, TrangThaiVe: 'Đã hủy' }),
        ticket({ MaVe: 'VE003', GiaVe: 200000 }),
      ],
    }));
    expect(page.getActiveTicketCount()).toBe(2);
    expect(page.getCanceledTicketCount()).toBe(1);
    expect(page.getActiveTicketTotal()).toBe(380000);
  });

  it('hides most of the email when showing the order to whoever looked it up', () => {
    const page = build(order());
    expect(page.maskEmail('nguyenvanan@example.com')).toBe('ng***@example.com');
    expect(page.maskEmail('an@example.com')).toBe('a*@example.com');
    expect(page.maskEmail('khong-phai-email')).toBe('khong-phai-email');
  });

  it('shows departure times as hours and minutes without the seconds', () => {
    const page = build(order());
    expect(page.formatTimeStr('07:30:00')).toBe('07:30');
    expect(page.formatTimeStr('14:05')).toBe('14:05');
    expect(page.formatTimeStr('')).toBe('');
  });
});
