import { Injectable } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts: ToastMessage[] = [];

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string, duration: number = 3500) {
    const id = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6);
    this.toasts.push({ id, type, message, title, duration });
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  showSuccess(message: string, title?: string) {
    this.show(message, 'success', title);
  }

  showError(message: string, title?: string) {
    this.show(message, 'error', title);
  }

  showWarning(message: string, title?: string) {
    this.show(message, 'warning', title);
  }

  showInfo(message: string, title?: string) {
    this.show(message, 'info', title);
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}

