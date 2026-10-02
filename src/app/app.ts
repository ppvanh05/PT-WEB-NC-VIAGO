import { Component } from '@angular/core';
import {
  AdminNotification,
  AdminNotificationReadChange,
  AdminTopbar,
  AdminUser,
  AdminUserAction,
} from './core/layout/admin-topbar/admin-topbar';

@Component({
  imports: [AdminTopbar],
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { Card } from './shared/components/card/card';
import { Badge } from './shared/components/badge/badge';
import { CustomerNavbar } from './core/layout/customer-navbar/customer-navbar';

@Component({
  imports: [CustomerLayout],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected sidebarCollapsed = false;
  protected showAllNotifications = false;
  protected lastAction = 'Chưa có thao tác';

  protected notifications: AdminNotification[] = [
    {
      id: 'booking-1048',
      title: 'Có đơn đặt vé mới',
      message: 'Mã vé VG1048 vừa được thanh toán thành công.',
      time: '5 phút trước',
      read: false,
    },
    {
      id: 'schedule-204',
      title: 'Lịch trình cần xử lý',
      message: 'Chuyến TP.HCM - Đà Lạt lúc 22:00 chưa có tài xế.',
      time: '20 phút trước',
      read: false,
    },
    {
      id: 'rental-83',
      title: 'Yêu cầu thuê xe mới',
      message: 'Khách hàng đã gửi yêu cầu thuê xe 16 chỗ.',
      time: '1 giờ trước',
      read: false,
    },
    {
      id: 'refund-18',
      title: 'Yêu cầu hoàn vé',
      message: 'Yêu cầu HV0018 đang chờ xác nhận.',
      time: '2 giờ trước',
      read: true,
    },
  ];
  protected readonly title = signal('viago-frontend');
  title = signal('VIAGO');
  readonly router = inject(Router);

  protected get notificationCount(): number {
    return this.notifications.filter((notification) => !notification.read).length;
  }

  protected readonly adminUser: AdminUser = {
    name: 'Nguyễn Minh Anh',
    role: 'Quản trị viên',
  };

  protected toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  protected selectNotification(selected: AdminNotification): void {
    this.notifications = this.notifications.map((notification) =>
      notification.id === selected.id ? { ...notification, read: true } : notification,
    );
    this.lastAction = `Đã chọn: ${selected.title}`;
  }

  protected markAllNotificationsRead(): void {
    this.notifications = this.notifications.map((notification) => ({
      ...notification,
      read: true,
    }));
    this.lastAction = 'Đã đánh dấu tất cả thông báo là đã đọc';
  }

  protected markAllNotificationsUnread(): void {
    this.notifications = this.notifications.map((notification) => ({
      ...notification,
      read: false,
    }));
    this.lastAction = 'Đã đánh dấu tất cả thông báo là chưa đọc';
  }

  protected changeNotificationReadState(change: AdminNotificationReadChange): void {
    this.notifications = this.notifications.map((notification) =>
      notification.id === change.notification.id
        ? { ...notification, read: change.read }
        : notification,
    );
    this.lastAction = change.read
      ? `Đã đọc: ${change.notification.title}`
      : `Đã chuyển về chưa đọc: ${change.notification.title}`;
  }

  protected openAllNotifications(): void {
    this.showAllNotifications = true;
  }

  protected closeAllNotifications(): void {
    this.showAllNotifications = false;
  }

  protected handleUserAction(action: AdminUserAction): void {
    const labels: Record<AdminUserAction, string> = {
      profile: 'Đã chọn Hồ sơ cá nhân',
      'change-password': 'Đã chọn Đổi mật khẩu',
      logout: 'Đã chọn Đăng xuất',
    };

    this.lastAction = labels[action];
  }
}
