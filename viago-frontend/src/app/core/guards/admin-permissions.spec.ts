import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { canAccessAdminRoute } from './admin-permissions';
import { adminSessionGuard } from './admin-session.guard';
import { AdminSessionService } from '../services/admin-session.service';
import { AdminSidebar } from '../layout/admin-sidebar/admin-sidebar';
import { routes } from '../../app.routes';

describe('Admin screen permissions', () => {
  const seller = { roleName: 'NhanVienBanVe', permissions: ['DatVeVaThanhToan'] };
  it('covers every registered admin screen and alias', () => {
    const admin = routes.find(route => route.path === 'admin');
    for (const route of admin?.children || []) {
      if (!route.path || route.path === '**' || route.redirectTo) continue;
      expect(canAccessAdminRoute({ roleName: 'QuanTriVien', supportChat: true }, '/admin/' + route.path), route.path).toBe(true);
    }
  });
  it('uses assigned permissions, covers aliases and denies unknown screens', () => {
    expect(canAccessAdminRoute(seller, '/admin/tickets/new')).toBe(true);
    expect(canAccessAdminRoute(seller, '/admin/booking/new?test=1')).toBe(true);
    expect(canAccessAdminRoute(seller, '/admin/staff/accounts')).toBe(false);
    expect(canAccessAdminRoute(seller, '/admin/logs')).toBe(false);
    expect(canAccessAdminRoute({ roleName: 'QuanTriVien' }, '/admin/logs')).toBe(true);
    expect(canAccessAdminRoute({ roleName: 'QuanTriVien' }, '/admin/unknown')).toBe(false);
    expect(canAccessAdminRoute(null, '/admin/home')).toBe(false);
  });
  it('does not infer dispatch rights from a role label', () => {
    expect(canAccessAdminRoute({ roleName: 'NhanVienDieuPhoi', permissions: [] }, '/admin/dispatch/routes')).toBe(false);
    expect(canAccessAdminRoute({ permissions: ['QuanLyTuyenXe'] }, '/admin/dispatch/routes')).toBe(true);
    expect(canAccessAdminRoute({ permissions: ['BaoCaoKhachHang'] }, '/admin/reports/customers')).toBe(true);
    expect(canAccessAdminRoute({ roleName: 'QuanTriVien' }, '/admin/customers/support')).toBe(false);
    expect(canAccessAdminRoute({ supportChat: true }, '/admin/customers/support')).toBe(true);
  });
  it('filters submenus and hides empty groups when switching accounts', () => {
    const account = signal<any>(seller);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AdminSessionService, useValue: { account } }] });
    const fixture = TestBed.createComponent(AdminSidebar);
    fixture.detectChanges();
    const paths = () => fixture.componentInstance.visibleMenuItems().flatMap(item => item.children?.map(child => child.route) || [item.route]);
    expect(paths()).toEqual(['/admin/home', '/admin/tickets/new']);
    account.set({ roleName: 'QuanTriVien', permissions: [] });
    expect(paths()).toContain('/admin/staff/accounts');
    expect(paths()).toContain('/admin/logs');
    account.set({ roleName: 'NhanVienBanVe', permissions: ['QuanLyTaiKhoanKhachHang'] });
    expect(paths()).toContain('/admin/customers/accounts');
    expect(paths()).not.toContain('/admin/staff/accounts');
    fixture.destroy();
  });
  it('blocks direct URLs without signing out and preserves login redirects for guests', async () => {
    const account = signal<any>(seller);
    const restore = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AdminSessionService, useValue: { account, restore } }] });
    const router = TestBed.inject(Router);
    const check = (url: string) => TestBed.runInInjectionContext(() => adminSessionGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));
    const denied = await check('/admin/logs');
    expect(router.serializeUrl(denied as UrlTree)).toBe('/admin/home?access=denied');
    expect(await check('/admin/tickets/new')).toBe(true);
    restore.mockResolvedValue(false);
    expect(router.serializeUrl(await check('/admin/logs') as UrlTree)).toContain('/admin/login?returnUrl=');
  });
});
