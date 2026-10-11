import { Injectable } from '@angular/core';
import { AuditActor } from './audit-event';
import { STAFF_SEED } from '../../featured/admin/staff/staff-account-management/staff-seed';

export interface SystemLog {
  id: string; timestamp: string; actor: AuditActor; action: string; status: 'Thành công' | 'Thất bại';
  details: string; ip: string; userAgent: string; target: { code: string; name: string; type: string };
  changes: { field: string; before: string; after: string }[];
}
const ACTIONS: Record<string, string> = {
  REGISTER: 'Đăng ký tài khoản khách hàng', CREATE_STAFF: 'Tạo tài khoản nhân viên', CREATE_CUSTOMER: 'Tạo tài khoản khách hàng',
  UPDATE_STAFF: 'Cập nhật tài khoản nhân viên', LOCK_STAFF: 'Khóa tài khoản nhân viên', UNLOCK_STAFF: 'Mở khóa tài khoản nhân viên',
  UPDATE_CUSTOMER: 'Cập nhật tài khoản khách hàng', LOCK_CUSTOMER: 'Khóa tài khoản khách hàng', UNLOCK_CUSTOMER: 'Mở khóa tài khoản khách hàng',
  LOGIN_SUCCESS: 'Đăng nhập', LOGIN_FAILED: 'Đăng nhập', LOGOUT: 'Đăng xuất', PASSWORD_RESET: 'Đổi mật khẩu',
  LOCKOUT: 'Khóa tài khoản', OTP_SENT: 'Gửi OTP', OTP_VERIFIED: 'Xác thực OTP', OTP_FAILED: 'Xác thực OTP', UPDATE_PROFILE: 'Cập nhật thông tin cá nhân',
};
@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  readError = '';
  private read(key: string, fallback: unknown[] = []): any[] {
    try { const value = localStorage.getItem(key); if (!value) return fallback; const items: unknown = JSON.parse(value); if (!Array.isArray(items)) throw new Error(); return items.filter(v => v && typeof v === 'object'); }
    catch { this.readError = 'Một nguồn nhật ký không thể đọc được. Các nguồn còn lại vẫn được hiển thị.'; return []; }
  }
  load(): SystemLog[] {
    this.readError = '';
    const staff = this.read('viago_admin_staff_accounts_v1', STAFF_SEED);
    const customers = this.read('viago_admin_customer_accounts_v1');
    const users = this.read('viago_users');
    const logs: SystemLog[] = [];
    const unknown: AuditActor = { code: '', name: 'Chưa xác định', username: '', role: 'Chưa xác định', phone: '' };
    for (const [items, type] of [[staff, 'Nhân viên'], [customers, 'Khách hàng']] as const) {
      for (const account of items) {
        if (!Array.isArray(account.logs)) continue;
        account.logs.forEach((entry: any, index: number) => {
          if (!entry || typeof entry !== 'object') return;
          const timestamp = this.parseTime(entry.timestamp || entry.time);
          const creation = /^(Tạo mới|Khởi tạo tài khoản|Tạo tài khoản|Cấp quyền truy cập)/i.test(entry.title || '') || /^(Tạo (mới )?tài khoản|Thêm mới tài khoản|Khởi tạo tài khoản)/i.test(entry.desc || '') || (entry.type === 'create' && !entry.title);
          const actor = entry.actor || (creation ? { ...unknown, name: 'Quản trị viên', role: 'Quản trị viên' } : unknown);
          logs.push({ id: entry.code || `${type}-${account.code}-${index}`, timestamp, actor: this.actor(actor),
            action: ACTIONS[entry.action] || (creation ? `Tạo tài khoản ${type.toLowerCase()}` : entry.title || 'Thao tác'),
            status: entry.status === 'Thất bại' ? 'Thất bại' : 'Thành công', details: entry.desc || '', ip: entry.ip || '—', userAgent: entry.userAgent || '—',
            target: entry.target || { code: account.code || '', name: account.name || '', type }, changes: Array.isArray(entry.changes) ? entry.changes : [] });
        });
      }
    }
    for (const entry of this.read('viago_activity_log')) {
      const user = users.find(u => u.phoneNumber === entry.phoneNumber || u.phone === entry.phoneNumber);
      const failed = ['LOGIN_FAILED', 'OTP_FAILED', 'LOCKOUT'].includes(entry.action);
      logs.push({ id: entry.id, timestamp: this.parseTime(entry.timestamp),
        actor: this.actor(entry.actor || (user ? { code: user.id, name: user.name, username: user.phoneNumber, role: user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng', phone: user.phoneNumber } : { ...unknown, username: entry.phoneNumber || '', phone: entry.phoneNumber || '', role: entry.action === 'REGISTER' ? 'Khách hàng' : 'Chưa xác định' })),
        action: ACTIONS[entry.action] || entry.action || 'Thao tác', status: failed ? 'Thất bại' : 'Thành công', details: entry.details || '', ip: entry.ip || '—', userAgent: entry.userAgent || '—',
        target: entry.target || { code: user?.id || entry.actor?.code || '', name: user?.name || entry.actor?.name || '', type: entry.action === 'REGISTER' ? 'Khách hàng' : 'Tài khoản' }, changes: [] });
    }
    try {
      const booking = JSON.parse(localStorage.getItem('viago_customer_booking_state_v1') || 'null');
      if (booking && Array.isArray(booking.audit)) {
        const actions: Record<string, string> = { HOLD_SEATS: 'Giữ / đổi ghế', CREATE_BOOKING: 'Đặt vé trực tuyến', EXPIRE_BOOKING: 'Hết hạn giữ chỗ', CANCEL_HOLD: 'Hủy giữ chỗ', PAYMENT_CONFIRMED: 'Xác nhận thanh toán', PAYMENT_FAILED: 'Thanh toán thất bại', PRINT_TICKET: 'Mở hộp thoại in vé' };
        for (const entry of booking.audit) {
          if (!entry?.id || !entry.at) continue;
          logs.push({ id: entry.id, timestamp: this.parseTime(entry.at), actor: this.actor(entry.actor || unknown), action: actions[entry.action] || entry.action, status: entry.result === 'failure' ? 'Thất bại' : 'Thành công', details: `${actions[entry.action] || entry.action}${entry.orderId ? ' · ' + entry.orderId : ''}`, ip: '—', userAgent: entry.userAgent || '—', target: { code: entry.orderId || entry.owner, name: '', type: 'Đơn đặt vé' }, changes: [{ field: 'Trạng thái / ghế', before: entry.before || '', after: entry.after || '' }] });
        }
      }
    } catch { this.readError = 'Không đọc được nhật ký đặt vé.'; }
    return [...new Map(logs.filter(log => typeof log.id === 'string').map(log => [log.id, log])).values()].sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
  }
  private actor(value: any): AuditActor { return { code: String(value.code || ''), name: String(value.name || 'Chưa xác định'), username: String(value.username || ''), role: String(value.role || 'Chưa xác định'), phone: String(value.phone || '') }; }
  parseTime(value: unknown): string {
    if (typeof value !== 'string') return '';
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return Number.isNaN(Date.parse(value)) ? '' : new Date(value).toISOString();
    const local = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
    const vi = /^(?:(\d{1,2}):(\d{2})(?::(\d{2}))?[, ]+)?(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[, ]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
    if (!local && !vi) return '';
    const y = Number(local?.[1] || vi?.[6]), m = Number(local?.[2] || vi?.[5]), d = Number(local?.[3] || vi?.[4]);
    const h = Number(local?.[4] || vi?.[1] || vi?.[7] || 0), min = Number(local?.[5] || vi?.[2] || vi?.[8] || 0), sec = Number(local?.[6] || vi?.[3] || vi?.[9] || 0);
    const date = new Date(y, m - 1, d, h, min, sec);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d && h < 24 && min < 60 && sec < 60 ? date.toISOString() : '';
  }
}
