import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebar } from '../admin-sidebar/admin-sidebar';
import { AdminTopbar } from '../admin-topbar/admin-topbar';
import { SidebarStateService } from '../../services/sidebar-state.service';

@Component({
  imports: [AdminSidebar, AdminTopbar, RouterOutlet],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.css',
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  readonly isCollapsed = inject(SidebarStateService).isCollapsed;
}
