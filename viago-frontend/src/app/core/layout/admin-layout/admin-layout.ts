import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AdminSidebar } from '../admin-sidebar/admin-sidebar';
import { AdminTopbar } from '../admin-topbar/admin-topbar';
import { SidebarStateService } from '../../services/sidebar-state.service';
import { AdminProfile, AdminProfileData } from '../../../featured/admin/profile/profile';
import { ToastService } from '../../services/toast.service';
import { AdminSessionService } from '../../services/admin-session.service';
import { Router } from '@angular/router';
import {
  AccountsApiService,
  genderLabel,
  genderValue,
  roleLabel,
  statusLabel,
} from '../../services/accounts-api.service';

/** Hồ sơ nhân viên do GET/PATCH /admin/auth/profile trả về. */
export interface StaffProfile {
  staffId: string;
  lastName: string;
  firstName: string;
  displayName: string;
  phoneNumber: string;
  email: string;
  gender: string;
  birthday: string;
  address: string;
  notes: string;
  avatar: string;
  roleName: string;
  status: string;
}

const emptyProfile: AdminProfileData = {
  familyName: '', givenName: '', displayName: '', phone: '', email: '',
  gender: '', birthday: '', address: '', notes: '', avatarUrl: '',
};

@Component({
  imports: [CommonModule, AdminSidebar, AdminTopbar, RouterOutlet, AdminProfile],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.css',
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  readonly roleLabel = roleLabel;
  readonly session = inject(AdminSessionService);
  private readonly api = inject(AccountsApiService);
  private readonly router = inject(Router);
  async logout(): Promise<void> { try { await this.session.logout(); } finally { await this.router.navigateByUrl('/admin/login'); } }
  readonly isCollapsed = inject(SidebarStateService).isCollapsed;
  @ViewChild(AdminProfile) profileDialog!: AdminProfile;
  profile: AdminProfileData = { ...emptyProfile };
  profileSaved = false;

  /** Mở hộp thoại rồi tải hồ sơ thật từ backend. */
  async openProfile(): Promise<void> {
    this.profileSaved = false;
    this.profileDialog.openLoading();
    try {
      const data = await this.api.request<StaffProfile>('admin/auth/profile', 'GET', undefined, 'admin');
      this.profile = this.toForm(data);
      this.profileDialog.open(this.profile, {
        staffId: data.staffId,
        roleLabel: roleLabel(data.roleName),
        statusLabel: statusLabel(data.status),
        active: data.status === 'HoatDong',
      });
    } catch (error) {
      this.profileDialog.failLoad(this.reason(error, 'Không tải được thông tin cá nhân.'));
    }
  }

  /** Lưu hồ sơ xuống bảng nhân viên; lỗi thì giữ hộp thoại mở để sửa lại. */
  async saveProfile(profile: AdminProfileData): Promise<void> {
    try {
      const data = await this.api.request<StaffProfile>('admin/auth/profile', 'PATCH', {
        lastName: profile.familyName,
        firstName: profile.givenName,
        displayName: profile.displayName,
        phoneNumber: profile.phone,
        email: profile.email,
        gender: genderValue(profile.gender),
        birthday: profile.birthday || undefined,
        address: profile.address,
        notes: profile.notes,
        avatar: profile.avatarUrl,
      }, 'admin');
      this.profile = this.toForm(data);
      this.session.patchAccount({
        name: data.displayName,
        phoneNumber: data.phoneNumber,
        email: data.email,
        avatar: data.avatar,
      });
      this.profileSaved = true;
      this.profileDialog.finishSave();
    } catch (error) {
      this.profileDialog.failSave(this.reason(error, 'Không lưu được thông tin cá nhân.'));
    }
  }

  private toForm(data: StaffProfile): AdminProfileData {
    return {
      familyName: data.lastName,
      givenName: data.firstName,
      displayName: data.displayName,
      phone: data.phoneNumber,
      email: data.email,
      gender: data.gender ? genderLabel(data.gender) : '',
      birthday: data.birthday,
      address: data.address,
      notes: data.notes,
      avatarUrl: data.avatar,
    };
  }

  private reason(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  readonly toastService = inject(ToastService);
}
