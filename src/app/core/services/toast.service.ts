import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  private toastId = 0;

  showSuccess(message: string): void {
    this.addToast(message, 'success');
  }

  showError(message: string): void {
    this.addToast(message, 'error');
  }

  showWarning(message: string): void {
    this.addToast(message, 'warning');
  }

  showInfo(message: string): void {
    this.addToast(message, 'info');
  }

  private addToast(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    const id = this.toastId++;
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, { id, message, type }]);

    setTimeout(() => {
      this.dismissToast(id);
    }, 3000);
  }

  dismissToast(id: number): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(t => t.id !== id));
  }
}
