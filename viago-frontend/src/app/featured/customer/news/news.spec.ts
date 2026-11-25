import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { NewsService, type NewsCategory, type NewsItem } from '../../../core/services/news.service';
import { News } from './news';

interface Nav { commands: unknown[]; extras: unknown }

const article = (over: Partial<NewsItem> = {}): NewsItem => ({
  id: 'TIN001',
  slug: 'mo-tuyen-moi',
  title: 'VIAGO mở tuyến TP.HCM - Cần Thơ',
  category: 'news',
  categoryLabel: 'Tin tức',
  image: '/assets/customer/tin1.jpg',
  date: '18/06/2026',
  author: 'Ban truyền thông',
  summary: 'Tuyến mới chạy từ tháng 7.',
  isFeatured: false,
  tags: ['tuyến mới'],
  viewCount: 120,
  commentCount: 3,
  publishedAt: '2026-06-18T03:00:00.000Z',
  ...over,
});

/**
 * Dựng trang tin tức. `list` là trang bài viết API trả về,
 * `fail` là tên hàm của NewsService sẽ trả lỗi.
 */
function build(list: NewsItem[] = [article()], total = list.length, fail = '', width = 1440) {
  const queries: Record<string, unknown>[] = [];
  const navigations: Nav[] = [];
  const params = new BehaviorSubject<Record<string, string>>({});
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
  const guard = <T>(name: string, value: T) => {
    if (fail === name) throw new Error('Chưa tải được tin tức lúc này.');
    return value;
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [News],
    providers: [
      {
        provide: NewsService,
        useValue: {
          categories: async () => guard('categories', {
            data: [
              { id: 'all', label: 'Tất cả', count: 9 },
              { id: 'news', label: 'Tin tức', count: 5 },
              { id: 'promotion', label: 'Khuyến mãi', count: 4 },
            ],
          }),
          list: async (query: Record<string, unknown>) => {
            queries.push(query);
            return guard('list', { data: list, pagination: { page: 1, pageSize: 12, total, totalPages: 1 } });
          },
          featured: async () => guard('featured', { grid: [article({ id: 'TIN002' })], subGrid: [] }),
        },
      },
      {
        provide: Router,
        useValue: {
          navigate: (commands: unknown[], extras: unknown) => {
            navigations.push({ commands, extras });
            return Promise.resolve(true);
          },
        },
      },
      { provide: ActivatedRoute, useValue: { queryParams: params.asObservable(), snapshot: { queryParams: {} } } },
    ],
  });
  const fixture = TestBed.createComponent(News);
  return { page: fixture.componentInstance, fixture, queries, navigations, params };
}

const settle = () => new Promise(resolve => setTimeout(resolve));

describe('Customer news list page', () => {
  it('loads the categories, the list and the highlights when the page opens', async () => {
    const { page, fixture } = build();
    fixture.detectChanges();
    await settle();
    expect(page.categories.map(c => c.id)).toEqual(['all', 'news', 'promotion']);
    expect(page.filteredArticles.map(a => a.id)).toEqual(['TIN001']);
    expect(page.featuredData.grid.map(a => a.id)).toEqual(['TIN002']);
    expect(page.loading).toBe(false);
    expect(page.error).toBe('');
  });

  it('takes the category and the search words from the address bar', async () => {
    const { page, fixture, params, queries } = build();
    fixture.detectChanges();
    await settle();
    params.next({ category: 'promotion', search: 'giảm giá' });
    await settle();
    expect(page.selectedCategory).toBe('promotion');
    expect(page.activeCategory).toBe('promotion');
    expect(page.searchTerm).toBe('giảm giá');
    expect(queries.at(-1)).toMatchObject({ category: 'promotion', search: 'giảm giá', page: 1 });
  });

  it('accepts q as well as search, and ignores a category that does not exist', async () => {
    const { page, fixture, params } = build();
    fixture.detectChanges();
    params.next({ category: 'khong-co-that', q: 'tuyến mới' });
    await settle();
    expect(page.selectedCategory).toBe('all');
    expect(page.searchTerm).toBe('tuyến mới');
  });

  it('goes back to the first page whenever the address changes', async () => {
    const { page, fixture, params } = build(Array.from({ length: 12 }, (_, i) => article({ id: `TIN${i}` })), 40);
    fixture.detectChanges();
    await settle();
    page.currentPage = 3;
    params.next({ category: 'news' });
    await settle();
    expect(page.currentPage).toBe(1);
  });

  it('empties the list and says why when the news cannot be loaded', async () => {
    const { page, fixture } = build([article()], 1, 'list');
    fixture.detectChanges();
    await settle();
    expect(page.error).toBe('Chưa tải được tin tức lúc này.');
    expect(page.filteredArticles).toEqual([]);
    expect(page.featuredData).toEqual({ grid: [], subGrid: [] });
    expect(page.loading).toBe(false);
  });

  it('still shows the list when only the category counts fail', async () => {
    const { page, fixture } = build([article()], 1, 'categories');
    fixture.detectChanges();
    await settle();
    expect(page.categories).toEqual([]);
    expect(page.filteredArticles.map(a => a.id)).toEqual(['TIN001']);
  });

  it('shows fewer articles a page on a phone than on a computer', async () => {
    const phone = build([article()], 1, '', 480);
    phone.fixture.detectChanges();
    await settle();
    expect(phone.page.pageSize).toBe(4);
    const tablet = build([article()], 1, '', 900);
    tablet.fixture.detectChanges();
    await settle();
    expect(tablet.page.pageSize).toBe(8);
    const desktop = build();
    desktop.fixture.detectChanges();
    await settle();
    expect(desktop.page.pageSize).toBe(12);
  });

  it('reloads from the first page when the window is resized across a breakpoint', async () => {
    const { page, fixture, queries } = build();
    fixture.detectChanges();
    await settle();
    page.currentPage = 2;
    const before = queries.length;
    // Thu nhỏ cửa sổ xuống cỡ điện thoại: số bài mỗi trang đổi nên phải tải lại.
    Object.defineProperty(window, 'innerWidth', { value: 480, configurable: true, writable: true });
    page.onResize();
    await settle();
    expect(page.pageSize).toBe(4);
    expect(page.currentPage).toBe(1);
    expect(queries.length).toBeGreaterThan(before);
    // Co giãn trong cùng một cỡ thì không tải lại.
    const after = queries.length;
    Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true, writable: true });
    page.onResize();
    await settle();
    expect(queries).toHaveLength(after);
  });

  it('puts the category in the address instead of filtering in place', async () => {
    const { page, navigations } = build();
    await page.setCategory('promotion' as NewsCategory);
    expect(navigations[0].extras).toMatchObject({ queryParams: { category: 'promotion' } });
    await page.onCategoryChange('all' as NewsCategory);
    // "Tất cả" thì bỏ hẳn tham số khỏi địa chỉ cho gọn.
    expect(navigations[1].extras).toMatchObject({ queryParams: {} });
  });

  it('waits for the customer to stop typing before searching', async () => {
    const { page, fixture, queries } = build();
    fixture.detectChanges();
    await settle();
    const before = queries.length;
    page.currentPage = 4;
    page.searchTerm = 'tuy';
    page.onFilterChange();
    page.searchTerm = 'tuyến mới';
    page.onFilterChange();
    expect(page.currentPage).toBe(1);
    expect(queries).toHaveLength(before);
    await new Promise(resolve => setTimeout(resolve, 320));
    // Hai lần nhập liên tiếp chỉ gọi máy chủ một lần.
    expect(queries).toHaveLength(before + 1);
    expect(queries.at(-1)).toMatchObject({ search: 'tuyến mới' });
  });

  it('clears the search box and loads the list again at once', async () => {
    const { page, fixture, queries } = build();
    fixture.detectChanges();
    await settle();
    page.searchTerm = 'tuyến mới';
    page.currentPage = 3;
    await page.clearSearch();
    expect(page.searchTerm).toBe('');
    expect(page.currentPage).toBe(1);
    expect(queries.at(-1)).toMatchObject({ search: '' });
  });

  it('counts the pages from how many articles the server reports', async () => {
    const { page, fixture } = build(Array.from({ length: 12 }, (_, i) => article({ id: `TIN${i}` })), 40);
    fixture.detectChanges();
    await settle();
    expect(page.totalPages).toBe(4);
    expect(page.paginatedArticles).toHaveLength(12);
    page.totalItems = 0;
    // Không có bài nào vẫn còn một trang để hiển thị thông báo trống.
    expect(page.totalPages).toBe(1);
  });

  it('refuses to page outside what exists, past the ellipsis or while still loading', async () => {
    const { page, fixture, queries } = build(Array.from({ length: 12 }, (_, i) => article({ id: `TIN${i}` })), 40);
    fixture.detectChanges();
    await settle();
    const before = queries.length;
    page.setPage(0);
    page.setPage(9);
    page.setPage('...');
    expect(page.currentPage).toBe(1);
    expect(queries).toHaveLength(before);
    page.loading = true;
    page.setPage(2);
    expect(page.currentPage).toBe(1);
    page.loading = false;
    page.setPage(2);
    expect(page.currentPage).toBe(2);
    await settle();
    expect(queries.at(-1)).toMatchObject({ page: 2 });
  });

  it('heads the list after the category being read, or after the search', async () => {
    const { page, fixture } = build();
    fixture.detectChanges();
    await settle();
    expect(page.sectionTitle).toBe('TẤT CẢ');
    page.selectedCategory = 'promotion';
    expect(page.sectionTitle).toBe('KHUYẾN MÃI');
    page.selectedCategory = 'recruitment';
    expect(page.sectionTitle).toBe('DANH SÁCH BÀI VIẾT');
    page.searchTerm = 'tuyến mới';
    expect(page.sectionTitle).toBe('KẾT QUẢ TÌM KIẾM');
  });

  it('opens an article only when it has an identifier', async () => {
    const { page, navigations } = build();
    page.goToDetail('');
    expect(navigations).toHaveLength(0);
    page.goToDetail('TIN001');
    expect(navigations[0].commands).toEqual(['/customer/tin-tuc', 'TIN001']);
  });

  it('shows the logo in place of a picture that will not load, and only tries once', () => {
    const { page } = build();
    const image = document.createElement('img');
    image.src = 'https://viago.vn/anh-khong-co.jpg';
    page.onImageError({ target: image } as unknown as Event);
    expect(image.src).toContain('/assets/customer/logo.png');
    page.onImageError({ target: image } as unknown as Event);
    expect(image.src).toContain('/assets/customer/logo.png');
  });
});
