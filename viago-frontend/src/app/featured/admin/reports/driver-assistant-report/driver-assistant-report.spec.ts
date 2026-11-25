import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DriverAssistantReport, Personnel } from './driver-assistant-report';

const vnDate = (daysFromToday: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return String(d.getDate()).padStart(2, '0') + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
};

const person = (over: Partial<Personnel> = {}): Personnel => ({
  stt: 1,
  maNhanSu: 'NS001',
  hoTen: 'Nguyễn Văn Hùng',
  ngaySinh: '02/03/1988',
  soDienThoai: '0912345678',
  cccd: '079088001234',
  vaiTro: 'Tài xế',
  hangBangLai: 'E',
  thoiHanBangLai: vnDate(365),
  trangThai: 'Đang hoạt động',
  soChuyen: 12,
  ...over,
});

function build(people: Personnel[] = []) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [DriverAssistantReport],
    providers: [
      { provide: AccountsApiService, useValue: { request: async () => ({ items: [], pagination: { totalPages: 1 } }) } },
      { provide: ToastService, useValue: { showError: () => {}, showSuccess: () => {} } },
    ],
  });
  const page = TestBed.createComponent(DriverAssistantReport).componentInstance;
  page.allPersonnel = people;
  page.filteredPersonnel = [...people];
  return page;
}

describe('Admin driver and assistant report', () => {
  it('warns about a licence expiring within thirty days, and about one already expired', () => {
    const page = build();
    expect(page.isLicenseExpiringSoon(person({ thoiHanBangLai: vnDate(10) }))).toBe(true);
    expect(page.isLicenseExpiringSoon(person({ thoiHanBangLai: vnDate(30) }))).toBe(true);
    expect(page.isLicenseExpiringSoon(person({ thoiHanBangLai: vnDate(-5) }))).toBe(true);
  });

  it('leaves a licence valid for more than thirty days alone', () => {
    const page = build();
    expect(page.isLicenseExpiringSoon(person({ thoiHanBangLai: vnDate(31) }))).toBe(false);
    expect(page.isLicenseExpiringSoon(person({ thoiHanBangLai: vnDate(400) }))).toBe(false);
  });

  it('never warns about assistants or about staff with no licence recorded', () => {
    const page = build();
    // Phụ xe không bắt buộc có bằng lái nên không được tính vào cảnh báo.
    expect(page.isLicenseExpiringSoon(
      person({ vaiTro: 'Phụ xe', hangBangLai: 'Không yêu cầu bằng lái', thoiHanBangLai: vnDate(3) }),
    )).toBe(false);
    expect(page.isLicenseExpiringSoon(person({ thoiHanBangLai: '' }))).toBe(false);
  });

  it('counts the days left until a licence expires, negative once it has lapsed', () => {
    const page = build();
    expect(page.getDaysUntilExpiration(person({ thoiHanBangLai: vnDate(15) }))).toBe(15);
    expect(page.getDaysUntilExpiration(person({ thoiHanBangLai: vnDate(-3) }))).toBe(-3);
    expect(page.getDaysUntilExpiration(person({ thoiHanBangLai: '' }))).toBe(0);
  });

  it('counts staff by role and counts expiring licences for the summary cards', () => {
    const page = build([
      person({ maNhanSu: 'NS001', thoiHanBangLai: vnDate(10) }),
      person({ maNhanSu: 'NS002', thoiHanBangLai: vnDate(200) }),
      person({ maNhanSu: 'NS003', vaiTro: 'Phụ xe', hangBangLai: 'Không yêu cầu bằng lái', thoiHanBangLai: '' }),
    ]);
    page.calculateStats();
    expect(page.totalOperating).toBe(3);
    expect(page.totalDrivers).toBe(2);
    expect(page.totalAssistants).toBe(1);
    expect(page.expiringLicensesCount).toBe(1);
  });

  it('lists exactly the staff behind the expiring-licence card', () => {
    const page = build([
      person({ maNhanSu: 'NS001', thoiHanBangLai: vnDate(5) }),
      person({ maNhanSu: 'NS002', thoiHanBangLai: vnDate(90) }),
    ]);
    expect(page.expiringPersonnelList.map(p => p.maNhanSu)).toEqual(['NS001']);
  });

  it('splits the expiring licences into a thirty-day window that excludes the already expired', () => {
    const page = build([
      person({ maNhanSu: 'NS001', thoiHanBangLai: vnDate(10) }),
      person({ maNhanSu: 'NS002', thoiHanBangLai: vnDate(-10) }),
      person({ maNhanSu: 'NS003', thoiHanBangLai: vnDate(45) }),
    ]);
    // Thẻ "dưới 30 ngày" chỉ đếm bằng còn hạn, bằng đã quá hạn thuộc nhóm khác.
    expect(page.expiring30DaysCount).toBe(1);
  });
});
