import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomerNavigationService {
  private readonly authRequest = new Subject<void>();
  readonly authRequested = this.authRequest.asObservable();
  showAuth(): void { this.authRequest.next(); }
  private readonly homeRequest = new Subject<void>();
  readonly homeRequested = this.homeRequest.asObservable();
  showHome(): void { this.homeRequest.next(); }
}
