import { Component, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-customer-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './customer-navbar.html',
  styleUrl: './customer-navbar.css'
})
export class CustomerNavbar {
  @Output() openAuthModal = new EventEmitter<void>();
  @Output() openSecurityModal = new EventEmitter<void>();

  isServicesOpen = false;
  isAboutOpen = false;
  isDropdownOpen = false;
  isMobileMenuOpen = false;
  isMobileServicesOpen = false;
  isMobileAboutOpen = false;

  constructor(
    public authService: AuthService,
    public router: Router
  ) {}

  isAboutRouteActive(): boolean {
    const activeRoutes = ['/ve-chung-toi', '/gioi-thieu', '/chinh-sach', '/dieu-khoan', '/faq', '/lien-he', '/tuyen-dung'];
    return activeRoutes.some(route => this.router.url.includes(route));
  }

  isServicesRouteActive(): boolean {
    return this.router.url.includes('/dich-vu');
  }

  toggleServices(event: Event) {
    event.stopPropagation();
    this.isServicesOpen = !this.isServicesOpen;
    this.isAboutOpen = false;
    this.isDropdownOpen = false;
  }

  toggleAbout(event: Event) {
    event.stopPropagation();
    this.isAboutOpen = !this.isAboutOpen;
    this.isServicesOpen = false;
    this.isDropdownOpen = false;
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
    this.isServicesOpen = false;
    this.isAboutOpen = false;
  }

  toggleMobileMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  onAuthClick(): void {
    this.openAuthModal.emit();
    this.closeMobileMenu();
  }

  onSecurityClick(): void {
    this.openSecurityModal.emit();
    this.isDropdownOpen = false;
    this.closeMobileMenu();
  }

  logout(): void {
    this.authService.logout();
    this.isDropdownOpen = false;
    this.closeMobileMenu();
    this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.isServicesOpen = false;
    this.isAboutOpen = false;
    this.isDropdownOpen = false;
  }

  onHomeClick(event: Event) {
    event.preventDefault();
    this.closeMobileMenu();
    this.router.navigate(['/'], { queryParams: { reset: Date.now() } });
  }
}

export { CustomerNavbar as CustomerNavbarComponent };
