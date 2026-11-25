import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LostAndFound, type LostItem } from './lost-and-found';

interface Call { path: string; method: string; body: unknown }

const item = (over: Partial<LostItem> = {}): LostItem => ({
  id: 'DTL001',
  name: 'Ví da màu nâu',
  image: null,
  foundDate: '2026-06-18',
  route: 'TP.HCM - Cần Thơ',
  storage: 'Kho Văn phòng Quận 1',
  status: 'stored',
  ...over,
});

const booking = (over: Record<string, unknown> = {}) => ({
  orderId: 'DH001',
  ticketId: null,
  route: 'TP.HCM - Cần Thơ',
  date: '2026-06-18',
  fullName: 'Nguyễn Văn An',
  email: 'an@example.com',
  tickets: [{ id: 'VE001', seat: 'A01', passenger: 'Nguyễn Văn An' }],
  ...over,
});

const page1 = { items: [item()], pagination: { total: 1, totalPages: 1 } };

/**
 * Dựng trang đồ thất lạc. `over` ghi đè phản hồi API theo một phần đường dẫn;
 * giá trị 'LOI' làm đường dẫn đó trả lỗi. `user` null là khách chưa đăng nhập.
 */
function build(over: Record<string, unknown> = {}, user: Record<string, unknown> | null = null) {
  const calls: Call[] = [];
  const fail = new Set(Object.keys(over).filter(k => over[k] === 'LOI'));
  const answer = (path: string): unknown => {
    for (const key of Object.keys(over)) if (path.includes(key)) return over[key];
    if (path.includes('lost-and-found/items')) return page1;
    if (path.includes('lost-and-found/routes')) return [{ value: 'TUYEN01', label: 'TP.HCM - Cần Thơ' }];
    if (path.includes('profile/tickets')) return { items: [] };
    if (path.includes('lost-and-found/bookings')) return booking();
    if (path.includes('lost-and-found/status')) {
      return { type: 'report', code: 'DTL010', itemName: 'Ví da', status: 'DangXuLy', statusLabel: 'Đang xử lý', storage: null, timeline: [] };
    }
    return { code: 'YCND001' };
  };
  // jsdom không có hai hàm này nhưng component dùng để xem trước ảnh đã chọn.
  URL.createObjectURL = () => 'blob:xem-truoc';
  URL.revokeObjectURL = () => {};
  window.scrollTo = () => {};
  // Trang cuộn tới danh sách hoặc tới ô nhập sai; jsdom không có hàm cuộn này.
  Element.prototype.scrollIntoView = () => {};
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [LostAndFound],
    providers: [
      {
        provide: AccountsApiService,
        useValue: {
          request: async (path: string, method = 'GET', body?: unknown) => {
            calls.push({ path, method, body });
            for (const key of fail) if (path.includes(key)) throw new Error('Mã không khớp số điện thoại.');
            return answer(path);
          },
        },
      },
      { provide: AuthService, useValue: { currentUser: () => user, isLoggedIn: () => !!user } },
    ],
  });
  const fixture = TestBed.createComponent(LostAndFound);
  return { page: fixture.componentInstance, fixture, calls };
}

const fillReport = (page: LostAndFound, over: Record<string, unknown> = {}) => {
  Object.assign(page.reportForm, {
    bookingCode: 'DH001',
    phone: '0912345678',
    itemName: 'Ví da màu nâu',
    description: 'Ví da nâu, bên trong có thẻ sinh viên',
    fullName: 'Nguyễn Văn An',
    email: 'an@example.com',
  }, over);
};

const fileOf = (name: string, type: string, bytes: number) =>
  new File([new Uint8Array(bytes)], name, { type });

describe('Customer lost and found page', () => {
  it('asks the server for the page, the search words and both filters', async () => {
    const { page, calls } = build();
    page.searchQuery = '  ví da  ';
    page.selectedRoute = 'TUYEN01';
    page.selectedStatus = 'stored';
    page.currentPage = 3;
    await page.loadItems();
    const query = calls.at(-1)!.path;
    expect(query).toContain('page=3');
    expect(query).toContain('pageSize=8');
    // URLSearchParams viết dấu cách thành dấu cộng.
    expect(query).toContain('search=v%C3%AD+da');
    expect(query).toContain('routeId=TUYEN01');
    expect(query).toContain('status=stored');
    expect(page.totalItems).toBe(1);
  });

  it('goes back to the first page whenever a filter changes and clears them all together', async () => {
    const { page } = build();
    page.currentPage = 4;
    page.searchQuery = 'ví';
    page.selectedRoute = 'TUYEN01';
    page.selectedStatus = 'returned';
    page.clearFilters();
    expect(page.currentPage).toBe(1);
    expect([page.searchQuery, page.selectedRoute, page.selectedStatus]).toEqual(['', '', '']);
  });

  it('empties the list and says why when the server cannot be reached', async () => {
    const { page } = build({ 'lost-and-found/items': 'LOI' });
    await page.loadItems();
    expect(page.itemsError).toBe('Mã không khớp số điện thoại.');
    expect(page.paginatedItems).toEqual([]);
    expect(page.totalPages).toBe(1);
    expect(page.loadingItems).toBe(false);
  });

  it('refuses to page outside the pages that exist', async () => {
    const { page, calls } = build();
    page.totalPages = 2;
    const before = calls.length;
    page.setPage(0);
    page.setPage(3);
    expect(page.currentPage).toBe(1);
    expect(calls).toHaveLength(before);
    page.setPage(2);
    expect(page.currentPage).toBe(2);
  });

  it('fills in the trip, the seat and the contact details once the code is verified', async () => {
    const { page } = build();
    page.reportForm.bookingCode = ' dh001 ';
    page.reportForm.phone = '0912345678';
    await page.onBookingCodeChange();
    expect(page.booking?.route).toBe('TP.HCM - Cần Thơ');
    // Mã nhập thường được viết hoa lại, và đơn một vé thì tự chọn luôn ghế.
    expect(page.reportForm.bookingCode).toBe('DH001');
    expect(page.reportForm.maVe).toBe('VE001');
    expect(page.reportForm.seat).toBe('A01');
    expect(page.reportForm.fullName).toBe('Nguyễn Văn An');
    expect(page.bookingCodeError).toBe('');
  });

  it('will not verify a code without the phone number of whoever booked it', async () => {
    const { page, calls } = build();
    page.reportForm.bookingCode = 'DH001';
    page.reportForm.phone = '012';
    await page.onBookingCodeChange();
    expect(page.booking).toBeNull();
    expect(page.bookingCodeError).toContain('số điện thoại');
    expect(calls.filter(c => c.path.includes('bookings'))).toHaveLength(0);
    // Chưa nhập mã thì không báo lỗi gì cả.
    page.reportForm.bookingCode = '';
    page.bookingCodeError = '';
    await page.onBookingCodeChange();
    expect(page.bookingCodeError).toBe('');
  });

  it('says so when the code and the phone number do not go together', async () => {
    const { page } = build({ 'lost-and-found/bookings': 'LOI' });
    page.reportForm.bookingCode = 'DH999';
    page.reportForm.phone = '0912345678';
    await page.onBookingCodeChange();
    expect(page.booking).toBeNull();
    expect(page.bookingCodeError).toBe('Mã không khớp số điện thoại.');
    expect(page.checkingBooking).toBe(false);
  });

  it('asks which passenger lost the item when the order holds several tickets', async () => {
    const { page } = build({
      'lost-and-found/bookings': booking({
        tickets: [
          { id: 'VE001', seat: 'A01', passenger: 'Nguyễn Văn An' },
          { id: 'VE002', seat: 'A02', passenger: 'Trần Thị Bé' },
        ],
      }),
    });
    page.reportForm.bookingCode = 'DH001';
    page.reportForm.phone = '0912345678';
    await page.onBookingCodeChange();
    expect(page.orderTickets).toHaveLength(2);
    expect(page.reportForm.seat).toBe('');
    page.onSelectOrderTicket('VE002');
    expect(page.reportForm.seat).toBe('A02');
    // Khai báo khi chưa chọn ghế thì bị chặn lại.
    fillReport(page, { maVe: '' });
    await page.submitReport();
    expect(page.toastMessage).toContain('chọn ghế');
    expect(page.toastError).toBe(true);
  });

  it('does not ask again for a ticket code that is already verified', async () => {
    const { page, calls } = build({ 'lost-and-found/bookings': booking({ ticketId: 'VE001' }) });
    page.reportForm.bookingCode = 'VE001';
    page.reportForm.phone = '0912345678';
    await page.onBookingCodeChange();
    const before = calls.filter(c => c.path.includes('bookings')).length;
    await page.onBookingCodeChange();
    expect(calls.filter(c => c.path.includes('bookings'))).toHaveLength(before);
    expect(page.orderTickets).toEqual([]);
  });

  it('keeps at most three photos and turns away the wrong type or an oversized one', () => {
    const { page } = build();
    const select = (...files: File[]) => {
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: files, configurable: true });
      page.onImagesSelected({ target: input } as unknown as Event);
    };
    select(fileOf('a.pdf', 'application/pdf', 10));
    expect(page.imageError).toContain('JPG, PNG hoặc WEBP');
    expect(page.reportImages).toHaveLength(0);
    select(fileOf('to.jpg', 'image/jpeg', 6 * 1024 * 1024));
    expect(page.imageError).toContain('5 MB');
    select(fileOf('1.jpg', 'image/jpeg', 10), fileOf('2.png', 'image/png', 10), fileOf('3.webp', 'image/webp', 10));
    expect(page.reportImages).toHaveLength(3);
    select(fileOf('4.jpg', 'image/jpeg', 10));
    expect(page.imageError).toBe('Tối đa 3 ảnh.');
    expect(page.reportImages).toHaveLength(3);
    page.removeImage(0);
    expect(page.reportImages.map(i => i.file.name)).toEqual(['2.png', '3.webp']);
  });

  it('refuses a report that is too thin to act on', async () => {
    const { page, calls } = build();
    const check = async (over: Record<string, unknown>, expected: string) => {
      page.booking = null;
      fillReport(page, over);
      await page.submitReport();
      expect(page.toastMessage, JSON.stringify(over)).toContain(expected);
    };
    await check({ bookingCode: '' }, 'mã đơn/mã vé');
    await check({ phone: '012' }, 'mã đơn/mã vé');
    await check({ itemName: 'Ví' }, 'tên vật phẩm');
    await check({ description: 'Ngắn' }, 'tối thiểu 10 ký tự');
    await check({ fullName: 'A' }, 'họ tên');
    await check({ email: 'khong-phai-email' }, 'email không hợp lệ');
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0);
  });

  it('sends the report with the photos attached, then clears the form and keeps the code to track it', async () => {
    const { page, calls } = build({ 'lost-and-found/reports': { code: 'DTL010', statusLabel: 'Đang xử lý' } });
    fillReport(page, { seat: 'A01', maVe: 'VE001' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [fileOf('1.jpg', 'image/jpeg', 10)], configurable: true });
    page.onImagesSelected({ target: input } as unknown as Event);
    await page.submitReport();
    const sent = calls.find(c => c.method === 'POST')!.body as FormData;
    expect(sent.get('bookingCode')).toBe('DH001');
    expect(sent.get('ticketId')).toBe('VE001');
    expect(sent.get('itemName')).toBe('Ví da màu nâu');
    expect(sent.get('seat')).toBe('A01');
    expect(sent.getAll('files')).toHaveLength(1);
    expect(page.toastMessage).toContain('DTL010');
    expect(page.toastError).toBe(false);
    // Gửi xong thì xóa biểu mẫu nhưng giữ mã để tra cứu ngay.
    expect(page.reportForm.itemName).toBe('');
    expect(page.reportImages).toEqual([]);
    expect(page.statusForm).toEqual({ code: 'DTL010', phone: '0912345678' });
  });

  it('shows the server message when the report is turned down', async () => {
    const { page } = build({ 'lost-and-found/reports': 'LOI' });
    fillReport(page);
    await page.submitReport();
    expect(page.toastMessage).toBe('Mã không khớp số điện thoại.');
    expect(page.toastError).toBe(true);
    expect(page.submittingReport).toBe(false);
  });

  it('needs a file code and a phone number before it looks anything up', async () => {
    const { page, calls } = build();
    page.statusForm = { code: '', phone: '0912345678' };
    await page.checkStatus();
    expect(page.statusError).toContain('DTL');
    page.statusForm = { code: 'DTL010', phone: '012' };
    await page.checkStatus();
    expect(page.statusError).toContain('YCND');
    expect(calls.filter(c => c.path.includes('status'))).toHaveLength(0);
  });

  it('shows the progress of a file that matches, and nothing at all when none does', async () => {
    const { page } = build();
    page.statusForm = { code: ' dtl010 ', phone: '0912345678' };
    await page.checkStatus();
    expect(page.statusResult?.statusLabel).toBe('Đang xử lý');
    expect(page.statusError).toBe('');
    const other = build({ 'lost-and-found/status': 'LOI' });
    other.page.statusForm = { code: 'DTL999', phone: '0912345678' };
    await other.page.checkStatus();
    expect(other.page.statusResult).toBeNull();
    expect(other.page.statusError).toBe('Mã không khớp số điện thoại.');
  });

  it('checks each field of the claim form only once the customer has left it', () => {
    const { page } = build();
    page.openClaimModal(item());
    expect(page.isClaimModalOpen).toBe(true);
    page.claimForm.phone = '012';
    page.onClaimInput('phone');
    // Chưa rời ô thì chưa báo lỗi.
    expect(page.claimErrors.phone).toBe('');
    page.onClaimBlur('phone');
    expect(page.claimErrors.phone).toContain('10 chữ số');
    page.claimForm.phone = '0912345678';
    page.onClaimInput('phone');
    expect(page.claimErrors.phone).toBe('');
  });

  it('names every missing or wrong field of the claim before sending it', async () => {
    const { page, calls } = build();
    page.openClaimModal(item());
    await page.submitClaim();
    expect(page.claimErrors).toEqual({
      bookingCode: 'Vui lòng nhập mã đơn hoặc mã vé',
      phone: 'Vui lòng nhập số điện thoại',
      description: 'Vui lòng nhập đặc điểm nhận dạng',
    });
    page.claimForm = { bookingCode: 'DH 001!', phone: '0912345678', description: 'Ngắn' };
    await page.submitClaim();
    expect(page.claimErrors.bookingCode).toBe('Mã đơn hoặc mã vé không hợp lệ');
    expect(page.claimErrors.description).toBe('Mô tả tối thiểu 10 ký tự');
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0);
  });

  it('sends a claim for the chosen item and closes the box with the code kept for tracking', async () => {
    const { page, calls } = build({ claims: { code: 'YCND007' } });
    page.openClaimModal(item({ id: 'DTL005' }));
    page.claimForm = { bookingCode: ' dh001 ', phone: '0912345678', description: 'Ví da nâu, có thẻ sinh viên bên trong' };
    await page.submitClaim();
    const sent = calls.find(c => c.method === 'POST')!;
    expect(sent.path).toContain('items/DTL005/claims');
    expect(sent.body).toEqual({
      bookingCode: 'DH001',
      phone: '0912345678',
      description: 'Ví da nâu, có thẻ sinh viên bên trong',
    });
    expect(page.toastMessage).toContain('YCND007');
    expect(page.isClaimModalOpen).toBe(false);
    expect(page.selectedClaimItem).toBeNull();
    expect(page.statusForm).toEqual({ code: 'YCND007', phone: '0912345678' });
  });

  it('shows a refused claim under the code box rather than as a passing message', async () => {
    const { page } = build({ claims: 'LOI' });
    page.openClaimModal(item());
    page.claimForm = { bookingCode: 'DH999', phone: '0912345678', description: 'Ví da nâu, có thẻ sinh viên' };
    await page.submitClaim();
    expect(page.claimErrors.bookingCode).toBe('Mã không khớp số điện thoại.');
    expect(page.isClaimModalOpen).toBe(true);
    expect(page.submittingClaim).toBe(false);
  });

  it('fills the contact details of a signed-in customer and offers their own trips', async () => {
    const { page, fixture } = build({
      'profile/tickets': {
        items: [
          { id: 'VE001', orderId: 'DH001', status: 'ĐÃ HOÀN THÀNH', date: '2026-06-18', dateLabel: '18/06/2026', depLoc: 'TP.HCM', arrLoc: 'Cần Thơ' },
          { id: 'VE002', orderId: 'DH002', status: 'ĐÃ HỦY', date: '2026-06-19', dateLabel: '19/06/2026', depLoc: 'TP.HCM', arrLoc: 'Đà Lạt' },
        ],
      },
    }, { name: 'Nguyễn Văn An', phoneNumber: '0912345678', email: 'an@example.com' });
    fixture.detectChanges();
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve));
    expect(page.reportForm).toMatchObject({ fullName: 'Nguyễn Văn An', phone: '0912345678', email: 'an@example.com' });
    expect(page.claimForm.phone).toBe('0912345678');
    expect(page.statusForm.phone).toBe('0912345678');
    // Vé đã hủy không thể để quên đồ nên không đưa vào danh sách chọn.
    expect(page.myTrips.map(t => t.id)).toEqual(['VE001']);
    await page.onSelectMyTrip('VE001');
    expect(page.reportForm.bookingCode).toBe('VE001');
  });

  it('ignores an empty choice in the trip list', async () => {
    const { page, calls } = build();
    const before = calls.length;
    page.onSelectMyTrip('');
    expect(calls).toHaveLength(before);
    expect(page.reportForm.bookingCode).toBe('');
  });

  it('writes dates and labels the way the page shows them', () => {
    const { page } = build();
    expect(page.formatDate('2026-06-18')).toBe('18/06/2026');
    expect(page.formatDate('2026-06-18T07:30:00.000Z')).toBe('18/06/2026');
    expect(page.formatDate(null)).toBe('');
    expect(page.formatDateTime('2026-06-18T00:30:00.000Z')).toBe('07:30 18/06/2026');
    expect(page.getStatusLabel('stored')).toBe('Đang lưu trữ');
    expect(page.getStatusLabel('returned')).toBe('Đã trao trả');
    expect(page.getStatusLabel('khac')).toBe('khac');
  });
});
