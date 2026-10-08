import { TestBed, ComponentFixture } from '@angular/core/testing';
import { StaffAccountManagement } from './staff-account-management';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker';
import { ModalComponent } from '../../../../shared/components/modal/modal';

describe('Staff account management', () => {
  let fixture: ComponentFixture<StaffAccountManagement>;
  let c: StaffAccountManagement;
  beforeEach(async () => {
    localStorage.removeItem('viago_admin_staff_accounts_v1');
    await TestBed.configureTestingModule({ imports: [StaffAccountManagement] }).compileComponents();
    fixture = TestBed.createComponent(StaffAccountManagement); c = fixture.componentInstance; fixture.detectChanges();
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.removeItem(c.storageKey); fixture.destroy(); });
  function createDraft(): void {
    c.open(); Object.assign(c.draft!, { username: 'new_staff', lastName: 'Nguyễn Văn', firstName: 'An', name: 'Nguyễn Văn An', phone: '0901234567', email: 'new.staff@example.com', birthDate: '1995-02-28', startDate: '2026-09-14' }); c.password = 'Secure@123';
  }
  it('filters immediately from a single character and restores the list when cleared', () => {
    const original = c.employees[0];
    c.employees = [{ ...original, code: 'X1', name: 'Alpha', username: 'omega', email: 'a@xx.vn' }, { ...original, code: 'X2', name: 'Beta', username: 'beta', email: 'b@xx.vn' }];
    c.currentPage = 3; fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input#staff-search') as HTMLInputElement;
    input.value = 'P'; input.dispatchEvent(new Event('input', { bubbles: true })); fixture.detectChanges();
    expect(c.filteredEmployees.map(employee => employee.code)).toEqual(['X1']);
    expect(c.currentPage).toBe(1);
    input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); fixture.detectChanges();
    expect(c.filteredEmployees).toHaveLength(2);
  });
  it('pages employee logs through shared pagination and resets for another profile', () => {
    c.open(c.employees[0]); c.tab = 'logs';
    c.draft!.logs = Array.from({ length: 12 }, (_, i) => ({ time: '2026-10-06', title: 'Update ' + i, desc: 'Details', code: 'LOG_' + i, ip: '' }));
    fixture.detectChanges();
    expect(c.paginatedEmployeeLogs).toHaveLength(10);
    const pager = fixture.nativeElement.querySelector('.edit-content app-pagination');
    const pageTwo = Array.from(pager.querySelectorAll('button')).find((button: any) => button.textContent.trim() === '2') as HTMLButtonElement;
    pageTwo.click(); fixture.detectChanges();
    expect(c.paginatedEmployeeLogs.map(log => log.code)).toEqual(['LOG_10', 'LOG_11']);
    c.open(c.employees[1]); expect(c.logPage).toBe(1);
  });
  it('toggles password visibility with the eye icon and preserves the entered password', () => {
    createDraft(); fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input#staff-password') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-toggle button') as HTMLButtonElement;
    expect(input.type).toBe('password');
    expect(fixture.nativeElement.querySelector('input[name="showPassword"]')).toBeNull();
    toggle.click(); fixture.detectChanges();
    expect(input.type).toBe('text'); expect(input.value).toBe('Secure@123');
    expect(toggle.getAttribute('aria-label')).toBe('Ẩn mật khẩu');
    toggle.click(); fixture.detectChanges();
    expect(input.type).toBe('password'); expect(input.value).toBe('Secure@123');
    expect(toggle.getAttribute('aria-label')).toBe('Hiện mật khẩu');
  });
  it('rejects malformed email during create and edit and accepts a valid email', () => {
    createDraft();
    for (const value of ['invalid@', 'a..b@example.com', '.a@example.com', 'a@-example.com', 'a@example', 'a b@example.com', 'a@exam_ple.com']) { c.draft!.email = value; expect(c.error('email')).toBeTruthy(); }
    c.draft!.email = 'valid+staff@example.com'; expect(c.error('email')).toBe('');
    c.open(c.employees[0]); c.update('email', 'invalid@'); expect(c.visibleError('email')).toBeTruthy(); c.save(); expect(c.draft).not.toBeNull(); expect(c.tab).toBe('contact');
  });
  it('renders email warnings immediately under the shared input', () => {
    c.open(c.employees[0]); c.tab = 'contact'; fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input#staff-email') as HTMLInputElement;
    input.value = 'wrong@'; input.dispatchEvent(new Event('input', { bubbles: true })); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#staff-email-error')?.textContent).toContain('Email');
    input.value = 'valid.staff@example.com'; input.dispatchEvent(new Event('input', { bubbles: true })); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#staff-email-error')).toBeNull();
  });
  it('detects duplicate email and username without blocking unchanged values on edit', () => {
    c.open(c.employees[0]); expect(c.error('email')).toBe(''); expect(c.error('username')).toBe('');
    c.draft!.email = c.employees[1].email.toUpperCase(); expect(c.error('email')).toContain('đã được sử dụng');
    c.draft!.username = c.employees[1].username.toUpperCase(); expect(c.error('username')).toContain('đã tồn tại');
  });
  it('persists the selected start date on create and after reload', () => {
    createDraft(); c.save(); expect(c.draft).toBeNull(); expect(c.successOpen).toBe(true);
    expect(c.employees[0].startDate).toBe('2026-09-14'); expect(c.employees[0].date).toBe('14/09/2026');
    c.ngOnInit(); expect(c.employees[0].startDate).toBe('2026-09-14');
    expect(localStorage.getItem(c.storageKey)).not.toContain('Secure@123');
  });
  it('persists changed start date on edit and shows update success', () => {
    const code = c.employees[0].code; c.open(c.employees[0]); c.draft!.startDate = '2026-08-17'; c.save();
    expect(c.employees.find(e => e.code === code)?.date).toBe('17/08/2026'); expect(c.successMessage).toContain('Lưu thông tin');
  });
  it('rejects impossible dates, handles leap years and blocks future birth dates', () => {
    for (const date of ['2026-02-31', '2025-02-29', '2026-04-31', '2026-13-01', '31/02/2026']) expect(c.validDate(date)).toBe(false);
    expect(c.validDate('2024-02-29')).toBe(true);
    createDraft(); c.draft!.birthDate = '2026-02-31'; c.save(); expect(c.draft).not.toBeNull(); expect(c.tab).toBe('profile');
    c.draft!.birthDate = '2099-01-01'; expect(c.error('birthDate')).toBeTruthy();
    c.draft!.birthDate = '1995-02-28'; c.draft!.startDate = '1990-01-01'; expect(c.error('startDate')).toBeTruthy();
  });
  it('uses calendar controls instead of editable date inputs', () => {
    createDraft(); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('app-date-picker')).not.toBeNull(); expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeNull();
    const picker = new DatePickerComponent(); picker.writeValue('2026-02-31'); expect(picker.displayValue).toBe('');
  });
  it('shows the success popup after create', () => {
    createDraft(); c.save(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-toast-popup')?.textContent).toContain('Tạo tài khoản nhân viên thành công!');
  });
  it('submits through the actual shared create button', async () => {
    createDraft(); fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.modal-actions button[type="submit"]') as HTMLButtonElement;
    expect(button).not.toBeNull(); button.click(); await fixture.whenStable(); fixture.detectChanges();
    expect(c.successOpen).toBe(true); expect(fixture.nativeElement.querySelector('app-toast-popup')?.textContent).toContain('thành công');
  });
  it('binds a date selected in the shared calendar to the saved start date', async () => {
    createDraft(); c.tab = 'contact'; fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('app-date-picker .date-picker-input') as HTMLButtonElement;
    toggle.click(); fixture.detectChanges();
    const day = fixture.nativeElement.querySelector('[data-date-picker-day="2026-09-18"]') as HTMLButtonElement;
    expect(day).not.toBeNull(); day.click(); await fixture.whenStable(); fixture.detectChanges();
    expect(c.draft!.startDate).toBe('2026-09-18'); c.save(); expect(c.employees[0].date).toBe('18/09/2026');
  });
  it('does not save an invalid password', () => {
    createDraft(); c.password = 'Password123'; c.save(); expect(c.error('password')).toContain('ký tự đặc biệt'); expect(c.draft).not.toBeNull();
  });
  it('retains the draft and original data if storage fails', () => {
    c.open(c.employees[0]); const old = c.employees[0].startDate; c.draft!.startDate = '2026-08-10';
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); }); c.save(); spy.mockRestore();
    expect(c.employees[0].startDate).toBe(old); expect(c.modalError).toContain('Không thể lưu'); expect(c.successOpen).toBe(false); expect(c.draft).not.toBeNull();
  });
  it('keeps role templates, manual permissions and logs after save', () => {
    c.open(c.employees[0]); c.applyRole('Ban quản lý'); c.togglePermission('datve'); c.save();
    expect(c.employees[0].permissions).toEqual(['baocao', 'datve']); expect(c.employees[0].roles).toContain('2 QUYỀN'); expect(c.employees[0].logs[0].desc).toContain('Cập nhật');
  });
  it('cancelling avatar removal preserves the saved image', () => {
    c.employees[0].avatarUrl = 'data:image/png;base64,test'; c.open(c.employees[0]); c.removeAvatar(); c.close(); expect(c.employees[0].avatarUrl).toContain('test');
  });
  it('persists lock/unlock while preserving unsaved profile changes as a draft', () => {
    c.open(c.employees[0]); c.draft!.name = 'Tên chưa lưu'; c.changeStatus(); expect(c.lockOpen).toBe(true);
    c.lockReason = 'Kiểm tra tài khoản'; c.commitStatus(true);
    expect(c.employees[0].status).toBe('Đã khóa'); expect(c.employees[0].name).not.toBe('Tên chưa lưu'); expect(c.draft!.name).toBe('Tên chưa lưu');
    c.changeStatus(); expect(c.employees[0].status).toBe('Đang hoạt động'); expect(c.employees[0].lockInfo).toBeNull();
    expect(c.draft!.logs[0].desc).toContain('Mở khóa'); expect(c.feedback).toContain('thành công');
  });
  it('keeps the account active when locking fails to persist', () => {
    c.open(c.employees[0]); c.changeStatus(); const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error(); }); c.commitStatus(true); spy.mockRestore();
    expect(c.employees[0].status).toBe('Đang hoạt động'); expect(c.draft!.status).toBe('Đang hoạt động'); expect(c.lockOpen).toBe(true);
  });
  it('filters by role/status and clamps pagination after filtering', () => {
    c.currentPage = 99; expect(c.paginatedEmployees.length).toBeGreaterThan(0);
    c.searchRole = 'Nhân viên bán vé'; c.applyFilter(); expect(c.currentPage).toBe(1); expect(c.filteredEmployees.every(e => e.defaultRole === 'Nhân viên bán vé')).toBe(true);
    c.setTab('locked'); expect(c.filteredEmployees.every(e => e.status === 'Đã khóa')).toBe(true);
    c.searchQuery = 'no-such-staff'; c.applyFilter(); expect(c.paginatedEmployees).toEqual([]); expect(c.validCurrentPage).toBe(1);
  });
  it('selects only visible permissions and preserves hidden permissions', () => {
    c.open(c.employees[0]); c.draft!.permissions = ['datve']; c.permissionQuery = 'Quản lý nhân viên'; c.toggleAll(); expect(c.draft!.permissions).toContain('nhanvien');
    c.toggleAll(); expect(c.draft!.permissions).toEqual(['datve']);
  });
  it('resizes uploaded photos before persisting and allows removing them', () => {
    let read: (() => void) | undefined;
    vi.stubGlobal('FileReader', class { result = 'data:image/jpeg;base64,source'; onload?: () => void; readAsDataURL() { read = () => this.onload?.(); } });
    vi.stubGlobal('Image', class { naturalWidth = 3000; naturalHeight = 1500; onload?: () => void; set src(_value: string) { this.onload?.(); } });
    const draw = vi.fn(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: draw } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/webp;base64,small');
    c.open(c.employees[0]); c.upload({ target: { files: [new File(['photo'], 'avatar.jpg', { type: 'image/jpeg' })], value: 'avatar.jpg' } } as unknown as Event);
    expect(c.readingAvatar).toBe(true); read?.(); expect(c.readingAvatar).toBe(false); expect(draw.mock.calls[0].slice(1)).toEqual([0, 0, 512, 256]); expect(c.draft!.avatarUrl).toContain('small');
    c.removeAvatar(); c.save(); expect(c.employees[0].avatarUrl).toBe('');
  });
  it('prevents cancelled uploads from restoring a removed photo', () => {
    let read: (() => void) | undefined;
    vi.stubGlobal('FileReader', class { result = 'data:image/png;base64,source'; onload?: () => void; readAsDataURL() { read = () => this.onload?.(); } });
    vi.stubGlobal('Image', class { naturalWidth = 100; naturalHeight = 100; onload?: () => void; set src(_value: string) { this.onload?.(); } });
    c.open(c.employees[0]); c.upload({ target: { files: [new File(['photo'], 'avatar.png', { type: 'image/png' })], value: '' } } as unknown as Event); c.removeAvatar(); read?.();
    expect(c.draft!.avatarUrl).toBe(''); expect(c.readingAvatar).toBe(false);
  });
  it('focuses the open modal and restores page scrolling when closed', () => {
    document.body.style.overflow = 'auto'; c.open(c.employees[0]); fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden'); expect(fixture.nativeElement.querySelector('.modal-panel').contains(document.activeElement)).toBe(true);
    c.close(); fixture.detectChanges(); expect(document.body.style.overflow).toBe('auto'); document.body.style.overflow = '';
  });
  it('traps focus and closes only the top confirmation with Escape', () => {
    c.open(c.employees[0]); fixture.detectChanges();
    let panel = fixture.nativeElement.querySelector('.modal-panel') as HTMLElement;
    const first = panel.querySelector('button')!;
    const last = panel.querySelector('.modal-actions button[type="submit"]') as HTMLButtonElement;
    last.focus(); last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })); expect(document.activeElement).toBe(first);
    const lock = panel.querySelector('.modal-actions button.viago-button--danger') as HTMLButtonElement; lock.click(); fixture.detectChanges();
    const panels = fixture.nativeElement.querySelectorAll('.modal-panel'); expect(panels.length).toBe(2);
    panel = panels[1]; panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); fixture.detectChanges();
    expect(c.lockOpen).toBe(false); expect(c.draft).not.toBeNull(); expect(document.body.style.overflow).toBe('hidden');
    c.close(); fixture.detectChanges();
  });
  it('handles corrupted saved data without crashing the account list', () => {
    const count = c.employees.length;
    localStorage.setItem(c.storageKey, JSON.stringify([{ code: 'INVALID', name: 'Test', username: 'test', email: null }])); c.ngOnInit();
    expect(c.feedbackError).toBe(true); expect(c.filteredEmployees.length).toBe(count);
  });
  it('only closes the shared modal after a direct backdrop click, never a drag', () => {
    const m = new ModalComponent(); const closed = vi.fn(); m.closed.subscribe(closed);
    const backdrop = document.createElement('div'), panel = document.createElement('section');
    const event = (target: HTMLElement, x: number, y: number) => ({ target, currentTarget: backdrop, button: 0, clientX: x, clientY: y });
    m.onPointerDown(event(panel, 20, 20) as unknown as PointerEvent); m.onBackdropClick(event(backdrop, 40, 40) as unknown as MouseEvent); expect(closed).not.toHaveBeenCalled();
    m.onPointerDown(event(backdrop, 20, 20) as unknown as PointerEvent); m.onPointerMove(event(backdrop, 40, 40) as unknown as PointerEvent); m.onBackdropClick(event(backdrop, 20, 20) as unknown as MouseEvent); expect(closed).not.toHaveBeenCalled();
    m.onPointerDown(event(backdrop, 20, 20) as unknown as PointerEvent); m.onBackdropClick(event(backdrop, 20, 20) as unknown as MouseEvent); expect(closed).toHaveBeenCalledOnce();
  });
});
