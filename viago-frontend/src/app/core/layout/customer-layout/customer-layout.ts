import { AsyncPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { AuthModal } from '../../../auth/auth-modal/auth-modal';
import { Chatbot } from '../../../featured/customer/chatbot/chatbot';
import { CustomerFooter } from '../customer-footer/customer-footer';
import { CustomerNavbar } from '../customer-navbar/customer-navbar';
import { Toast } from '../../../shared/components/toast/toast';
import { AuthModalService } from '../../services/auth-modal.service';
import { CustomerNavigationService } from '../../services/customer-navigation.service';
import { ToastService } from '../../services/toast.service';

@Component({ selector: 'app-customer-layout', standalone: true, imports: [RouterOutlet, AsyncPipe, CustomerNavbar, CustomerFooter, Chatbot, AuthModal, Toast], templateUrl: './customer-layout.html', styleUrl: './customer-layout.css' })
export class CustomerLayout implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;
  private readonly navigation = inject(CustomerNavigationService);
  protected readonly authModal = inject(AuthModalService);
  protected readonly toastService = inject(ToastService);
  private observer?: ResizeObserver;
  constructor() { this.navigation.authRequested.pipe(takeUntilDestroyed()).subscribe(mode => this.authModal.open(mode)); }
  onAuthModalOpen(): void { this.navigation.showAuth(); }
  ngAfterViewInit(): void {
    const navbar = this.host.nativeElement.querySelector<HTMLElement>('.viago-customer-navbar-wrapper');
    if (!navbar) return;
    const update = () => this.host.nativeElement.style.setProperty('--customer-navbar-height', navbar.getBoundingClientRect().height + 'px');
    update();
    if (typeof ResizeObserver !== 'undefined') { this.observer = new ResizeObserver(update); this.observer.observe(navbar); }
  }
  ngOnDestroy(): void { this.observer?.disconnect(); }
}
