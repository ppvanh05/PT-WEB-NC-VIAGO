import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { Faq } from './about/faq/faq';
import { Careers } from './about/careers/careers';
import { News } from './news/news';
import { Schedule } from './schedule/schedule';
import { vi } from 'vitest';

const faqResponse = {
  data: [
    {
      id: 'FAQ_TEST',
      categoryId: 'member',
      question: 'Quên mật khẩu?',
      answer: 'Chọn quên mật khẩu để khôi phục tài khoản.',
    },
  ],
  pagination: { totalPages: 1 },
};
const job = {
  id: 'TD_TEST',
  title: 'Tài xế xe khách Hạng E',
  department: 'Vận tải',
  location: 'TP. Hồ Chí Minh',
  workType: 'Toàn thời gian',
  salary: 'Thỏa thuận',
  deadline: '2026-12-30',
  description: 'Tuyển tài xế Hạng E.',
  requirements: ['Bằng E'],
  benefits: [],
  workHours: '',
  workEnvironment: '',
  howToApply: '',
};
const article = { id:'TT_TEST', slug:'tin-tu-supabase', title:'Tin tức từ API', category:'promotion', categoryLabel:'Khuyến mãi', image:'/assets/customer/logo.png', date:'08/11/2026', author:'VIAGO', summary:'Tóm tắt từ API', content:'<p>' + 'Nội dung bài viết đã lưu trong database. '.repeat(12) + '</p>', tags:[], viewCount:1, commentCount:0, isFeatured:true, publishedAt:'2026-11-08T00:00:00Z' };

describe('Pages linked from the customer footer', () => {
  beforeEach(() => {
    const customer = routes.find((route) => route.path === 'customer')!;
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          customer
            .children!.filter((route) => route.path && route.path !== '**')
            .map((route) => ({ ...route, path: 'customer/' + route.path })),
        ),
      ],
    });
    window.scrollTo = () => {};
    HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => ({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => input.includes('/customer/news/categories') ? { data:[{id:'all',label:'Tin tức tổng hợp',count:1},{id:'promotion',label:'Khuyến mãi',count:1}] }
          : input.includes('/customer/news/featured') ? {main:article,grid:[],subGrid:[]}
          : input.includes('/customer/news/TT_TEST/views') ? {viewCount:2}
          : input.includes('/customer/news/TT_TEST/comments') ? {data:[],pagination:{total:0,totalPages:0}}
          : input.includes('/customer/news/TT_TEST/related') ? {data:[]}
          : input.includes('/customer/news/TT_TEST') ? article
          : input.includes('/customer/news?') ? {data:[article],pagination:{total:1,totalPages:1}}
          : input.includes('/about-us') ? {statistics:{activeRoutes:15,activeVehicles:13,tripsToday:4}}
          : input.includes('/policies') || input.includes('/terms') ? {data:[],pagination:{totalPages:0}}
          :
          input.includes('/faq')
            ? faqResponse
            : input.includes('/careers/TD_TEST')
              ? job
              : input.includes('/careers')
                ? { data: [job], pagination: { totalPages: 1 } }
                : {},
      })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  for (const [url, heading] of [
    ['/faq', 'CÂU HỎI THƯỜNG GẶP'],
    ['/dieu-khoan', 'ĐIỀU KHOẢN SỬ DỤNG'],
    ['/chinh-sach', 'CHÍNH SÁCH'],
    ['/lien-he', 'LIÊN HỆ CHÚNG TÔI'],
    ['/ve-chung-toi', 'VIAGO'],
    ['/tuyen-dung', 'Cơ hội nghề nghiệp'],
    ['/tin-tuc', 'TIN NỔI BẬT'],
    ['/lich-trinh', 'Lịch Trình Tuyến Xe'],
  ]) {
    it(`renders real page content at ${url}`, async () => {
      const harness = await RouterTestingHarness.create('/customer' + url);
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(harness.routeNativeElement?.textContent).toContain(heading);
      expect(harness.routeNativeElement?.textContent).not.toContain('works!');
    });
  }

  it('filters FAQ results and opens the selected answer', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/customer/faq', Faq);
    await vi.waitFor(() => expect(page.loading).toBe(false));
    page.searchQuery = 'quên mật khẩu';
    page.onSearch();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('.faq-item').length).toBe(1);
    const button = harness.routeNativeElement?.querySelector<HTMLButtonElement>('.faq-question');
    button?.click();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.faq-item.open')).toBeTruthy();
    page.searchQuery = 'không-tồn-tại-123';
    page.onSearch();
    harness.routeDebugElement?.injector.get(ChangeDetectorRef).markForCheck();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.faq-empty')).toBeTruthy();
  });

  it('filters jobs, opens job details, and rejects an incomplete application', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/customer/tuyen-dung', Careers);
    await vi.waitFor(() => expect(page.loading).toBe(false));
    page.filters.keyword = 'Tài xế';
    page.filterJobs();
    expect(page.filteredJobs.length).toBe(1);
    await page.openJobDetail(page.filteredJobs[0]);
    harness.routeDebugElement?.injector.get(ChangeDetectorRef).markForCheck();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Hạng E');
    page.openApplicationForm(page.filteredJobs[0]);
    page.submitApplication();
    expect(page.showStatusModal).toBe(false);
    expect(page.formErrors['fullName']).toBeTruthy();
    expect(page.cvError).toBeTruthy();
  });

  it('filters news and opens a full article through its link', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/customer/tin-tuc', News);
    await page.setCategory('promotion');
    await vi.waitFor(() => expect(page.loading).toBe(false));
    expect(page.filteredArticles.length).toBeGreaterThan(0);
    expect(page.filteredArticles.every((a) => a.category === 'promotion')).toBe(true);
    const article = page.filteredArticles[0];
    await harness.navigateByUrl(`/customer/tin-tuc/${article.id}`);
    await harness.fixture.whenStable();
    harness.detectChanges();
    await vi.waitFor(() => { harness.detectChanges(); expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(article.title); });
    expect(
      harness.routeNativeElement?.querySelector('.article-body')?.textContent?.length,
    ).toBeGreaterThan(200);
  });

  it('searches routes and displays the schedule detail modal', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/customer/lich-trinh', Schedule);
    page.searchTerm = 'Nha Trang';
    page.onSearch();
    expect(page.filteredRoutes.length).toBeGreaterThan(0);
    page.viewSchedule(page.filteredRoutes[0]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.schedule-modal-content')).toBeTruthy();
    page.closeSchedule();
    harness.routeDebugElement?.injector.get(ChangeDetectorRef).markForCheck();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.schedule-modal-content')).toBeFalsy();
  });
});
