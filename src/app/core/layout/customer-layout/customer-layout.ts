import { Component, effect, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { CustomerNavbar } from '../customer-navbar/customer-navbar';
import { CustomerFooter } from '../customer-footer/customer-footer';
import { Chatbot } from '../../../featured/customer/chatbot/chatbot';
import { AuthModal } from '../../../auth/auth-modal/auth-modal';
import { Toast } from '../../../shared/components/toast/toast';
import { AuthService } from '../../services/auth.service';
import { AuthModalService } from '../../services/auth-modal.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [RouterOutlet, AsyncPipe, CustomerNavbar, CustomerFooter, Chatbot, AuthModal, Toast],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.css',
})
export class CustomerLayout {
  protected readonly authModal = inject(AuthModalService);
  protected readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // Phiên hết hạn / đăng xuất ở tab khác: rời khỏi các trang yêu cầu đăng nhập.
    effect(() => {
      if (!this.authService.currentUser() && this.router.url.startsWith('/customer/profile')) {
        this.router.navigate(['/customer'], { replaceUrl: true });
      }
    });
  }

  onAuthModalOpen(): void {
    this.authModal.open();
  }
}
