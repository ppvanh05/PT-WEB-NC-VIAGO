import { CanDeactivateFn } from '@angular/router';
import type { Home } from './home';
export const bookingLeaveGuard: CanDeactivateFn<Home> = component => component.requestLeave();
