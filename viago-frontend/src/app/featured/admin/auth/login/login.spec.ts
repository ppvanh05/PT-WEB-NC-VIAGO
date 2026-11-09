import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AdminSessionService } from '../../../../core/services/admin-session.service';
import { Login } from './login';

describe('Admin login feedback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Login);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    fixture.componentInstance.form.setValue({
      email: 'staff@example.com',
      password: 'test-password',
    });
    const element = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      element,
      button: () => element.querySelector('button[type="submit"]')! as HTMLButtonElement,
    };
  }

  it('stops the spinner and renders the server error without another user interaction', async () => {
    let respond!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            respond = resolve;
          }),
      ),
    );
    const { fixture, element, button } = await setup();
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(button().disabled).toBe(true);
    respond(
      new Response(JSON.stringify({ message: 'Thông tin đăng nhập không đúng.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Thông tin đăng nhập không đúng.',
    );
    expect(button().disabled).toBe(false);
    expect(button().querySelector('.viago-button__spinner')).toBeNull();
    expect(fixture.componentInstance.form.controls.password.value).toBe('test-password');
  });

  it.each([
    [new DOMException('request timed out', 'TimeoutError'), 'hết thời gian'],
    [new TypeError('Failed to fetch'), 'kết nối'],
  ])('shows an actionable request failure and allows retry', async (error, message) => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    const { fixture, element, button } = await setup();
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(button().disabled).toBe(false);
  });

  it('stores the successful session and navigates to admin home', async () => {
    const account = {
      id: 'TK_TEST',
      staffId: 'NV_TEST',
      name: 'Staff',
      phoneNumber: '',
      email: 'staff@example.com',
      avatar: '',
      role: 'admin',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ token: 'test-session-token', account }), {
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const { fixture, element, button } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/admin/home');
    expect(TestBed.inject(AdminSessionService).account()?.id).toBe('TK_TEST');
    expect(sessionStorage.getItem('viago_admin_access_token')).toBe('test-session-token');
    expect(fixture.componentInstance.form.controls.password.value).toBe('');
    expect(button().disabled).toBe(false);
  });
});
