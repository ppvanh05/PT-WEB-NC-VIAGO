import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

export interface AdminUser {
  name: string;
  role?: string;
  avatarUrl?: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read?: boolean;
}

export type AdminUserAction = 'profile' | 'change-password' | 'logout';

export interface AdminNotificationReadChange {
  notification: AdminNotification;
  read: boolean;
}

@Component({
  imports: [],
  selector: 'app-admin-topbar',
  styleUrl: './admin-topbar.css',
  templateUrl: './admin-topbar.html',
})
export class AdminTopbar {
  @Input() notificationCount = 0;
  @Input() notifications: AdminNotification[] = [];
  @Input() notificationPreviewLimit = 5;
  @Input() user: AdminUser = {
    name: 'Quản trị viên',
    role: 'Admin',
  };
  @Input() sidebarCollapsed = false;
  @Input() showDate = true;

  @Output() readonly toggleSidebar = new EventEmitter<void>();
  @Output() readonly notificationClick = new EventEmitter<void>();
  @Output() readonly notificationSelect = new EventEmitter<AdminNotification>();
  @Output() readonly notificationReadChange = new EventEmitter<AdminNotificationReadChange>();
  @Output() readonly markAllNotificationsRead = new EventEmitter<void>();
  @Output() readonly markAllNotificationsUnread = new EventEmitter<void>();
  @Output() readonly viewAllNotifications = new EventEmitter<void>();
  @Output() readonly userAction = new EventEmitter<AdminUserAction>();

  protected userMenuOpen = false;
  protected notificationMenuOpen = false;
  protected readonly today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  protected get userInitials(): string {
    return this.user.name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  protected get previewNotifications(): AdminNotification[] {
    return this.notifications
      .filter((notification) => !notification.read)
      .slice(0, Math.max(1, this.notificationPreviewLimit));
  }

  protected onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  protected toggleNotificationMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen = false;
    this.notificationMenuOpen = !this.notificationMenuOpen;
    if (this.notificationMenuOpen) this.notificationClick.emit();
  }

  protected selectNotification(notification: AdminNotification, event: MouseEvent): void {
    event.stopPropagation();
    this.notificationMenuOpen = false;
    this.notificationSelect.emit(notification);
  }

  protected markAllRead(event: MouseEvent): void {
    event.stopPropagation();
    this.markAllNotificationsRead.emit();
  }

  protected markAllUnread(event: MouseEvent): void {
    event.stopPropagation();
    this.markAllNotificationsUnread.emit();
  }

  protected toggleNotificationRead(notification: AdminNotification, event: MouseEvent): void {
    event.stopPropagation();
    this.notificationReadChange.emit({
      notification,
      read: !notification.read,
    });
  }

  protected viewAll(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationMenuOpen = false;
    this.viewAllNotifications.emit();
  }

  protected toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationMenuOpen = false;
    this.userMenuOpen = !this.userMenuOpen;
  }

  protected selectUserAction(action: AdminUserAction): void {
    this.userMenuOpen = false;
    this.userAction.emit(action);
  }

  protected onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).hidden = true;
  }

  @HostListener('document:click')
  protected closeUserMenu(): void {
    this.userMenuOpen = false;
    this.notificationMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  protected closeUserMenuOnEscape(): void {
    this.userMenuOpen = false;
    this.notificationMenuOpen = false;
  }
}
