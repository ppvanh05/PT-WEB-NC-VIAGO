import { TestBed } from '@angular/core/testing';
import { InvoicePage } from './invoice';

const apiInvoice = (over: Record<string, unknown> = {}) => ({
  lookupCode: 'HD2026ABC',
  invoiceNumber: '00001234',
  symbol: '1C26TVG',
  issueDate: '2026-06-18',
  company: 'Công ty TNHH VIAGO',
  customer: 'Nguyễn Văn An',
  route: 'TP.HCM - Cần Thơ',
  totalAmount: 180000,
  status: 'valid',
  previewUrl: null,
  ...over,
});

/** Dựng trang tra cứu hóa đơn; `response` là phản hồi của API tra cứu. */
function build(response: { ok?: boolean; data?: unknown } | 'LOI' = {}) {
  const urls: string[] = [];
  (globalThis as unknown as { fetch: unknown }).fetch = async (url: string) => {
    urls.push(url);
    if (response === 'LOI') throw new Error('Mất kết nối.');
    return {
      ok: response.ok ?? true,
      json: async () => ('data' in response ? response.data : apiInvoice()),
    };
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [InvoicePage] });
  const fixture = TestBed.createComponent(InvoicePage);
  const page = fixture.componentInstance;
  return { page, urls };
}

const pdf = (name = 'hoadon.pdf', type = 'application/pdf', bytes = 1024) =>
  new File([new Uint8Array(bytes)], name, { type });

describe('Customer invoice lookup page', () => {
  it('opens on the lookup tab with a fresh captcha', () => {
    const { page } = build();
    expect(page.activeTab).toBe('search');
    expect(page.viewState).toBe('form');
    expect(page.currentCaptcha).toMatch(/^\d{5}$/);
  });

  it('clears everything typed when the customer changes tab', () => {
    const { page } = build();
    page.searchCode = 'HD2026ABC';
    page.captchaInput = '12345';
    page.verifyFile = pdf();
    page.error = 'Mã xác thực không chính xác. Vui lòng thử lại.';
    page.viewState = 'result';
    page.setActiveTab('verify');
    expect(page.activeTab).toBe('verify');
    expect(page.viewState).toBe('form');
    expect(page.captchaInput).toBe('');
    expect(page.verifyFile).toBeNull();
    expect(page.error).toBe('');
    expect(page.foundInvoice).toBeNull();
  });

  it('draws a different captcha each time it is refreshed', () => {
    const { page } = build();
    const seen = new Set<string>();
    for (let i = 0; i < 25; i++) {
      page.refreshCaptcha();
      expect(page.currentCaptcha).toMatch(/^\d{5}$/);
      seen.add(page.currentCaptcha);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('keeps the button out of reach until the tab has what it needs', () => {
    const { page } = build();
    expect(page.canSubmit()).toBe(false);
    page.captchaInput = ' 12345 ';
    expect(page.canSubmit()).toBe(false);
    page.searchCode = 'HD2026ABC';
    expect(page.canSubmit()).toBe(true);
    page.setActiveTab('verify');
    page.captchaInput = '12345';
    expect(page.canSubmit()).toBe(false);
    page.verifyFile = pdf();
    expect(page.canSubmit()).toBe(true);
  });

  it('refuses a wrong captcha before calling the server at all', async () => {
    const { page, urls } = build();
    page.searchCode = 'HD2026ABC';
    page.captchaInput = '00000';
    page.currentCaptcha = '46097';
    await page.submit();
    expect(page.error).toBe('Mã xác thực không chính xác. Vui lòng thử lại.');
    expect(urls).toEqual([]);
    expect(page.viewState).toBe('form');
  });

  it('shows the invoice the lookup code belongs to', async () => {
    const { page, urls } = build();
    page.currentCaptcha = '46097';
    page.captchaInput = '46097';
    page.searchCode = '  HD2026ABC  ';
    await page.submit();
    expect(urls[0]).toBe('/api/customer/invoice/lookup?code=HD2026ABC');
    expect(page.viewState).toBe('result');
    expect(page.foundInvoice).toMatchObject({
      invoiceNumber: '00001234',
      symbol: '1C26TVG',
      company: 'Công ty TNHH VIAGO',
      totalAmount: 180000,
      status: 'valid',
    });
    // Không có ảnh kèm theo thì dùng ảnh hóa đơn mẫu.
    expect(page.foundInvoice!.imageUrl).toBe('/assets/customer/hoadon.png');
  });

  it('shows the image the server sends with the invoice', async () => {
    const { page } = build({ data: apiInvoice({ previewUrl: 'https://viago.vn/hd/00001234.png' }) });
    page.currentCaptcha = '46097';
    page.captchaInput = '46097';
    page.searchCode = 'HD2026ABC';
    await page.submit();
    expect(page.foundInvoice!.imageUrl).toBe('https://viago.vn/hd/00001234.png');
  });

  it('tells the customer no invoice was found and keeps the form open', async () => {
    const { page } = build({ ok: false, data: { message: 'Không tìm thấy' } });
    page.currentCaptcha = '46097';
    page.captchaInput = '46097';
    page.searchCode = 'HD-SAI';
    await page.submit();
    expect(page.modalType).toBe('fail');
    expect(page.viewState).toBe('form');
    expect(page.foundInvoice).toBeNull();
  });

  it('does the same when the server cannot be reached at all', async () => {
    const { page } = build('LOI');
    page.currentCaptcha = '46097';
    page.captchaInput = '46097';
    page.searchCode = 'HD2026ABC';
    await page.submit();
    expect(page.modalType).toBe('fail');
    expect(page.viewState).toBe('form');
  });

  it('asks for the file before checking an uploaded invoice', async () => {
    const { page, urls } = build();
    page.setActiveTab('verify');
    page.currentCaptcha = '46097';
    page.captchaInput = '46097';
    await page.submit();
    expect(page.error).toBe('Vui lòng tải lên tệp hóa đơn PDF.');
    expect(urls).toEqual([]);
  });

  it('reports an uploaded invoice as genuine', async () => {
    const { page } = build();
    page.setActiveTab('verify');
    page.currentCaptcha = '46097';
    page.captchaInput = '46097';
    page.verifyFile = pdf();
    await page.submit();
    expect(page.modalType).toBe('success');
    expect(page.viewState).toBe('result');
  });

  it('takes only a PDF of no more than five megabytes', () => {
    const { page } = build();
    page.validateFile(pdf('hoadon.docx', 'application/msword'));
    expect(page.error).toBe('Chỉ chấp nhận tệp định dạng PDF.');
    expect(page.verifyFile).toBeNull();
    page.validateFile(pdf('hoadon.pdf', 'application/pdf', 6 * 1024 * 1024));
    expect(page.error).toBe('Dung lượng tệp vượt quá 5MB.');
    expect(page.verifyFile).toBeNull();
    page.validateFile(pdf());
    expect(page.error).toBe('');
    expect(page.verifyFile!.name).toBe('hoadon.pdf');
    // Tệp PDF không khai báo kiểu MIME vẫn nhận theo phần mở rộng.
    page.validateFile(pdf('khac.PDF', ''));
    expect(page.error).toBe('');
  });

  it('takes the file whether it is picked or dragged in, and lets it be removed', () => {
    const { page } = build();
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [pdf('chon.pdf')], configurable: true });
    page.onFileChange({ target: input } as unknown as Event);
    expect(page.verifyFile!.name).toBe('chon.pdf');
    let prevented = false;
    page.onFileDrop({
      preventDefault: () => { prevented = true; },
      dataTransfer: { files: [pdf('keo.pdf')] },
    } as unknown as DragEvent);
    expect(prevented).toBe(true);
    expect(page.verifyFile!.name).toBe('keo.pdf');
    page.clearVerifyFile(input);
    expect(page.verifyFile).toBeNull();
    expect(input.value).toBe('');
  });

  it('ignores a file chooser the customer closed without picking anything', () => {
    const { page } = build();
    page.verifyFile = pdf('giu.pdf');
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [], configurable: true });
    page.onFileChange({ target: input } as unknown as Event);
    expect(page.verifyFile!.name).toBe('giu.pdf');
    page.onFileDrop({ preventDefault: () => {}, dataTransfer: null } as unknown as DragEvent);
    expect(page.verifyFile!.name).toBe('giu.pdf');
  });

  it('hands the invoice over as an XML file named after its number', async () => {
    const { page } = build();
    page.currentCaptcha = '46097';
    page.captchaInput = '46097';
    page.searchCode = 'HD2026ABC';
    await page.submit();
    let blob: Blob | null = null;
    let link: HTMLAnchorElement | null = null;
    URL.createObjectURL = (value: Blob | MediaSource) => { blob = value as Blob; return 'blob:hoadon'; };
    URL.revokeObjectURL = () => {};
    const createElement = document.createElement.bind(document);
    document.createElement = ((tag: string) => {
      const element = createElement(tag);
      if (tag === 'a') { link = element as HTMLAnchorElement; element.click = () => {}; }
      return element;
    }) as typeof document.createElement;
    page.downloadXml();
    document.createElement = createElement;
    expect(link!.download).toBe('HD_00001234.xml');
    expect(blob!.type).toBe('application/xml');
    expect(await blob!.text()).toContain('<InvoiceNumber>00001234</InvoiceNumber>');
    expect(await blob!.text()).toContain('<TotalAmount>180000</TotalAmount>');
  });

  it('does nothing when asked to download before any invoice is shown', () => {
    const { page } = build();
    let created = 0;
    URL.createObjectURL = () => { created++; return 'blob:x'; };
    page.downloadXml();
    expect(created).toBe(0);
  });
});
