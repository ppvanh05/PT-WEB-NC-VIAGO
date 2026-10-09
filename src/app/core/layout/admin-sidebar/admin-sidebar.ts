import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarStateService } from '../../services/sidebar-state.service';

interface SubItem {
  label: string;
  route?: string;
}

interface SidebarItem {
  label: string;
  icon: string;
  route?: string;
  expandable?: boolean;
  children?: SubItem[];
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './admin-sidebar.css',
  templateUrl: './admin-sidebar.html',
})
export class AdminSidebar implements OnInit {
  private sidebarState = inject(SidebarStateService);
  private router = inject(Router);

  readonly isCollapsed = this.sidebarState.isCollapsed;
  readonly activeRoute = signal('/admin/home');
  readonly expandedItem = signal<string | null>(null);

  readonly menuItems: SidebarItem[] = [
    { label: 'Tổng quan', icon: 'dashboard', route: '/admin/home' },
    {
      label: 'Quản lý đặt vé', icon: 'ticket', expandable: true,
      children: [
        { label: 'Đặt vé mới', route: '/admin/tickets/new' },
        { label: 'Quản lý vé đã đặt', route: '/admin/tickets/list' },
      ]
    },
    {
      label: 'Quản lý điều phối', icon: 'truck', expandable: true,
      children: [
        { label: 'Tuyến xe', route: '/admin/dispatch/routes' },
        { label: 'Lịch trình', route: '/admin/dispatch/schedules' },
        { label: 'Đón trả', route: '/admin/dispatch/pickup' },
        { label: 'Phương tiện', route: '/admin/dispatch/vehicles' },
        { label: 'Tài xế & Phụ xe', route: '/admin/dispatch/drivers' },
      ]
    },
    {
      label: 'Khách hàng', icon: 'users', expandable: true,
      children: [
        { label: 'Tài khoản khách hàng', route: '/admin/customers/accounts' },
        { label: 'Đánh giá & Phản hồi', route: '/admin/customers/reviews' },
        { label: 'Đồ thất lạc', route: '/admin/customers/lost-items' },
      ]
    },
    {
      label: 'Nhân viên', icon: 'users', expandable: true,
      children: [
        { label: 'Tài khoản nhân viên', route: '/admin/staff/accounts' },
      ]
    },
    {
      label: 'Nội dung', icon: 'file', expandable: true,
      children: [
        { label: 'Tin tức', route: '/admin/content/news' },
        { label: 'Chính sách', route: '/admin/content/policies' },
        { label: 'Khuyến mãi', route: '/admin/content/promotions' },
      ]
    },
    { label: 'Thuê xe hợp đồng', icon: 'contract', route: '/admin/contract' },
    {
      label: 'Báo cáo', icon: 'chart', expandable: true,
      children: [
        { label: 'Doanh thu', route: '/admin/reports/revenue' },
        { label: 'Khách hàng', route: '/admin/reports/customers' },
        { label: 'Tài xế & Phụ xe', route: '/admin/reports/drivers' },
        { label: 'Tuyến xe', route: '/admin/reports/routes' },
        { label: 'Hoàn hủy', route: '/admin/reports/cancellations' },
      ]
    },
    { label: 'Quản lý nhật ký', icon: 'log', route: '/admin/logs' },
  ];

  ngOnInit(): void {
    this.updateActiveFromUrl(this.router.url);

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updateActiveFromUrl(event.urlAfterRedirects || event.url);
    });
  }

  private updateActiveFromUrl(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.activeRoute.set(cleanUrl);

    for (const item of this.menuItems) {
      if (item.expandable && item.children) {
        if (item.children.some(child => child.route === cleanUrl)) {
          this.expandedItem.set(item.label);
          break;
        }
      }
    }
  }

  toggleCollapse(): void {
    this.sidebarState.toggle();
  }

  toggleExpand(label: string): void {
    this.expandedItem.set(this.expandedItem() === label ? null : label);
  }

  isExpanded(label: string): boolean {
    return this.expandedItem() === label;
  }

  isParentActive(item: SidebarItem): boolean {
    if (!item.expandable) {
      const current = this.activeRoute();
      return current === item.route || ((item.route === '/admin/home' || item.route === '/admin') && (current === '/admin' || current === '/admin/home'));
    }
    return !!(item.children?.some(c => c.route === this.activeRoute()));
  }

  selectItem(item: SidebarItem): void {
    if (item.expandable) {
      this.toggleExpand(item.label);
    } else if (item.route) {
      this.activeRoute.set(item.route);
      this.router.navigateByUrl(item.route);
    }
  }

  selectSubItem(route: string | undefined): void {
    if (route) {
      this.activeRoute.set(route);
      this.router.navigateByUrl(route);
    }
  }
}
