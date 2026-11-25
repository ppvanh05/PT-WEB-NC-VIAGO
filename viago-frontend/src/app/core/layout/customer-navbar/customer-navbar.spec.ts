import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CustomerNavigationService } from '../../services/customer-navigation.service';
import { ToastService } from '../../services/toast.service';
import { CustomerNavbar } from './customer-navbar';

/** Dựng thanh điều hướng khách hàng; `url` là địa chỉ đang mở. */
function build(url = '/customer', logout: () => Promise<void> = async () => {}) {
  const navigations: unknown[][] = [];
  const errors: string[] = [];
  let homeShown = 0;
  let loggedOut = 0;
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CustomerNavbar],
    providers: [
      {
        provide: AuthService,
        useValue: {
          isLoggedIn: () => true,
          currentUser: () => ({ name: 'Nguyễn Văn An', phoneNumber: '0912345678' }),
          logout: async () => { loggedOut++; await logout(); },
        },
      },
      {
        provide: Router,
        // RouterLink/RouterLinkActive trong khuôn mẫu cần thêm mấy hàm này mới dựng được.
        useValue: {
          url,
          events: EMPTY,
          navigate: (commands: unknown[]) => { navigations.push(commands); return Promise.resolve(true); },
          createUrlTree: () => ({}),
          serializeUrl: () => url,
          isActive: () => false,
        },
      },
      // RouterLink trong thanh điều hướng cần ActivatedRoute mới dựng được.
      { provide: ActivatedRoute, useValue: { snapshot: { url: [], queryParams: {} } } },
      { provide: CustomerNavigationService, useValue: { showHome: () => { homeShown++; } } },
      { provide: ToastService, useValue: { showError: (message: string) => errors.push(message), showSuccess: () => {} } },
    ],
  });
  const fixture = TestBed.createComponent(CustomerNavbar);
  return { bar: fixture.componentInstance, navigations, errors, homeShown: () => homeShown, loggedOut: () => loggedOut };
}

const click = () => {
  let stopped = false;
  return { event: { stopPropagation: () => { stopped = true; } } as unknown as Event, wasStopped: () => stopped };
};

describe('Customer navigation bar', () => {
  it('marks the home link only on the home page itself', () => {
    expect(build('/customer').bar.isHomeRouteActive()).toBe(true);
    expect(build('/customer/').bar.isHomeRouteActive()).toBe(true);
    expect(build('/').bar.isHomeRouteActive()).toBe(true);
    expect(build('/customer?from=TP.HCM').bar.isHomeRouteActive()).toBe(true);
    expect(build('/customer/tin-tuc').bar.isHomeRouteActive()).toBe(false);
  });

  it('marks the about menu on each page that belongs to it', () => {
    for (const url of ['/customer/ve-chung-toi', '/customer/chinh-sach', '/customer/faq', '/customer/tuyen-dung', '/customer/lien-he']) {
      expect(build(url).bar.isAboutRouteActive(), url).toBe(true);
    }
    expect(build('/customer/tin-tuc').bar.isAboutRouteActive()).toBe(false);
  });

  it('marks the services menu on the rental and lost-property pages', () => {
    expect(build('/customer/dich-vu').bar.isServicesRouteActive()).toBe(true);
    expect(build('/customer/do-that-lac').bar.isServicesRouteActive()).toBe(true);
    expect(build('/customer/tin-tuc').bar.isServicesRouteActive()).toBe(false);
  });

  it('keeps only one menu open at a time', () => {
    const { bar } = build();
    bar.toggleServices(click().event);
    expect([bar.isServicesOpen, bar.isAboutOpen, bar.isDropdownOpen]).toEqual([true, false, false]);
    bar.toggleAbout(click().event);
    expect([bar.isServicesOpen, bar.isAboutOpen, bar.isDropdownOpen]).toEqual([false, true, false]);
    bar.toggleDropdown(click().event);
    expect([bar.isServicesOpen, bar.isAboutOpen, bar.isDropdownOpen]).toEqual([false, false, true]);
    // Bấm lại chính mục đang mở thì đóng nó.
    bar.toggleDropdown(click().event);
    expect(bar.isDropdownOpen).toBe(false);
  });

  it('does not let the click on a menu close that same menu again', () => {
    const { bar } = build();
    const tap = click();
    bar.toggleServices(tap.event);
    expect(tap.wasStopped()).toBe(true);
  });

  it('closes every menu when the customer clicks elsewhere on the page', () => {
    const { bar } = build();
    Object.assign(bar, { isServicesOpen: true, isAboutOpen: true, isDropdownOpen: true });
    bar.onDocumentClick({} as MouseEvent);
    expect([bar.isServicesOpen, bar.isAboutOpen, bar.isDropdownOpen]).toEqual([false, false, false]);
  });

  it('opens and closes the menu on a phone', () => {
    const { bar } = build();
    bar.toggleMobileMenu();
    expect(bar.isMobileMenuOpen).toBe(true);
    const tap = click();
    bar.toggleMobileMenu(tap.event);
    expect(bar.isMobileMenuOpen).toBe(false);
    expect(tap.wasStopped()).toBe(true);
    bar.isMobileMenuOpen = true;
    bar.closeMobileMenu();
    expect(bar.isMobileMenuOpen).toBe(false);
  });

  it('asks the page to open the sign-in box and puts the phone menu away', () => {
    const { bar } = build();
    let asked = 0;
    bar.openAuthModal.subscribe(() => asked++);
    bar.isMobileMenuOpen = true;
    bar.onAuthClick();
    expect(asked).toBe(1);
    expect(bar.isMobileMenuOpen).toBe(false);
  });

  it('asks the page to open the password box and closes the account menu', () => {
    const { bar } = build();
    let asked = 0;
    bar.openSecurityModal.subscribe(() => asked++);
    Object.assign(bar, { isDropdownOpen: true, isMobileMenuOpen: true });
    bar.onSecurityClick();
    expect(asked).toBe(1);
    expect(bar.isDropdownOpen).toBe(false);
    expect(bar.isMobileMenuOpen).toBe(false);
  });

  it('signs the customer out and sends them to the home page', async () => {
    const { bar, navigations, loggedOut } = build();
    Object.assign(bar, { isDropdownOpen: true, isMobileMenuOpen: true });
    await bar.logout();
    expect(loggedOut()).toBe(1);
    expect(navigations).toEqual([['/customer']]);
    expect(bar.isDropdownOpen).toBe(false);
    expect(bar.isMobileMenuOpen).toBe(false);
  });

  it('still clears the session on this device when the server refuses', async () => {
    const { bar, navigations, errors } = build('/customer', async () => {
      throw new Error('Phiên đã hết hạn trên server.');
    });
    await bar.logout();
    expect(errors).toEqual(['Phiên đã hết hạn trên server.']);
    expect(navigations).toEqual([['/customer']]);
  });

  it('scrolls back to the top instead of reloading when already at home', () => {
    const { bar, homeShown } = build('/customer');
    let scrolled = 0;
    let prevented = 0;
    window.scrollTo = () => { scrolled++; };
    bar.onHomeClick({ ...new MouseEvent('click'), preventDefault: () => { prevented++; } } as unknown as Event);
    expect(homeShown()).toBe(1);
    expect(scrolled).toBe(1);
    expect(prevented).toBe(1);
  });

  it('follows the link normally from any other page', () => {
    const { bar, homeShown } = build('/customer/tin-tuc');
    let scrolled = 0;
    window.scrollTo = () => { scrolled++; };
    bar.onHomeClick(new MouseEvent('click'));
    expect(homeShown()).toBe(0);
    expect(scrolled).toBe(0);
  });

  it('lets a middle click or a ctrl-click open the home page in a new tab', () => {
    const { bar, homeShown } = build('/customer');
    let scrolled = 0;
    window.scrollTo = () => { scrolled++; };
    bar.onHomeClick(new MouseEvent('click', { ctrlKey: true }));
    bar.onHomeClick(new MouseEvent('click', { metaKey: true }));
    bar.onHomeClick(new MouseEvent('click', { shiftKey: true }));
    bar.onHomeClick(new MouseEvent('click', { button: 1 }));
    expect(homeShown()).toBe(0);
    expect(scrolled).toBe(0);
    // Mở menu trên điện thoại vẫn được đóng lại trong mọi trường hợp.
    expect(bar.isMobileMenuOpen).toBe(false);
  });
});
