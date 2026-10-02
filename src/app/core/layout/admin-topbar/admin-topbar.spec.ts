import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminTopbar } from './admin-topbar';

describe('AdminTopbar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTopbar],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders user information without page context', () => {
    const fixture = TestBed.createComponent(AdminTopbar);
    fixture.componentRef.setInput('user', {
      name: 'Nguyễn Văn An',
      role: 'Quản trị viên',
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('.breadcrumbs')).toBeNull();
    expect(element.querySelector('.user-menu__identity')?.textContent).toContain('Nguyễn Văn An');
  });

  it('emits the sidebar toggle event', () => {
    const fixture = TestBed.createComponent(AdminTopbar);
    const component = fixture.componentInstance;
    const emitSpy = vi.spyOn(component.toggleSidebar, 'emit');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.admin-topbar__menu-button')
      ?.click();

    expect(emitSpy).toHaveBeenCalledOnce();
  });

  it('opens notifications and emits mark-all-read', () => {
    const fixture = TestBed.createComponent(AdminTopbar);
    const component = fixture.componentInstance;
    const markAllSpy = vi.spyOn(component.markAllNotificationsRead, 'emit');
    const readChangeSpy = vi.spyOn(component.notificationReadChange, 'emit');
    const viewAllSpy = vi.spyOn(component.viewAllNotifications, 'emit');
    fixture.componentRef.setInput('notificationCount', 1);
    fixture.componentRef.setInput('notifications', [
      {
        id: 'notification-1',
        title: 'Thông báo mới',
        message: 'Nội dung thông báo',
        time: 'Vừa xong',
        read: false,
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.notification-button')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.notification-menu__dropdown')).toBeTruthy();

    element.querySelector<HTMLButtonElement>('.notification-item__read-toggle')?.click();
    expect(readChangeSpy).toHaveBeenCalledWith({
      notification: expect.objectContaining({ id: 'notification-1' }),
      read: true,
    });

    element.querySelector<HTMLButtonElement>('.notification-menu__header button')?.click();
    expect(markAllSpy).toHaveBeenCalledOnce();

    element.querySelector<HTMLButtonElement>('.notification-menu__footer button')?.click();
    expect(viewAllSpy).toHaveBeenCalledOnce();
  });

  it('shows the empty state when every notification is read', () => {
    const fixture = TestBed.createComponent(AdminTopbar);
    fixture.componentRef.setInput('notificationCount', 0);
    fixture.componentRef.setInput('notifications', [
      {
        id: 'notification-read',
        title: 'Thông báo đã đọc',
        message: 'Nội dung thông báo',
        time: 'Hôm qua',
        read: true,
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.notification-button')?.click();
    fixture.detectChanges();

    expect(element.querySelector('.notification-menu__empty')?.textContent).toContain(
      'Chưa có thông báo mới nhất',
    );
    expect(element.querySelector('.notification-item')).toBeNull();
    expect(element.querySelector('.notification-menu__footer')).toBeTruthy();
  });
});
