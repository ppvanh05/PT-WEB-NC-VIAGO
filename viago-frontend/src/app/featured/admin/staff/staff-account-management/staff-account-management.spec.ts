import { TestBed, ComponentFixture } from '@angular/core/testing';
import { StaffAccountManagement } from './staff-account-management';
import { AdminAccountsService } from '../../../../core/services/admin-accounts.service';

describe('Staff accounts backed by API', () => {
  let fixture: ComponentFixture<StaffAccountManagement>;
  let component: StaffAccountManagement;
  const employee = () => ({
    code: 'NV_TEST',
    username: 'staff.test',
    name: 'Nguyễn Văn An',
    firstName: 'An',
    lastName: 'Nguyễn Văn',
    phone: '0901234567',
    email: 'staff@example.com',
    gender: 'Nam',
    birthDate: '1995-02-28',
    startDate: '2026-01-01',
    defaultRole: 'Nhân viên bán vé',
    status: 'Đang hoạt động',
    permissions: ['Q014'],
    contractType: 'Hợp đồng thử việc',
    logs: [],
    avatarUrl: '',
    notes: '',
    address: '',
  });
  let api: {
    options: ReturnType<typeof vi.fn>;
    employees: ReturnType<typeof vi.fn>;
    saveEmployee: ReturnType<typeof vi.fn>;
    employeeStatus: ReturnType<typeof vi.fn>;
    logs: ReturnType<typeof vi.fn>;
  };
  beforeEach(async () => {
    api = {
      options: vi
        .fn()
        .mockResolvedValue({
          roles: [{ mavaitro: 'VT002', tenvaitro: 'NhanVienBanVe' }],
          permissions: [{ maquyen: 'Q014', tenquyen: 'DangNhapNoiBo', nhomchucnang: 'TaiKhoan' }],
          roleGroups: [{ roleId: 'VT002', roleName: 'NhanVienBanVe', groupKeys: ['datve', 'baocao'], permissionIds: ['Q004', 'Q008', 'Q014', 'Q032'], permissions: [], missing: [] }],
        }),
      employees: vi.fn().mockResolvedValue([employee()]),
      saveEmployee: vi.fn(),
      employeeStatus: vi.fn(),
      logs: vi.fn().mockResolvedValue([]),
    };
    await TestBed.configureTestingModule({
      imports: [StaffAccountManagement],
      providers: [{ provide: AdminAccountsService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(StaffAccountManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });
  it('loads actual role and permission IDs from API, with no localStorage seed', () => {
    expect(component.employees).toHaveLength(1);
    expect(component.roleGroups).toHaveLength(1);
    expect(component.employees[0].permissions).toEqual(['Q014']);
    expect(component.roles).toEqual(['Nhân viên bán vé']);
  });
  it('keeps legacy rights untouched when opening the form and removes granular pickers', () => {
    component.open(component.employees[0]);
    component.tab = 'rbac';
    fixture.detectChanges();
    expect(component.legacyPermissionSet).toBe(true);
    expect(component.permissionGroupChanged).toBe(false);
    expect(component.draft!.permissions).toEqual(['Q014']);
    expect(fixture.nativeElement.querySelectorAll('.permissions input[type=checkbox]')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.permission-toolbar')).toBeNull();
    expect(component.employees[0].permissions).toEqual(['Q014']);
    expect(api.saveEmployee).not.toHaveBeenCalled();
  });
  it('selects the complete fixed role bundle only after an explicit role choice', () => {
    component.open(component.employees[0]);
    component.applyRole(component.roles[0]);
    expect(component.draft!.permissions).toEqual(['Q004', 'Q008', 'Q014', 'Q032']);
    expect(component.permissionGroupChanged).toBe(true);
    expect(component.selectedRoleModules).toHaveLength(2);
    expect(component.employees[0].permissions).toEqual(['Q014']);
    expect(api.saveEmployee).not.toHaveBeenCalled();
  });
  it('only replaces displayed employee after the server confirms save', async () => {
    component.open(component.employees[0]);
    component.draft!.name = 'Nguyễn Văn Bình';
    let finish!: (value: unknown) => void;
    api.saveEmployee.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const pending = component.save();
    expect(component.saving).toBe(true);
    expect(component.employees[0].name).toBe('Nguyễn Văn An');
    expect(write).not.toHaveBeenCalled();
    finish({ ...employee(), name: 'Nguyễn Văn Bình' });
    await pending;
    expect(component.employees[0].name).toBe('Nguyễn Văn Bình');
    expect(component.successOpen).toBe(true);
    expect(component.saving).toBe(false);
  });
  it('keeps the edit form and old data when the API rejects save', async () => {
    component.open(component.employees[0]);
    api.saveEmployee.mockRejectedValue(new Error('Email đã tồn tại.'));
    await component.save();
    expect(component.draft).not.toBeNull();
    expect(component.modalError).toBe('Email đã tồn tại.');
    expect(component.successOpen).toBe(false);
  });
  it('does not pretend an account was locked when the server denies it', async () => {
    component.open(component.employees[0]);
    component.lockReason = 'Test reason';
    api.employeeStatus.mockRejectedValue(new Error('Không có quyền.'));
    await component.commitStatus(true);
    expect(component.draft!.status).toBe('Đang hoạt động');
    expect(component.modalError).toBe('Không có quyền.');
  });
});
