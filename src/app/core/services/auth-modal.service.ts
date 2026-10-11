import { Injectable, signal } from '@angular/core';

/** Trạng thái hiển thị popup Đăng nhập / Đăng ký dùng chung cho toàn bộ trang Customer. */
@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
