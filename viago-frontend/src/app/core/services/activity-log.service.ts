import { Injectable, inject } from '@angular/core';
import { AuditActor } from './audit-event';
import { AccountsApiService, roleLabel } from './accounts-api.service';
export interface SystemLog {
  id: string;
  timestamp: string;
  actor: AuditActor;
  action: string;
  status: 'Thành công' | 'Thất bại';
  details: string;
  ip: string;
  userAgent: string;
  target: { code: string; name: string; type: string };
  changes: { field: string; before: string; after: string }[];
}
const labels: Record<string, string> = {
  REGISTER: 'Đăng ký tài khoản khách hàng',
  LOGIN_SUCCESS: 'Đăng nhập',
  LOGIN_FAILED: 'Đăng nhập',
  CREATE_STAFF: 'Tạo tài khoản nhân viên',
  UPDATE_STAFF: 'Cập nhật tài khoản nhân viên',
  LOCK_STAFF: 'Khóa tài khoản nhân viên',
  UNLOCK_STAFF: 'Mở khóa tài khoản nhân viên',
  CREATE_CUSTOMER: 'Tạo tài khoản khách hàng',
  UPDATE_CUSTOMER: 'Cập nhật tài khoản khách hàng',
  LOCK_CUSTOMER: 'Khóa tài khoản khách hàng',
  UNLOCK_CUSTOMER: 'Mở khóa tài khoản khách hàng',
  UPDATE_PROFILE: 'Cập nhật thông tin cá nhân',
  LOGOUT: 'Đăng xuất',
  PASSWORD_RESET: 'Đổi mật khẩu',
};
@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private readonly api = inject(AccountsApiService);
  async load(refresh = false): Promise<SystemLog[]> {
    return (await this.api.all<any>('admin/activity-logs', 'admin', refresh)).map((log) => ({
      ...log,
      actor: { ...log.actor, role: roleLabel(log.actor.role) },
      action: labels[log.action] || log.action,
      status: log.status === 'ThanhCong' ? 'Thành công' : 'Thất bại',
      ip: log.ip || '—',
      userAgent: log.userAgent || '—',
    }));
  }
}
