import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminSessionService } from '../../../core/services/admin-session.service';
import { canAccessAdminRoute } from '../../../core/guards/admin-permissions';

@Component({
  imports: [RouterLink],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  private readonly session = inject(AdminSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly bookingRoutes = ['/admin/tickets/new', '/admin/tickets/list'];
  readonly dispatchRoutes = ['/admin/dispatch/routes', '/admin/dispatch/schedules', '/admin/dispatch/pickup', '/admin/dispatch/vehicles', '/admin/dispatch/drivers-assistants'];
  readonly customerRoutes = ['/admin/customers/accounts', '/admin/customers/support', '/admin/customers/contacts', '/admin/customers/reviews', '/admin/customers/lost-items'];
  readonly reportRoutes = ['/admin/reports/revenue', '/admin/reports/customer-report', '/admin/reports/drivers', '/admin/reports/routes', '/admin/reports/cancellations'];
  get accessDenied(): boolean { return this.route.snapshot.queryParamMap.get('access') === 'denied'; }
  firstAllowed(paths: string[]): string | null {
    return paths.find(path => canAccessAdminRoute(this.session.account(), path)) || null;
  }
  navigate(paths: string[]): void {
    const path = this.firstAllowed(paths);
    if (path) void this.router.navigateByUrl(path);
  }
}
