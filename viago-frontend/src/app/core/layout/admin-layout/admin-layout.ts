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
import { roleLabel } from '../../services/accounts-api.service';

@Component({
  imports: [CommonModule, AdminSidebar, AdminTopbar, RouterOutlet, AdminProfile],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.css',
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  readonly roleLabel = roleLabel;
  readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);
  async logout(): Promise<void> { try { await this.session.logout(); } finally { await this.router.navigateByUrl('/admin/login'); } }
  readonly isCollapsed = inject(SidebarStateService).isCollapsed;
  @ViewChild(AdminProfile) profileDialog!: AdminProfile;
  profile: AdminProfileData = {
    familyName: '', givenName: '', displayName: this.session.account()?.name || '',
    phone: this.session.account()?.phoneNumber || '', email: this.session.account()?.email || '', gender: 'Khác',
    birthday: '', address: '', notes: '', avatarUrl: this.session.account()?.avatar || '',
  };
  profileSaved = false;

  openProfile(): void { this.profileSaved = false; this.profileDialog.open(this.profile); }
  saveProfile(profile: AdminProfileData): void { this.profile = profile; this.profileSaved = true; }
  readonly toastService = inject(ToastService);
}

/*
import { Toast } from '../../../shared/components/toast/toast';

@Component({
  imports: [CommonModule, AdminSidebar, AdminTopbar, RouterOutlet, Toast],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.css',
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  readonly isCollapsed = inject(SidebarStateService).isCollapsed;
  @ViewChild(AdminProfile) profileDialog!: AdminProfile;
  profile: AdminProfileData = {
    familyName: 'Nguyễn An', givenName: 'Ninh', displayName: 'Quản trị viên',
    phone: '0901234567', email: 'ninh.na@viago.vn', gender: 'Nam',
    birthday: '1985-03-15', address: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    notes: '', avatarUrl: '',
  };
  profileSaved = false;

  openProfile(): void {
    this.profileSaved = false;
    this.profileDialog.open(this.profile);
  }

  saveProfile(profile: AdminProfileData): void {
    this.profile = profile;
    this.profileSaved = true;
  }
  readonly toastService = inject(ToastService);
}
*/

