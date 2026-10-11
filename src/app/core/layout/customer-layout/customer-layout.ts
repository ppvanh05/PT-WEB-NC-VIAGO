import { AfterViewInit, Component, ElementRef, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Component, effect, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { CustomerNavbar } from '../customer-navbar/customer-navbar';
import { CustomerFooter } from '../customer-footer/customer-footer';
import { Chatbot } from '../../../featured/customer/chatbot/chatbot';
import { AuthModal } from '../../../auth/auth-modal/auth-modal';
import { CustomerNavigationService } from '../../services/customer-navigation.service';
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
export class CustomerLayout implements AfterViewInit, OnDestroy {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private navbarObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    const navbar = this.host.nativeElement.querySelector<HTMLElement>('.viago-customer-navbar-wrapper');
    if (!navbar) return;
    const updateHeight = () => this.host.nativeElement.style.setProperty('--customer-navbar-height', `${navbar.getBoundingClientRect().height}px`);
    updateHeight();
    if (typeof ResizeObserver !== 'undefined') {
      this.navbarObserver = new ResizeObserver(updateHeight);
      this.navbarObserver.observe(navbar);
    }
  }

  ngOnDestroy(): void { this.navbarObserver?.disconnect(); }
  onAuthModalOpen(): void {
    this.navigation.showAuth();
  }
  private readonly navigation = inject(CustomerNavigationService);

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
