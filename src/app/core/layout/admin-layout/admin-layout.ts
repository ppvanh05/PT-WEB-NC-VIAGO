import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AdminSidebar } from '../admin-sidebar/admin-sidebar';
import { AdminTopbar } from '../admin-topbar/admin-topbar';
import { SidebarStateService } from '../../services/sidebar-state.service';
import { ToastService } from '../../services/toast.service';
import { Toast } from '../../../shared/components/toast/toast';

@Component({
  imports: [CommonModule, AdminSidebar, AdminTopbar, RouterOutlet, Toast],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.css',
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  readonly isCollapsed = inject(SidebarStateService).isCollapsed;
  readonly toastService = inject(ToastService);
}

