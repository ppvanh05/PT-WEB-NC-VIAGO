import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage { id: string; message: string; type: 'success'|'error'|'warning'|'info'; title?: string; duration?: number; }
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly subject = new BehaviorSubject<ToastMessage[]>([]);
  readonly toasts$ = this.subject.asObservable();
  get toasts(): ToastMessage[] { return this.subject.value; }
  show(message: string, type: ToastMessage['type'] = 'info', title?: string, duration = 3500): void { const id = Date.now() + '_' + Math.random().toString(36).slice(2, 6); this.subject.next([...this.subject.value, { id, message, type, title, duration }]); if (duration > 0) setTimeout(() => this.dismissToast(id), duration); }
  showSuccess(message: string, title?: string): void { this.show(message, 'success', title); }
  showError(message: string, title?: string): void { this.show(message, 'error', title); }
  showWarning(message: string, title?: string): void { this.show(message, 'warning', title); }
  showInfo(message: string, title?: string): void { this.show(message, 'info', title); }
  remove(id: string): void { this.dismissToast(id); }
  dismissToast(id: string): void { this.subject.next(this.subject.value.filter(t => t.id !== id)); }
}
