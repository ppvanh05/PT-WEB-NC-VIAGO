import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminSessionService } from '../../../core/services/admin-session.service';
import { Home } from './home';

type Account = { roleName?: string; permissions?: string[] } | null;

function build(account: Account, queryParams: Record<string, string> = {}) {
  const navigated: string[] = [];
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [Home],
    providers: [
      { provide: AdminSessionService, useValue: { account: () => account } },
      { provide: Router, useValue: { navigateByUrl: (url: string) => { navigated.push(url); return Promise.resolve(true); } } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: { get: (key: string) => queryParams[key] ?? null } } },
      },
    ],
  });
  return { page: TestBed.createComponent(Home).componentInstance, navigated };
}

describe('Admin overview screen', () => {
  it('opens the first page the account may reach inside a group', () => {
    const { page, navigated } = build({ permissions: ['QuanLyTuyenXe'] });
    // Nhân viên chỉ có quyền tuyến xe thì thẻ điều phối phải mở đúng trang tuyến xe.
    expect(page.firstAllowed(page.dispatchRoutes)).toBe('/admin/dispatch/routes');
    page.navigate(page.dispatchRoutes);
    expect(navigated).toEqual(['/admin/dispatch/routes']);
  });

  it('hides a group entirely when the account may reach none of its pages', () => {
    const { page, navigated } = build({ permissions: [] });
    expect(page.firstAllowed(page.reportRoutes)).toBeNull();
    page.navigate(page.reportRoutes);
    // Không có quyền thì bấm thẻ cũng không điều hướng đi đâu.
    expect(navigated).toEqual([]);
  });

  it('lets an administrator reach every group', () => {
    const { page } = build({ roleName: 'QuanTriVien', permissions: [] });
    for (const group of [page.bookingRoutes, page.dispatchRoutes, page.customerRoutes, page.reportRoutes])
      expect(page.firstAllowed(group)).toBe(group[0]);
  });

  it('shows the refusal notice only when redirected with access=denied', () => {
    expect(build({ roleName: 'QuanTriVien' }, { access: 'denied' }).page.accessDenied).toBe(true);
    expect(build({ roleName: 'QuanTriVien' }).page.accessDenied).toBe(false);
    expect(build({ roleName: 'QuanTriVien' }, { access: 'granted' }).page.accessDenied).toBe(false);
  });

  it('treats a missing session as having no access at all', () => {
    const { page } = build(null);
    expect(page.firstAllowed(page.bookingRoutes)).toBeNull();
  });
});
