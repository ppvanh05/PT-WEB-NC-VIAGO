import { Component, ElementRef, OnInit, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { AccountsApiService } from '../../../core/services/accounts-api.service';
import { ToastService } from '../../../core/services/toast.service';

export interface CriterionRating {
  key?: string;
  name: string;
  score: number;
  maxScore: number;
}

export interface ReviewReply {
  author: string;
  date: string;
  content: string;
}

export interface ReviewItem {
  id: string;
  authorName: string;
  avatarColor: string;
  avatarInitials: string;
  verifiedTrip: boolean;
  date: string;
  /** ISO, dùng để sắp xếp mới/cũ */
  createdAt: string;
  rating: number; // 1-5
  content: string;
  busType: string;
  route: string;
  /** Điểm từng tiêu chí theo tên hiển thị, dùng cho bộ lọc tiêu chí */
  criteriaScores: Record<string, number | null>;
  hasImages: boolean;
  images?: string[];
  helpfulCount: number;
  isHelpfulClicked?: boolean;
  reply?: ReviewReply;
}

/** Dữ liệu trả về từ GET /customer/reviews (backend customer/reviews). */
interface ApiReview {
  id: string;
  authorName: string;
  authorInitials: string;
  verifiedTrip: boolean;
  createdAt: string;
  rating: number;
  content: string;
  vehicleType: string;
  route: { id: string; label: string };
  criteria: { key: string; label: string; score: number | null }[];
  media: { url: string; type: 'Anh' | 'Video' }[];
  helpfulCount: number;
  isHelpful: boolean;
  reply: { author: string; createdAt: string | null; content: string } | null;
}
interface ApiSummary {
  averageRating: number | null;
  total: number;
  withComment: number;
  withMedia: number;
  criteria: { key: string; label: string; score: number | null; maxScore: number }[];
}
interface ApiOptions {
  vehicleTypes: { value: string; label: string }[];
  routes: { value: string; label: string }[];
}

const AVATAR_COLORS = ['#e91e63', '#3f51b5', '#10b981', '#f59e0b', '#0284c7', '#8b5cf6', '#06b6d4', '#ef4444'];
const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }) : '';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './reviews.html',
  styleUrl: './reviews.css',
})
export class Reviews implements OnInit {
  @ViewChild('topFilterSection') topFilterSectionRef!: ElementRef;
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly accountsApi = inject(AccountsApiService);
  /** App chạy không có zone.js: gọi API xong thì báo Angular vẽ lại giao diện. */
  private readonly api = {
    request: <T>(...args: Parameters<AccountsApiService['request']>): Promise<T> =>
      this.accountsApi.request<T>(...args).finally(() => this.cdr.markForCheck()),
  };
  private readonly toast = inject(ToastService);

  // Thống kê lấy từ GET /customer/reviews/summary
  overallRating = 0;
  maxRating = 5;
  totalReviewsCount = 0;
  hasCommentsCount = 0;
  hasImagesCount = 0;
  loading = true;
  loadError = '';

  criteriaList: CriterionRating[] = [];

  // Filters state
  activeTab: 'all' | 'has_comment' | 'has_image' = 'all';
  selectedRating: string = 'all';
  selectedBusType: string = 'all';
  selectedRoute: string = 'all';
  searchKeyword: string = '';
  /** Các tiêu chí đang chọn (chọn nhiều); rỗng = tất cả. Đánh giá phải đạt ≥ 4 điểm ở MỌI tiêu chí đã chọn. */
  selectedCategories: string[] = [];
  selectedSort: string = 'newest';

  // Mobile filter toggle
  isFilterExpanded: boolean = false;

  // Modal Image Preview
  activeImageModal: string | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;

  reviewsData: ReviewItem[] = [];

  // Danh sách lọc lấy từ GET /customer/reviews/options
  busTypeOptions: string[] = [];
  routeOptions: string[] = [];

  ngOnInit(): void {
    void this.load();
  }

  /** Tải thống kê, bộ lọc và toàn bộ đánh giá đang hiển thị; lọc/sắp xếp làm trên trình duyệt. */
  async load(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      const [summary, options, reviews] = await Promise.all([
        this.api.request<ApiSummary>('customer/reviews/summary'),
        this.api.request<ApiOptions>('customer/reviews/options'),
        this.loadAllReviews(),
      ]);
      this.overallRating = summary.averageRating ?? 0;
      this.totalReviewsCount = summary.total;
      this.hasCommentsCount = summary.withComment;
      this.hasImagesCount = summary.withMedia;
      this.criteriaList = summary.criteria.map(c => ({ key: c.key, name: c.label, score: c.score ?? 0, maxScore: c.maxScore }));
      this.busTypeOptions = options.vehicleTypes.map(v => v.label);
      this.routeOptions = options.routes.map(r => r.label);
      this.reviewsData = reviews.map((r, index) => this.toItem(r, index));
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : 'Không tải được đánh giá.';
    } finally {
      this.loading = false;
    }
  }

  private async loadAllReviews(): Promise<ApiReview[]> {
    const rows: ApiReview[] = [];
    for (let page = 1; ; page++) {
      const result = await this.api.request<{ items: ApiReview[]; pagination: { totalPages: number } }>(
        `customer/reviews?page=${page}&pageSize=100&sort=newest`,
      );
      rows.push(...result.items);
      if (page >= result.pagination.totalPages || !result.items.length) return rows;
    }
  }

  private toItem(r: ApiReview, index: number): ReviewItem {
    const images = r.media.filter(m => m.type === 'Anh').map(m => m.url);
    return {
      id: r.id,
      authorName: r.authorName,
      avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
      avatarInitials: r.authorInitials,
      verifiedTrip: r.verifiedTrip,
      date: formatDate(r.createdAt),
      createdAt: r.createdAt,
      rating: r.rating,
      content: r.content,
      busType: r.vehicleType,
      route: r.route.label,
      criteriaScores: Object.fromEntries(r.criteria.map(c => [c.label, c.score])),
      hasImages: images.length > 0,
      images,
      helpfulCount: r.helpfulCount,
      isHelpfulClicked: r.isHelpful,
      reply: r.reply ? { author: r.reply.author, date: formatDate(r.reply.createdAt), content: r.reply.content } : undefined,
    };
  }

  get filteredReviews(): ReviewItem[] {
    return this.reviewsData.filter(item => {
      // Tab filter
      if (this.activeTab === 'has_comment' && !item.content?.trim()) {
        return false;
      }
      if (this.activeTab === 'has_image' && (!item.hasImages || !item.images?.length)) {
        return false;
      }

      // Rating filter
      if (this.selectedRating !== 'all' && item.rating !== parseInt(this.selectedRating, 10)) {
        return false;
      }

      // Bus Type filter
      if (this.selectedBusType !== 'all' && item.busType !== this.selectedBusType) {
        return false;
      }

      // Route filter
      if (this.selectedRoute !== 'all' && item.route !== this.selectedRoute) {
        return false;
      }

      // Category filter
      if (this.selectedCategories.some(cat => (item.criteriaScores[cat] ?? 0) < 4)) {
        return false;
      }

      // Search keyword filter
      if (this.searchKeyword.trim()) {
        const kw = this.searchKeyword.toLowerCase().trim();
        const matchName = item.authorName.toLowerCase().includes(kw);
        const matchContent = item.content.toLowerCase().includes(kw);
        const matchRoute = item.route.toLowerCase().includes(kw);
        const matchBus = item.busType.toLowerCase().includes(kw);
        if (!matchName && !matchContent && !matchRoute && !matchBus) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (this.selectedSort === 'newest') {
        return b.createdAt.localeCompare(a.createdAt);
      } else if (this.selectedSort === 'oldest') {
        return a.createdAt.localeCompare(b.createdAt);
      } else if (this.selectedSort === 'rating_high') {
        return b.rating - a.rating;
      } else if (this.selectedSort === 'rating_low') {
        return a.rating - b.rating;
      } else if (this.selectedSort === 'helpful') {
        return b.helpfulCount - a.helpfulCount;
      }
      return 0;
    });
  }

  get paginatedReviews(): ReviewItem[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredReviews.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredReviews.length / this.pageSize) || 1;
  }

  get displayedPages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    } else if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    } else {
      return [1, '...', current - 1, current, current + 1, '...', total];
    }
  }

  setActiveTab(tab: 'all' | 'has_comment' | 'has_image'): void {
    this.activeTab = tab;
    this.resetPagination();
  }

  /** 'all' bỏ chọn hết; tiêu chí khác thì bật/tắt trong danh sách đang chọn. */
  setCategory(cat: string): void {
    if (cat === 'all') {
      this.selectedCategories = [];
    } else if (this.selectedCategories.includes(cat)) {
      this.selectedCategories = this.selectedCategories.filter(c => c !== cat);
    } else {
      this.selectedCategories = [...this.selectedCategories, cat];
    }
    this.resetPagination();
  }

  isCategorySelected(cat: string): boolean {
    return this.selectedCategories.includes(cat);
  }

  clearFilters(): void {
    this.activeTab = 'all';
    this.selectedRating = 'all';
    this.selectedBusType = 'all';
    this.selectedRoute = 'all';
    this.searchKeyword = '';
    this.selectedCategories = [];
    this.selectedSort = 'newest';
    this.resetPagination();
  }

  onFilterChange(): void {
    this.resetPagination();
  }

  resetPagination(): void {
    this.currentPage = 1;
  }

  setPage(page: number | string): void {
    if (typeof page !== 'number') return;
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.scrollToTopFilter();
  }

  scrollToTopFilter(): void {
    if (this.topFilterSectionRef && this.topFilterSectionRef.nativeElement) {
      this.topFilterSectionRef.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    } else {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  }

  /** Bấm/bỏ "Hữu ích": lưu vào DB, mỗi trình duyệt chỉ tính một lượt. */
  async toggleHelpful(review: ReviewItem): Promise<void> {
    const on = !review.isHelpfulClicked;
    try {
      const result = await this.api.request<{ helpfulCount: number; isHelpful: boolean }>(
        `customer/reviews/${encodeURIComponent(review.id)}/helpful`,
        on ? 'POST' : 'DELETE',
      );
      review.helpfulCount = result.helpfulCount;
      review.isHelpfulClicked = result.isHelpful;
    } catch (error) {
      this.toast.showError(error instanceof Error ? error.message : 'Không ghi nhận được lượt hữu ích.');
    }
  }

  openImageModal(imgUrl: string): void {
    this.activeImageModal = imgUrl;
  }

  closeImageModal(): void {
    this.activeImageModal = null;
  }
}
