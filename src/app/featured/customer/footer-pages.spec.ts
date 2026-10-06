import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { Faq } from './about/faq/faq';
import { Careers } from './about/careers/careers';
import { News } from './news/news';
import { Schedule } from './schedule/schedule';

describe('Pages linked from the customer footer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    window.scrollTo = () => {};
  });

  for (const [url, heading] of [
    ['/faq', 'CÂU HỎI THƯỜNG GẶP'],
    ['/dieu-khoan', 'ĐIỀU KHOẢN SỬ DỤNG'],
    ['/chinh-sach', 'CHÍNH SÁCH'],
    ['/lien-he', 'LIÊN HỆ CHÚNG TÔI'],
    ['/ve-chung-toi', 'VIAGO'],
    ['/tuyen-dung', 'Cơ hội nghề nghiệp'],
    ['/tin-tuc', 'Tin tức nổi bật'],
    ['/lich-trinh', 'Lịch Trình Tuyến Xe'],
  ]) {
    it(`renders real page content at ${url}`, async () => {
      const harness = await RouterTestingHarness.create(url);
      expect(harness.routeNativeElement?.textContent).toContain(heading);
      expect(harness.routeNativeElement?.textContent).not.toContain('works!');
    });
  }

  it('filters FAQ results and opens the selected answer', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/faq', Faq);
    page.setSearch('quên mật khẩu');
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('.faq-item').length).toBe(1);
    const button = harness.routeNativeElement?.querySelector<HTMLButtonElement>('.faq-question');
    button?.click();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.faq-item.open')).toBeTruthy();
    page.setSearch('không-tồn-tại-123');
    harness.routeDebugElement?.injector.get(ChangeDetectorRef).markForCheck();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.faq-empty')).toBeTruthy();
  });

  it('filters jobs, opens job details, and rejects an incomplete application', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/tuyen-dung', Careers);
    page.filters.keyword = 'Tài xế';
    page.filterJobs();
    expect(page.filteredJobs.length).toBe(1);
    page.openJobDetail(page.filteredJobs[0]);
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
    const page = await harness.navigateByUrl('/tin-tuc', News);
    page.setCategory('khuyen-mai');
    expect(page.filteredArticles.length).toBeGreaterThan(0);
    expect(page.filteredArticles.every(a => a.categoryKey === 'khuyen-mai')).toBe(true);
    const article = page.filteredArticles[0];
    await harness.navigateByUrl(`/tin-tuc/chi-tiet/${article.id}`);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(article.title);
    expect(harness.routeNativeElement?.querySelector('.article-body')?.textContent?.length).toBeGreaterThan(200);
  });

  it('searches routes and displays the schedule detail modal', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/lich-trinh', Schedule);
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
