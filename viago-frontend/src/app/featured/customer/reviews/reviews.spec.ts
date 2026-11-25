import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from '../../../core/services/accounts-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { Reviews, type ReviewItem } from './reviews';

interface Call { path: string; method: string }

const apiReview = (over: Record<string, unknown> = {}) => ({
  id: 'DG001',
  authorName: 'Nguyễn Văn An',
  authorInitials: 'NA',
  verifiedTrip: true,
  createdAt: '2026-06-18T03:00:00.000Z',
  rating: 5,
  content: 'Xe sạch, tài xế chạy êm.',
  vehicleType: 'Giường nằm 34 chỗ',
  route: { id: 'TUYEN01', label: 'TP.HCM - Cần Thơ' },
  criteria: [
    { key: 'xe', label: 'Chất lượng xe', score: 5 },
    { key: 'taixe', label: 'Thái độ tài xế', score: 5 },
  ],
  media: [{ url: 'https://viago.vn/dg1.jpg', type: 'Anh' }],
  helpfulCount: 3,
  isHelpful: false,
  reply: null,
  ...over,
});

const summary = (over: Record<string, unknown> = {}) => ({
  averageRating: 4.6,
  total: 25,
  withComment: 20,
  withMedia: 8,
  criteria: [
    { key: 'xe', label: 'Chất lượng xe', score: 4.7, maxScore: 5 },
    { key: 'taixe', label: 'Thái độ tài xế', score: null, maxScore: 5 },
  ],
  ...over,
});

const options = {
  vehicleTypes: [{ value: 'XE01', label: 'Giường nằm 34 chỗ' }, { value: 'XE02', label: 'Limousine 9 chỗ' }],
  routes: [{ value: 'TUYEN01', label: 'TP.HCM - Cần Thơ' }, { value: 'TUYEN02', label: 'TP.HCM - Đà Lạt' }],
};

/**
 * Dựng trang đánh giá. `pages` là các trang đánh giá mà API trả lần lượt;
 * `over` ghi đè phản hồi theo một phần đường dẫn, 'LOI' cho đường dẫn trả lỗi.
 */
function build(pages: Record<string, unknown>[][] = [[apiReview()]], over: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const fail = new Set(Object.keys(over).filter(k => over[k] === 'LOI'));
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [Reviews],
    providers: [
      {
        provide: AccountsApiService,
        useValue: {
          request: async (path: string, method = 'GET') => {
            calls.push({ path, method });
            for (const key of fail) if (path.includes(key)) throw new Error('Không tải được đánh giá lúc này.');
            for (const key of Object.keys(over)) if (path.includes(key)) return over[key];
            if (path.includes('reviews/summary')) return summary();
            if (path.includes('reviews/options')) return options;
            if (path.includes('helpful')) return { helpfulCount: method === 'POST' ? 4 : 3, isHelpful: method === 'POST' };
            const page = Number(new URL(`http://x/${path}`).searchParams.get('page') ?? 1);
            return { items: pages[page - 1] ?? [], pagination: { totalPages: pages.length } };
          },
        },
      },
      { provide: ToastService, useValue: { showError: () => {}, showSuccess: () => {} } },
    ],
  });
  const fixture = TestBed.createComponent(Reviews);
  return { page: fixture.componentInstance, fixture, calls };
}

const ids = (list: ReviewItem[]) => list.map(r => r.id);

describe('Customer reviews page', () => {
  it('shows the summary and turns an unrated criterion into a zero', async () => {
    const { page } = build();
    await page.load();
    expect(page.overallRating).toBe(4.6);
    expect(page.totalReviewsCount).toBe(25);
    expect(page.hasCommentsCount).toBe(20);
    expect(page.hasImagesCount).toBe(8);
    expect(page.criteriaList).toEqual([
      { key: 'xe', name: 'Chất lượng xe', score: 4.7, maxScore: 5 },
      { key: 'taixe', name: 'Thái độ tài xế', score: 0, maxScore: 5 },
    ]);
    expect(page.busTypeOptions).toEqual(['Giường nằm 34 chỗ', 'Limousine 9 chỗ']);
    expect(page.routeOptions).toEqual(['TP.HCM - Cần Thơ', 'TP.HCM - Đà Lạt']);
    expect(page.loading).toBe(false);
  });

  it('shows a zero average while there is still no rating at all', async () => {
    const { page } = build([[]], { 'reviews/summary': summary({ averageRating: null, total: 0, criteria: [] }) });
    await page.load();
    expect(page.overallRating).toBe(0);
    expect(page.reviewsData).toEqual([]);
  });

  it('reads every page of reviews, not only the first', async () => {
    const { page, calls } = build([
      [apiReview({ id: 'DG001' }), apiReview({ id: 'DG002' })],
      [apiReview({ id: 'DG003' })],
    ]);
    await page.load();
    expect(ids(page.reviewsData)).toEqual(['DG001', 'DG002', 'DG003']);
    expect(calls.filter(c => c.path.startsWith('customer/reviews?'))).toHaveLength(2);
  });

  it('keeps only the photos of a review and marks the ones that have none', async () => {
    const { page } = build([[
      apiReview({ id: 'DG001', media: [{ url: 'a.jpg', type: 'Anh' }, { url: 'b.mp4', type: 'Video' }] }),
      apiReview({ id: 'DG002', media: [] }),
    ]]);
    await page.load();
    const [withPhoto, without] = page.reviewsData;
    expect(withPhoto.images).toEqual(['a.jpg']);
    expect(withPhoto.hasImages).toBe(true);
    expect(without.hasImages).toBe(false);
  });

  it('shows the staff reply with its date and leaves it out when there is none', async () => {
    const { page } = build([[
      apiReview({ id: 'DG001', reply: { author: 'CSKH VIAGO', createdAt: '2026-06-19T03:00:00.000Z', content: 'Cảm ơn bạn.' } }),
      apiReview({ id: 'DG002' }),
    ]]);
    await page.load();
    expect(page.reviewsData[0].reply).toEqual({ author: 'CSKH VIAGO', date: '19/06/2026', content: 'Cảm ơn bạn.' });
    expect(page.reviewsData[1].reply).toBeUndefined();
    expect(page.reviewsData[0].date).toBe('18/06/2026');
  });

  it('gives each review in turn a different avatar colour', async () => {
    const { page } = build([Array.from({ length: 9 }, (_, i) => apiReview({ id: `DG00${i}` }))]);
    await page.load();
    const colours = page.reviewsData.map(r => r.avatarColor);
    expect(new Set(colours.slice(0, 8)).size).toBe(8);
    // Hết 8 màu thì quay lại màu đầu.
    expect(colours[8]).toBe(colours[0]);
  });

  it('says why nothing is shown when the reviews cannot be loaded', async () => {
    const { page } = build([[apiReview()]], { 'reviews/summary': 'LOI' });
    await page.load();
    expect(page.loadError).toBe('Không tải được đánh giá lúc này.');
    expect(page.loading).toBe(false);
  });

  it('keeps only the reviews that carry a comment or a photo on those two tabs', async () => {
    const { page } = build([[
      apiReview({ id: 'DG001', content: 'Rất tốt', media: [{ url: 'a.jpg', type: 'Anh' }] }),
      apiReview({ id: 'DG002', content: '   ', media: [] }),
      apiReview({ id: 'DG003', content: 'Bình thường', media: [] }),
    ]]);
    await page.load();
    expect(ids(page.filteredReviews)).toHaveLength(3);
    page.setActiveTab('has_comment');
    expect(ids(page.filteredReviews)).toEqual(['DG001', 'DG003']);
    page.setActiveTab('has_image');
    expect(ids(page.filteredReviews)).toEqual(['DG001']);
  });

  it('filters by the number of stars, the coach and the route', async () => {
    const { page } = build([[
      apiReview({ id: 'DG001', rating: 5, vehicleType: 'Giường nằm 34 chỗ', route: { id: 'T1', label: 'TP.HCM - Cần Thơ' } }),
      apiReview({ id: 'DG002', rating: 3, vehicleType: 'Limousine 9 chỗ', route: { id: 'T2', label: 'TP.HCM - Đà Lạt' } }),
    ]]);
    await page.load();
    page.selectedRating = '3';
    expect(ids(page.filteredReviews)).toEqual(['DG002']);
    page.selectedRating = 'all';
    page.selectedBusType = 'Limousine 9 chỗ';
    expect(ids(page.filteredReviews)).toEqual(['DG002']);
    page.selectedBusType = 'all';
    page.selectedRoute = 'TP.HCM - Cần Thơ';
    expect(ids(page.filteredReviews)).toEqual(['DG001']);
  });

  it('searches the author, the comment, the route and the coach alike, ignoring capitals', async () => {
    const { page } = build([[
      apiReview({ id: 'DG001', authorName: 'Trần Thị Bé', content: 'Xe mới' }),
      apiReview({ id: 'DG002', authorName: 'Lê Văn Cường', content: 'Tài xế thân thiện', vehicleType: 'Limousine 9 chỗ' }),
      apiReview({ id: 'DG003', authorName: 'Phạm Dũng', content: 'Ổn', route: { id: 'T2', label: 'TP.HCM - Đà Lạt' } }),
    ]]);
    await page.load();
    const search = (kw: string) => { page.searchKeyword = kw; return ids(page.filteredReviews); };
    expect(search('  trần  ')).toEqual(['DG001']);
    expect(search('THÂN THIỆN')).toEqual(['DG002']);
    expect(search('đà lạt')).toEqual(['DG003']);
    expect(search('limousine')).toEqual(['DG002']);
    expect(search('không có gì khớp')).toEqual([]);
  });

  it('keeps only reviews scoring at least four on every criterion picked', async () => {
    const { page } = build([[
      apiReview({ id: 'DG001', criteria: [{ key: 'xe', label: 'Chất lượng xe', score: 5 }, { key: 'taixe', label: 'Thái độ tài xế', score: 5 }] }),
      apiReview({ id: 'DG002', criteria: [{ key: 'xe', label: 'Chất lượng xe', score: 5 }, { key: 'taixe', label: 'Thái độ tài xế', score: 2 }] }),
      apiReview({ id: 'DG003', criteria: [{ key: 'xe', label: 'Chất lượng xe', score: null }, { key: 'taixe', label: 'Thái độ tài xế', score: 5 }] }),
    ]]);
    await page.load();
    page.setCategory('Chất lượng xe');
    expect(ids(page.filteredReviews)).toEqual(['DG001', 'DG002']);
    page.setCategory('Thái độ tài xế');
    expect(page.selectedCategories).toEqual(['Chất lượng xe', 'Thái độ tài xế']);
    expect(ids(page.filteredReviews)).toEqual(['DG001']);
    // Bấm lại thì bỏ chọn tiêu chí đó.
    page.setCategory('Chất lượng xe');
    expect(page.isCategorySelected('Chất lượng xe')).toBe(false);
    expect(ids(page.filteredReviews)).toEqual(['DG001', 'DG003']);
    page.setCategory('all');
    expect(page.selectedCategories).toEqual([]);
  });

  it('sorts by date, by stars and by how useful others found the review', async () => {
    const { page } = build([[
      apiReview({ id: 'CU', createdAt: '2026-01-01T00:00:00.000Z', rating: 5, helpfulCount: 1 }),
      apiReview({ id: 'MOI', createdAt: '2026-06-01T00:00:00.000Z', rating: 3, helpfulCount: 9 }),
    ]]);
    await page.load();
    expect(ids(page.filteredReviews)).toEqual(['MOI', 'CU']);
    page.selectedSort = 'oldest';
    expect(ids(page.filteredReviews)).toEqual(['CU', 'MOI']);
    page.selectedSort = 'rating_high';
    expect(ids(page.filteredReviews)).toEqual(['CU', 'MOI']);
    page.selectedSort = 'rating_low';
    expect(ids(page.filteredReviews)).toEqual(['MOI', 'CU']);
    page.selectedSort = 'helpful';
    expect(ids(page.filteredReviews)).toEqual(['MOI', 'CU']);
  });

  it('puts the customer back on the first page whenever the filters change', async () => {
    const { page } = build([Array.from({ length: 12 }, (_, i) => apiReview({ id: `DG${i}` }))]);
    await page.load();
    page.currentPage = 3;
    page.onFilterChange();
    expect(page.currentPage).toBe(1);
    page.currentPage = 3;
    page.setActiveTab('all');
    expect(page.currentPage).toBe(1);
  });

  it('clears every filter at once back to the opening view', async () => {
    const { page } = build();
    await page.load();
    Object.assign(page, {
      activeTab: 'has_image', selectedRating: '2', selectedBusType: 'Limousine 9 chỗ',
      selectedRoute: 'TP.HCM - Đà Lạt', searchKeyword: 'xe', selectedCategories: ['Chất lượng xe'],
      selectedSort: 'oldest', currentPage: 4,
    });
    page.clearFilters();
    expect(page.activeTab).toBe('all');
    expect(page.selectedRating).toBe('all');
    expect(page.selectedBusType).toBe('all');
    expect(page.selectedRoute).toBe('all');
    expect(page.searchKeyword).toBe('');
    expect(page.selectedCategories).toEqual([]);
    expect(page.selectedSort).toBe('newest');
    expect(page.currentPage).toBe(1);
  });

  it('shows five reviews a page and counts the pages of what is left after filtering', async () => {
    const { page } = build([Array.from({ length: 12 }, (_, i) => apiReview({ id: `DG${String(i).padStart(2, '0')}`, rating: i < 7 ? 5 : 3 }))]);
    await page.load();
    expect(page.totalPages).toBe(3);
    expect(ids(page.paginatedReviews)).toHaveLength(5);
    page.setPage(3);
    expect(ids(page.paginatedReviews)).toEqual(['DG10', 'DG11']);
    page.selectedRating = '3';
    page.resetPagination();
    expect(page.totalPages).toBe(1);
    expect(ids(page.paginatedReviews)).toHaveLength(5);
  });

  it('always offers at least one page even with nothing to show', async () => {
    const { page } = build([[]]);
    await page.load();
    expect(page.totalPages).toBe(1);
    expect(page.paginatedReviews).toEqual([]);
    expect(page.displayedPages).toEqual([1]);
  });

  it('refuses to page outside what exists and ignores the ellipsis', async () => {
    const { page } = build([Array.from({ length: 7 }, (_, i) => apiReview({ id: `DG${i}` }))]);
    await page.load();
    page.setPage(0);
    page.setPage(9);
    page.setPage('...');
    expect(page.currentPage).toBe(1);
    page.setPage(2);
    expect(page.currentPage).toBe(2);
  });

  it('shortens a long list of pages around the one being read', async () => {
    const { page } = build([Array.from({ length: 50 }, (_, i) => apiReview({ id: `DG${i}` }))]);
    await page.load();
    expect(page.totalPages).toBe(10);
    page.currentPage = 1;
    expect(page.displayedPages).toEqual([1, 2, 3, 4, 5, '...', 10]);
    page.currentPage = 6;
    expect(page.displayedPages).toEqual([1, '...', 5, 6, 7, '...', 10]);
    page.currentPage = 9;
    expect(page.displayedPages).toEqual([1, '...', 6, 7, 8, 9, 10]);
  });

  it('records a useful vote and takes it back when tapped again', async () => {
    const { page, calls } = build();
    await page.load();
    const review = page.reviewsData[0];
    await page.toggleHelpful(review);
    expect(calls.at(-1)).toEqual({ path: 'customer/reviews/DG001/helpful', method: 'POST' });
    expect(review.helpfulCount).toBe(4);
    expect(review.isHelpfulClicked).toBe(true);
    await page.toggleHelpful(review);
    expect(calls.at(-1)!.method).toBe('DELETE');
    expect(review.helpfulCount).toBe(3);
    expect(review.isHelpfulClicked).toBe(false);
  });

  it('leaves the count alone when the vote cannot be recorded', async () => {
    const { page } = build([[apiReview()]], { helpful: 'LOI' });
    await page.load();
    const review = page.reviewsData[0];
    await page.toggleHelpful(review);
    expect(review.helpfulCount).toBe(3);
    expect(review.isHelpfulClicked).toBe(false);
  });

  it('opens a photo on its own and closes it again', async () => {
    const { page } = build();
    await page.load();
    page.openImageModal('https://viago.vn/dg1.jpg');
    expect(page.activeImageModal).toBe('https://viago.vn/dg1.jpg');
    page.closeImageModal();
    expect(page.activeImageModal).toBeNull();
  });
});
