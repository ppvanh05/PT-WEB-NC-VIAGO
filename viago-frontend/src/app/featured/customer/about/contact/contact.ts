import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { aboutRequest } from '../about-api';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['../../customer-pages.css', './contact.css', '../../customer-page-theme.css'],
})
export class Contact {
  request = { fullName: '', phone: '', email: '', subject: 'HoTroDatVe', message: '' };
  sending = false;
  error = '';
  success = '';
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy = inject(DestroyRef);
  private readonly abort = new AbortController();
  constructor() {
    this.destroy.onDestroy(() => this.abort.abort());
  }

  async submit(): Promise<void> {
    if (this.sending) return;
    this.sending = true;
    this.error = '';
    this.success = '';
    try {
      const data = await aboutRequest<{ received: boolean; message: string }>(
        '/contact',
        {
          fullName: this.request.fullName.trim(),
          phone: this.request.phone.trim(),
          ...(this.request.email.trim() ? { email: this.request.email.trim() } : {}),
          subject: this.request.subject,
          message: this.request.message.trim(),
        },
        this.abort.signal,
      );
      if (!data.received) throw new Error('Chưa thể xác nhận yêu cầu. Vui lòng thử lại.');
      if (!this.abort.signal.aborted) {
        this.success = data.message;
        this.request.message = '';
      }
    } catch (e) {
      if (!this.abort.signal.aborted)
        this.error = e instanceof Error ? e.message : 'Không gửi được yêu cầu.';
    } finally {
      if (!this.abort.signal.aborted) {
        this.sending = false;
        this.cdr.markForCheck();
      }
    }
  }
}
