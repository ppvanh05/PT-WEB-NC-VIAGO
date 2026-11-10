import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivityLog } from './activity-log';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
describe('Activity logs from server', () => {
  let fixture: ComponentFixture<ActivityLog>, component: ActivityLog;
  const raw = () => ({
    id: 'NK_API',
    timestamp: new Date().toISOString(),
    actor: { code: 'NV1', name: 'Admin', username: 'admin', phone: '', role: 'QuanTriVien' },
    action: 'UPDATE_CUSTOMER',
    status: 'ThanhCong',
    details: 'Saved on server',
    ip: '127.0.0.1',
    userAgent: 'Test',
    target: { code: 'KH1', name: 'Client', type: 'khach_hang' },
    changes: [],
  });
  let all: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    all = vi.fn().mockResolvedValue([raw()]);
    await TestBed.configureTestingModule({
      imports: [ActivityLog],
      providers: [{ provide: AccountsApiService, useValue: { all } }],
    }).compileComponents();
    fixture = TestBed.createComponent(ActivityLog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => fixture.destroy());
  it('reads API logs with correct actor/status and ignores browser logs', async () => {
    localStorage.setItem('viago_activity_log', JSON.stringify([{ id: 'FAKE' }]));
    await component.refresh();
    expect(component.logs.map((l) => l.id)).toEqual(['NK_API']);
    expect(component.logs[0].actor.role).toBe('Quản trị viên');
    expect(component.logs[0].status).toBe('Thành công');
    localStorage.removeItem('viago_activity_log');
  });
  it('shows server errors instead of falling back to fabricated history', async () => {
    all.mockRejectedValue(new Error('Không có quyền.'));
    await component.refresh();
    expect(component.error).toBe('Không có quyền.');
    component.logs = [];
    component.filteredLogs = [];
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('td.empty') as HTMLElement;
    expect(empty.textContent).toContain(component.error);
    expect(empty.textContent).not.toContain('Không có nhật ký phù hợp');
  });
  it('exports filtered server rows with CSV formula escaping', () => {
    component.logs[0].details = '=HYPERLINK("test")';
    component.applyFilters();
    expect(component.csvContent()).toContain("'=HYPERLINK");
    expect(component.csvContent()).toContain('""test""');
    component.searchQuery = 'no-match';
    component.applyFilters();
    expect(component.csvContent()).not.toContain('NK_API');
  });
});
