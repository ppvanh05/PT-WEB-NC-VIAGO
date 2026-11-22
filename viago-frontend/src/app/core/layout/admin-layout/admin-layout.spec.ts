import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLayout, StaffProfile } from './admin-layout';
import { AccountsApiService, AccountApiError } from '../../services/accounts-api.service';
import { AdminSessionService } from '../../services/admin-session.service';

describe('Admin layout profile dialog', () => {
  let fixture: ComponentFixture<AdminLayout>, layout: AdminLayout;
  const stored: StaffProfile = {
    staffId: 'NVQT100001',
    lastName: 'Nguyễn An',
    firstName: 'Ninh',
    displayName: 'Nguyễn An Ninh',
    phoneNumber: '0901234567',
    email: 'ninh.na@viago.vn',
    gender: 'Nu',
    birthday: '1985-03-15',
    address: '123 Nguyễn Huệ, Quận 1',
    notes: 'Ghi chú',
    avatar: '',
    roleName: 'QuanTriVien',
    status: 'HoatDong',
  };
  const api = { request: vi.fn(), invalidateAdminReads: vi.fn() };
  const session = {
    account: signal({
      id: 'TK001', staffId: 'NVQT100001', name: 'Nguyễn An Ninh',
      phoneNumber: '0901234567', email: 'ninh.na@viago.vn', avatar: '',
      role: 'admin' as const, roleName: 'QuanTriVien', permissions: [] as string[],
    }),
    patchAccount: vi.fn(),
    logout: vi.fn(),
  };
  beforeEach(async () => {
    api.request.mockReset();
    session.patchAccount.mockReset();
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([]),
        { provide: AccountsApiService, useValue: api },
        { provide: AdminSessionService, useValue: session },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminLayout);
    layout = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('fills the dialog from the staff record instead of in-memory defaults', async () => {
    api.request.mockResolvedValueOnce(stored);
    await layout.openProfile();
    fixture.detectChanges();
    expect(api.request).toHaveBeenCalledWith('admin/auth/profile', 'GET', undefined, 'admin');
    const dialog = layout.profileDialog;
    expect(dialog.profileOpen).toBe(true);
    expect(dialog.loading).toBe(false);
    expect(dialog.draft.familyName).toBe('Nguyễn An');
    expect(dialog.draft.gender).toBe('Nữ');
    expect(dialog.draft.birthday).toBe('1985-03-15');
    expect(dialog.header).toEqual({
      staffId: 'NVQT100001', roleLabel: 'Quản trị viên',
      statusLabel: 'Đang hoạt động', active: true,
    });
  });

  it('shows why the dialog is empty when the record cannot be read', async () => {
    api.request.mockRejectedValueOnce(new AccountApiError(503, 'Dịch vụ dữ liệu tạm thời không sẵn sàng.'));
    await layout.openProfile();
    fixture.detectChanges();
    expect(layout.profileDialog.profileOpen).toBe(true);
    expect(layout.profileDialog.loadError).toContain('tạm thời không sẵn sàng');
    expect(fixture.nativeElement.querySelector('.profile-error').textContent).toContain('tạm thời không sẵn sàng');
  });

  it('writes the edited profile to the backend and refreshes the session header', async () => {
    api.request.mockResolvedValueOnce(stored);
    await layout.openProfile();
    fixture.detectChanges();
    const dialog = layout.profileDialog;
    dialog.draft.displayName = 'Nguyễn An Ninh (QTV)';
    dialog.draft.phone = '+84 902 000 111';
    dialog.draft.notes = '';
    api.request.mockResolvedValueOnce({
      ...stored, displayName: 'Nguyễn An Ninh (QTV)', phoneNumber: '0902000111', notes: '',
    });
    const save = vi.spyOn(layout, 'saveProfile');
    dialog.save();
    expect(dialog.saving).toBe(true);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Nguyễn An Ninh (QTV)', phone: '0902000111' }),
    );
    await save.mock.results[0].value;
    fixture.detectChanges();
    expect(api.request).toHaveBeenLastCalledWith('admin/auth/profile', 'PATCH', {
      lastName: 'Nguyễn An',
      firstName: 'Ninh',
      displayName: 'Nguyễn An Ninh (QTV)',
      phoneNumber: '0902000111',
      email: 'ninh.na@viago.vn',
      gender: 'Nu',
      birthday: '1985-03-15',
      address: '123 Nguyễn Huệ, Quận 1',
      notes: '',
      avatar: '',
    }, 'admin');
    expect(session.patchAccount).toHaveBeenCalledWith({
      name: 'Nguyễn An Ninh (QTV)', phoneNumber: '0902000111',
      email: 'ninh.na@viago.vn', avatar: '',
    });
    expect(layout.profileSaved).toBe(true);
    expect(dialog.profileOpen).toBe(false);
    expect(dialog.saving).toBe(false);
  });

  it('keeps the dialog open with the rejected reason when the phone number is taken', async () => {
    api.request.mockResolvedValueOnce(stored);
    await layout.openProfile();
    fixture.detectChanges();
    api.request.mockRejectedValueOnce(
      new AccountApiError(409, 'Số điện thoại, email hoặc tên đăng nhập đã tồn tại.'),
    );
    await layout.saveProfile({ ...layout.profile, phone: '0909999999' });
    fixture.detectChanges();
    const dialog = layout.profileDialog;
    expect(dialog.profileOpen).toBe(true);
    expect(dialog.saving).toBe(false);
    expect(dialog.saveError).toContain('đã tồn tại');
    expect(layout.profileSaved).toBe(false);
    expect(session.patchAccount).not.toHaveBeenCalled();
  });
});
