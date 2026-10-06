import { Component, inject, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebar } from '../admin-sidebar/admin-sidebar';
import { AdminTopbar } from '../admin-topbar/admin-topbar';
import { SidebarStateService } from '../../services/sidebar-state.service';
import { AdminProfile, AdminProfileData } from '../../../featured/admin/profile/profile';

@Component({
  imports: [AdminSidebar, AdminTopbar, RouterOutlet, AdminProfile],
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
}
