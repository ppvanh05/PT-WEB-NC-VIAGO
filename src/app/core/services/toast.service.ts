import { Injectable } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts: ToastMessage[] = [];

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const id = Date.now().toString();
    this.toasts.push({ id, type, message });
    setTimeout(() => this.remove(id), 3000);
  }

  showSuccess(message: string) {
    this.show(message, 'success');
  }

  showError(message: string) {
    this.show(message, 'error');
  }

  showWarning(message: string) {
    this.show(message, 'warning');
  }

  showInfo(message: string) {
    this.show(message, 'info');
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}
