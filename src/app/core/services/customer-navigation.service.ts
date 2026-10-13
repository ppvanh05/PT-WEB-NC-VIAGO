import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomerNavigationService {
  private readonly authRequest = new Subject<'login' | 'register'>();
  readonly authRequested = this.authRequest.asObservable();
  showAuth(mode: 'login' | 'register' = 'login'): void { this.authRequest.next(mode); }
  private readonly homeRequest = new Subject<void>();
  readonly homeRequested = this.homeRequest.asObservable();
  showHome(): void { this.homeRequest.next(); }
}
