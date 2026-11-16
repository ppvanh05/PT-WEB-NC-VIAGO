import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminSessionService } from '../services/admin-session.service';
import { canAccessAdminRoute } from './admin-permissions';
export const adminSessionGuard: CanActivateFn = async (_route, state) => {
  const session = inject(AdminSessionService),
    router = inject(Router);
  if (!(await session.restore()))
    return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
  return canAccessAdminRoute(session.account(), state.url) ||
    router.createUrlTree(['/admin/home'], { queryParams: { access: 'denied' } });
};
