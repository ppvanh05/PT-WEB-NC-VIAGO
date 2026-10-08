import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivityLog } from './activity-log';
import { ActivityLogService } from '../../../../core/services/activity-log.service';
import { StaffAccountManagement } from '../../staff/staff-account-management/staff-account-management';
import { adminAudit } from '../../../../core/services/audit-event';
import { AuthService } from '../../../../core/services/auth.service';

describe('Activity log', () => {
  let fixture: ComponentFixture<ActivityLog>; let page: ActivityLog; let service: ActivityLogService;
  const keys = ['viago_admin_staff_accounts_v1', 'viago_admin_customer_accounts_v1', 'viago_activity_log', 'viago_users', 'viago_current_user'];
  beforeEach(async () => {
    keys.forEach(key => localStorage.removeItem(key));
    localStorage.setItem(keys[0], '[]');
    await TestBed.configureTestingModule({ imports: [ActivityLog, StaffAccountManagement] }).compileComponents();
    service = TestBed.inject(ActivityLogService); fixture = TestBed.createComponent(ActivityLog); page = fixture.componentInstance; fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); keys.forEach(key => localStorage.removeItem(key)); vi.restoreAllMocks(); vi.useRealTimers(); Reflect.deleteProperty(window, 'showSaveFilePicker'); });
  function registration(): void {
    localStorage.setItem('viago_activity_log', JSON.stringify([{ id: 'REGISTER-1', action: 'REGISTER', timestamp: new Date().toISOString(), phoneNumber: '0901111222', details: 'Đăng ký tài khoản khách hàng thành công', actor: { code: 'KH001', name: 'Khách hàng mới', username: '0901111222', phone: '0901111222', role: 'Khách hàng' } }]));
  }
  it('filters logs from a single character during typing and resets pagination', () => {
    registration(); page.refresh();
    const original = page.logs[0];
    page.logs = [{ ...original, id: 'X1', details: 'Alpha', actor: { ...original.actor, name: 'One', username: '', code: '' } }, { ...original, id: 'X2', details: 'Beta', actor: { ...original.actor, name: 'Two', username: '', code: '' } }];
    page.applyFilters(); page.currentPage = 3; fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input#log-search') as HTMLInputElement;
    input.value = 'P'; input.dispatchEvent(new Event('input', { bubbles: true })); fixture.detectChanges();
    expect(page.filteredLogs.map(log => log.id)).toEqual(['X1']); expect(page.currentPage).toBe(1);
    input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); fixture.detectChanges();
    expect(page.filteredLogs).toHaveLength(2);
  });
  it('includes real customer registrations with the customer as actor', () => {
    registration(); const logs = service.load(); expect(logs.length).toBe(1); expect(logs[0].action).toBe('Đăng ký tài khoản khách hàng'); expect(logs[0].actor.name).toBe('Khách hàng mới'); expect(logs[0].actor.role).toBe('Khách hàng');
  });
  it('captures the registering customer identity in the authentication logger', () => {
    const user = { id: 'KH_NEW', name: 'Nguyễn An', phoneNumber: '0901111222', role: 'customer', passwordHash: 'private-secret' };
    const auth = { isBrowser: () => true, getActivityLogs: () => [], getUsers: () => [user], activityLogs: { set: vi.fn() } };
    AuthService.prototype.logActivity.call(auth as unknown as AuthService, user.phoneNumber, 'REGISTER', 'Đăng ký tài khoản thành công');
    const [log] = service.load(); expect(log.actor.name).toBe('Nguyễn An'); expect(log.target.code).toBe('KH_NEW'); expect(log.actor.role).toBe('Khách hàng'); expect(localStorage.getItem('viago_activity_log')).not.toContain('private-secret');
  });
  it('records staff creation by the admin, with the new staff account as target', () => {
    localStorage.setItem('viago_current_user', JSON.stringify({ id: 'QTV001', name: 'Quản trị hệ thống', role: 'admin', phoneNumber: '0909999999' }));
    const staffFixture = TestBed.createComponent(StaffAccountManagement); const staff = staffFixture.componentInstance;
    staff.ngOnInit(); staff.open(); Object.assign(staff.draft!, { username: 'new_staff', lastName: 'Nguyễn Văn', firstName: 'An', name: 'Nguyễn Văn An', phone: '0901234567', email: 'staff@example.com', birthDate: '1995-02-28', startDate: '2026-09-01' }); staff.password = 'Secure@123'; staff.save();
    const logs = service.load(); expect(logs.length).toBe(1); expect(logs[0].action).toBe('Tạo tài khoản nhân viên'); expect(logs[0].actor.code).toBe('QTV001'); expect(logs[0].target.name).toBe('Nguyễn Văn An'); expect(logs[0].actor.name).not.toBe(logs[0].target.name); expect(logs[0].details).not.toContain('Secure@123'); staffFixture.destroy();
  });
  it('never uses a customer session to attribute an admin action', () => {
    localStorage.setItem('viago_current_user', JSON.stringify({ role: 'customer', name: 'Khách đang đăng nhập' }));
    expect(adminAudit('CREATE_STAFF', { code: 'NV1', name: 'Nhân viên', type: 'Nhân viên' }).actor.role).toBe('Quản trị viên');
  });
  it('does not record a staff create event when persistence fails', () => {
    const f = TestBed.createComponent(StaffAccountManagement), c = f.componentInstance; c.ngOnInit(); c.open();
    Object.assign(c.draft!, { username: 'failed_staff', lastName: 'Nguyễn', firstName: 'An', name: 'Nguyễn An', phone: '0901234567', email: 'new@example.com', birthDate: '1995-01-01' }); c.password = 'Secure@123';
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error(); }); c.save(); spy.mockRestore();
    expect(service.load()).toEqual([]); f.destroy();
  });
  it('reads admin-created customer accounts without attributing creation to the customer', () => {
    localStorage.setItem('viago_admin_customer_accounts_v1', JSON.stringify([{ code: 'KH002', name: 'Khách mới', logs: [{ code: 'CREATE-KH', type: 'create', title: 'Tạo mới', time: '2026-10-06 10:10:00', desc: 'Tạo mới tài khoản khách hàng' }] }]));
    const [log] = service.load(); expect(log.actor.role).toBe('Quản trị viên'); expect(log.actor.name).not.toBe('Khách mới'); expect(log.target.code).toBe('KH002');
  });
  it('preserves before/after values for locking and unlocking', () => {
    const f = TestBed.createComponent(StaffAccountManagement), c = f.componentInstance; c.open(c.employees[0]); c.commitStatus(true);
    let logs = service.load(); const lock = logs.find(l => l.action === 'Khóa tài khoản nhân viên')!; expect(lock.changes[0]).toEqual({ field: 'Trạng thái', before: 'Đang hoạt động', after: 'Đã khóa' });
    c.commitStatus(false); logs = service.load(); expect(logs.find(l => l.action === 'Mở khóa tài khoản nhân viên')?.changes[0].after).toBe('Đang hoạt động'); f.destroy();
  });
  it('does not fabricate logs or statistics for an empty dataset', () => {
    page.refresh(); expect(page.logs).toEqual([]); expect(page.stats.every(s => s.count === 0)).toBe(true);
  });
  it('filters registration events and searches for the affected account', () => {
    registration(); page.refresh(); page.selectedAction = 'Đăng ký tài khoản khách hàng'; page.applyFilters(); expect(page.filteredLogs.length).toBe(1);
    page.searchQuery = 'KH001'; page.applyFilters(); expect(page.filteredLogs.length).toBe(1);
    page.selectedRole = 'Quản trị viên'; page.applyFilters(); expect(page.filteredLogs).toEqual([]); page.reset(); expect(page.filteredLogs.length).toBe(1);
  });
  it('validates date range and includes the full end date', () => {
    registration(); page.refresh(); page.startDate = '2099-12-31'; page.endDate = '2000-01-01'; page.applyFilters(); expect(page.dateError).toBeTruthy();
    const today = new Date().toLocaleDateString('sv-SE'); page.startDate = today; page.endDate = today; page.applyFilters(); expect(page.dateError).toBe(''); expect(page.filteredLogs.length).toBe(1);
  });
  it('parses old Vietnamese timestamps and sorts newest first without assigning unknown actors', () => {
    expect(service.parseTime('10:15:30 6/10/2026')).toBe(new Date(2026, 9, 6, 10, 15, 30).toISOString());
    expect(service.parseTime('6/10/2026, 10:15:30')).toBe(new Date(2026, 9, 6, 10, 15, 30).toISOString()); expect(service.parseTime('31/02/2026')).toBe('');
    localStorage.setItem(keys[0], JSON.stringify([{ code: 'NV1', name: 'Nhân viên', logs: [{ code: 'OLD', title: 'Đăng nhập', time: '2026-01-01 10:00:00' }, { code: 'NEW', type: 'create', title: 'Đăng nhập lần đầu', time: '2026-01-02 10:00:00' }] }]));
    const logs = service.load(); expect(logs[0].id).toBe('NEW'); expect(logs[0].action).toBe('Đăng nhập lần đầu'); expect(logs[0].actor.name).toBe('Chưa xác định');
  });
  it('reads valid sources even when another source is corrupt', () => {
    registration(); localStorage.setItem(keys[0], '{bad json'); expect(service.load().length).toBe(1); expect(service.readError).toBeTruthy();
  });
  it('exports only filtered rows, with Vietnamese encoding and escaped cells', () => {
    registration(); page.refresh(); page.logs[0].details = '=HYPERLINK("test")'; page.applyFilters(); const csv = page.csvContent(); expect(csv.startsWith('\uFEFF')).toBe(true); expect(csv).toContain("'=HYPERLINK"); expect(csv).toContain('""test""');
    page.searchQuery = 'no match'; page.applyFilters(); expect(page.csvContent()).not.toContain('REGISTER-1');
  });
  it('shows a floating notice only after the file stream finishes saving, then dismisses it', async () => {
    registration(); page.refresh(); vi.useFakeTimers();
    let finish!: () => void;
    const close = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: vi.fn().mockResolvedValue({ createWritable: async () => ({ write, close, abort: vi.fn() }) }) });
    const pending = page.exportCsv();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(page.notice).toBe(''); expect(page.exporting).toBe(true); expect(write).toHaveBeenCalledOnce();
    finish(); await pending; fixture.detectChanges();
    expect(page.notice).toContain('thành công'); expect(fixture.nativeElement.querySelector('.notice-popup app-toast')).not.toBeNull();
    vi.advanceTimersByTime(4000); expect(page.noticeLeaving).toBe(true); vi.advanceTimersByTime(220); expect(page.notice).toBe('');
  });
  it('does not report success when the Save dialog is cancelled', async () => {
    registration(); page.refresh(); Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')) });
    await page.exportCsv(); expect(page.notice).toBe(''); expect(page.exporting).toBe(false);
  });
  it('reports a save error without a success notification', async () => {
    registration(); page.refresh(); const abort = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: vi.fn().mockResolvedValue({ createWritable: async () => ({ write: vi.fn().mockRejectedValue(new Error('disk full')), close: vi.fn(), abort }) }) });
    await page.exportCsv(); expect(page.noticeKind).toBe('error'); expect(page.notice).not.toContain('thành công'); expect(abort).toHaveBeenCalledOnce();
  });
  it('does not claim success for a browser download without a completion signal', async () => {
    registration(); page.refresh(); vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test'); const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {}); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await page.exportCsv(); expect(page.notice).toBe(''); vi.advanceTimersByTime(1000); expect(revoke).toHaveBeenCalledWith('blob:test');
  });
  it('opens the shared detail modal with actor and target as separate sections', () => {
    registration(); page.refresh(); fixture.detectChanges();
    const view = fixture.nativeElement.querySelector('tbody button') as HTMLButtonElement; view.click(); fixture.detectChanges();
    const detail = fixture.nativeElement.querySelector('.modal-panel')?.textContent; expect(detail).toContain('Người thực hiện'); expect(detail).toContain('Tài khoản được tác động'); expect(detail).toContain('Khách hàng mới');
  });
});
