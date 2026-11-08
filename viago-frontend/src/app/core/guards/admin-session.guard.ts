import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminSessionService } from '../services/admin-session.service';
export const adminSessionGuard: CanActivateFn = async (_route, state) => {
  const session = inject(AdminSessionService),
    router = inject(Router);
  return (
    (await session.restore()) ||
    router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } })
  );
};
