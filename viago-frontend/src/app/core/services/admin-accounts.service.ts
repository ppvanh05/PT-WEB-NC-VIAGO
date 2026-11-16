import { Injectable, inject } from '@angular/core';
import {
  AccountsApiService,
  genderLabel,
  genderValue,
  roleLabel,
  statusLabel,
} from './accounts-api.service';
export interface RoleOption {
  mavaitro: string;
  tenvaitro: string;
}
export interface PermissionOption {
  maquyen: string;
  tenquyen: string;
  mota: string | null;
  nhomchucnang: string;
}
export interface MemberTier {
  mahang: string;
  tenhang: string;
}
export interface FixedRoleGroup {
  roleId: string;
  roleName: string;
  groupKeys: string[];
  permissionIds: string[];
  permissions: string[];
  missing: string[];
}
@Injectable({ providedIn: 'root' })
export class AdminAccountsService {
  private readonly api = inject(AccountsApiService);
  roles: RoleOption[] = [];
  permissions: PermissionOption[] = [];
  roleGroups: FixedRoleGroup[] = [];
  memberTiers: MemberTier[] = [];
  invalidateReads(): void { this.api.invalidateAdminReads(); }
  async options() {
    const data = await this.api.request<{ roles: RoleOption[]; permissions: PermissionOption[]; roleGroups: FixedRoleGroup[] }>(
      'admin/employees/options',
      'GET',
      undefined,
      'admin',
    );
    this.roles = data.roles;
    this.permissions = data.permissions;
    this.roleGroups = data.roleGroups;
    return data;
  }
  async customerOptions() {
    const data = await this.api.request<{ memberTiers: MemberTier[] }>(
      'admin/customers/options',
      'GET',
      undefined,
      'admin',
    );
    this.memberTiers = data.memberTiers;
    return data;
  }
  employee(raw: any): any {
    return {
      ...raw,
      gender: genderLabel(raw.gender),
      defaultRole: roleLabel(raw.defaultRole),
      status: statusLabel(raw.status),
      date: raw.startDate?.split('-').reverse().join('/') || '',
      initials: raw.name
        .split(/\s+/)
        .slice(-2)
        .map((v: string) => v[0])
        .join(''),
      roles: roleLabel(raw.defaultRole),
      contractType: (
        {
          KhongXacDinhThoiHan: 'Hợp đồng không xác định thời hạn',
          XacDinhThoiHan1Nam: 'Hợp đồng xác định thời hạn 1 năm',
          ThuViec: 'Hợp đồng thử việc',
        } as Record<string, string>
      )[raw.contractType],
      logs: [],
      lockInfo:
        raw.status === 'DaKhoa'
          ? {
              reason: raw.lockReason || '',
              date: raw.lockedAt ? new Date(raw.lockedAt).toLocaleString('vi-VN') : '',
            }
          : null,
    };
  }
  async employees() {
    const rows = await this.api.all<any>('admin/employees', 'admin');
    return rows.map((row) => this.employee(row));
  }
  async saveEmployee(e: any, password: string, creating: boolean, applyRolePermissions = false) {
    const role = this.roles.find((r) => roleLabel(r.tenvaitro) === e.defaultRole);
    if (!role) throw new Error('Vai trò không tồn tại trong Supabase.');
    const body = {
      username: e.username,
      firstName: e.firstName,
      lastName: e.lastName,
      phoneNumber: e.phone,
      email: e.email,
      gender: genderValue(e.gender),
      birthday: e.birthDate,
      startDate: e.startDate,
      roleId: role.mavaitro,
      contractType: (
        {
          'Hợp đồng không xác định thời hạn': 'KhongXacDinhThoiHan',
          'Hợp đồng xác định thời hạn 1 năm': 'XacDinhThoiHan1Nam',
          'Hợp đồng thử việc': 'ThuViec',
        } as Record<string, string>
      )[e.contractType],
      ...(!creating ? { applyRolePermissions } : {}),
      address: e.address,
      notes: e.notes,
      avatar: e.avatarUrl,
      ...(creating ? { password } : {}),
    };
    return this.employee(
      await this.api.request(
        `admin/employees${creating ? '' : '/' + encodeURIComponent(e.code)}`,
        creating ? 'POST' : 'PUT',
        body,
        'admin',
      ),
    );
  }
  async employeeStatus(id: string, lock: boolean, reason: string) {
    return this.employee(
      await this.api.request(
        'admin/employees/' + encodeURIComponent(id) + '/status',
        'PATCH',
        { status: lock ? 'DaKhoa' : 'HoatDong', reason },
        'admin',
      ),
    );
  }
  customer(raw: any): any {
    return {
      ...raw,
      gender: genderLabel(raw.gender),
      status: statusLabel(raw.status),
      date: raw.registeredAt ? new Date(raw.registeredAt).toLocaleDateString('vi-VN') : '',
      initials: raw.name
        .split(/\s+/)
        .slice(-2)
        .map((v: string) => v[0])
        .join(''),
      memberTier: raw.memberTier || 'Không có',
      savedMemberTier: raw.memberTier || 'Không có',
      tickets: `${raw.tickets || 0} vé`,
      bookings: [],
      logs: [],
      lockInfo:
        raw.status === 'DaKhoa'
          ? {
              date: raw.lockedAt ? new Date(raw.lockedAt).toLocaleString('vi-VN') : '',
              reason: raw.lockReason || '',
            }
          : null,
    };
  }
  async customers() {
    return (await this.api.all<any>('admin/customers', 'admin')).map((row) => this.customer(row));
  }
  async saveCustomer(e: any, creating: boolean) {
    const tier = this.memberTiers.find((t) => t.tenhang === e.memberTier);
    const tierChanged = creating || e.memberTier !== e.savedMemberTier;
    if (tierChanged && e.memberTier && e.memberTier !== 'Không có' && !tier)
      throw new Error('Hạng thành viên đã chọn không còn khả dụng. Vui lòng tải lại danh mục.');
    const body = {
      name: e.name,
      phoneNumber: e.phone,
      ...(!creating || e.email?.trim() ? { email: e.email?.trim() || '' } : {}),
      gender: genderValue(e.gender),
      ...(!creating || e.birthDate ? { birthday: e.birthDate || '' } : {}),
      occupation: e.occupation || '',
      avatar: e.avatar || '',
      ...(tierChanged ? { memberTierId: tier?.mahang || '' } : {}),
    };
    let raw = await this.api.request<any>(
      `admin/customers${creating ? '' : '/' + encodeURIComponent(e.code)}`,
      creating ? 'POST' : 'PATCH',
      body,
      'admin',
    );
    return this.customer(raw);
  }
  async customerStatus(id: string, lock: boolean, reason: string) {
    return this.customer(
      await this.api.request(
        'admin/customers/' + encodeURIComponent(id) + '/status',
        'PATCH',
        { status: lock ? 'DaKhoa' : 'HoatDong', reason },
        'admin',
      ),
    );
  }
  customerPassword(id: string, adminPassword: string, newPassword: string) {
    return this.api.request<{ success: boolean; accountId: string }>(
      'admin/customers/' + encodeURIComponent(id) + '/password',
      'POST',
      { adminPassword, newPassword },
      'admin',
    );
  }
  async history(id: string) {
    const rows = await this.api.all<any>(
      'admin/customers/' + encodeURIComponent(id) + '/tickets',
      'admin',
    );
    return rows.map((t) => ({
      code: t.id,
      route: t.route,
      seat: t.seat,
      date: t.dateLabel,
      price: t.priceLabel,
      status: t.status,
    }));
  }
  async logs(kind: 'employees' | 'customers', id: string) {
    return (await this.api.all<any>(`admin/${kind}/${encodeURIComponent(id)}/logs`, 'admin')).map(
      (row) => ({
        type: row.action.startsWith('LOCK') ? 'lock' : 'create',
        title: row.action,
        time: new Date(row.timestamp).toLocaleString('vi-VN'),
        desc: row.details,
        code: row.id,
        ip: row.ip || '',
        actor: row.actor,
        changes: row.changes,
      }),
    );
  }
}
