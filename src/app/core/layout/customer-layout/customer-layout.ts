import { AfterViewInit, Component, ElementRef, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CustomerNavbar } from '../customer-navbar/customer-navbar';
import { CustomerFooter } from '../customer-footer/customer-footer';
import { Chatbot } from '../../../featured/customer/chatbot/chatbot';
import { AuthModal } from '../../../auth/auth-modal/auth-modal';
import { CustomerNavigationService } from '../../services/customer-navigation.service';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [RouterOutlet, CustomerNavbar, CustomerFooter, Chatbot, AuthModal],
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

}
