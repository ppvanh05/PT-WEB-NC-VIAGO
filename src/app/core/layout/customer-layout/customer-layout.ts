import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CustomerNavbar } from '../customer-navbar/customer-navbar';
import { CustomerFooter } from '../customer-footer/customer-footer';
import { Chatbot } from '../../../featured/customer/chatbot/chatbot';
import { AuthModal } from '../../../auth/auth-modal/auth-modal';
import { SecuritySettingsModal } from '../../../auth/security-settings-modal/security-settings-modal';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [RouterOutlet, CustomerNavbar, CustomerFooter, Chatbot, AuthModal, SecuritySettingsModal],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.css',
})
export class CustomerLayout {
  onAuthModalOpen(): void {
    // Modal state is managed by the customer layout.
  }

  onSecurityModalOpen(): void {
    // Modal state is managed by the customer layout.
  }
}
