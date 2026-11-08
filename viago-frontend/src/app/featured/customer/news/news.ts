import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FeaturedNews,
  NewsCategory,
  NewsItem,
  NewsService,
} from '../../../core/services/news.service';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Toast, ToastVariant } from '../../../shared/components/toast/toast';
import { Card } from '../../../shared/components/card/card';
import { Button } from '../../../shared/components/button/button';
@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination, Toast, Card, Button],
  templateUrl: './news.html',
  styleUrl: './news.css',
})
export class News implements OnInit {
  private readonly api = inject(NewsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy = inject(DestroyRef);
  private readonly abort = new AbortController();
  private version = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;
  toast = signal<{ message: string; variant: ToastVariant } | null>(null);
  selectedCategory: NewsCategory = 'all';
  activeCategory: NewsCategory = 'all';
  searchTerm = '';
  selectedTime = 'all';
  selectedSort = 'newest';
  currentPage = 1;
  pageSize = 12;
  categories: { id: NewsCategory; label: string; count: number }[] = [];
  featuredData: FeaturedNews = { grid: [], subGrid: [] };
  filteredArticles: NewsItem[] = [];
  totalItems = 0;
  loading = false;
  error = '';
  constructor() {
    this.destroy.onDestroy(() => {
      this.abort.abort();
      clearTimeout(this.searchTimer);
    });
  }
  ngOnInit() {
    this.updatePageSize();
    void this.loadCategories();
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      const allowed = ['all', 'news', 'promotion', 'guide', 'event', 'recruitment'];
      this.selectedCategory = allowed.includes(params['category']) ? params['category'] : 'all';
      this.activeCategory = this.selectedCategory;
      this.searchTerm = params['search'] || params['q'] || '';
      this.currentPage = 1;
      void this.refresh();
    });
  }
  async loadCategories() {
    try {
      this.categories = (await this.api.categories(this.abort.signal)).data;
    } catch (e) {
      if (!this.abort.signal.aborted) this.error = this.message(e);
    } finally {
      if (!this.abort.signal.aborted) this.cdr.markForCheck();
    }
  }
  @HostListener('window:resize') onResize() {
    const size = this.pageSize;
    this.updatePageSize();
    if (size !== this.pageSize) {
      this.currentPage = 1;
      void this.refresh();
    }
  }
  updatePageSize() {
    this.pageSize = window.innerWidth <= 640 ? 4 : window.innerWidth <= 1024 ? 8 : 12;
  }
  async refresh() {
    clearTimeout(this.searchTimer);
    const version = ++this.version;
    this.loading = true;
    this.error = '';
    try {
      const [list, featured] = await Promise.all([
        this.api.list(
          {
            category: this.selectedCategory,
            search: this.searchTerm.trim(),
            time: this.selectedTime,
            sort: this.selectedSort,
            page: this.currentPage,
            pageSize: this.pageSize,
          },
          this.abort.signal,
        ),
        this.api.featured(this.selectedCategory, this.abort.signal),
      ]);
      if (version !== this.version || this.abort.signal.aborted) return;
      this.filteredArticles = list.data;
      this.totalItems = list.pagination.total;
      this.featuredData = featured;
    } catch (e) {
      if (version === this.version && !this.abort.signal.aborted) {
        this.filteredArticles = [];
        this.featuredData = { grid: [], subGrid: [] };
        this.error = this.message(e);
      }
    } finally {
      if (version === this.version && !this.abort.signal.aborted) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }
  }
  loadArticles() {
    return this.refresh();
  }
  setCategory(category: NewsCategory) {
    return this.onCategoryChange(category);
  }
  onCategoryChange(category: NewsCategory) {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: category === 'all' ? {} : { category },
    });
  }
  onFilterChange() {
    clearTimeout(this.searchTimer);
    this.currentPage = 1;
    this.searchTimer = setTimeout(() => void this.refresh(), 250);
  }
  clearSearch() {
    this.searchTerm = '';
    this.currentPage = 1;
    void this.refresh();
  }
  onImageError(event: Event) {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/assets/customer/logo.png')) image.src = '/assets/customer/logo.png';
  }
  get paginatedArticles() {
    return this.filteredArticles;
  }
  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }
  get sectionTitle() {
    const cat = this.categories.find((c) => c.id === this.selectedCategory);
    return this.searchTerm
      ? 'KẾT QUẢ TÌM KIẾM'
      : (cat?.label || 'DANH SÁCH BÀI VIẾT').toUpperCase();
  }
  setPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages && !this.loading) {
      this.currentPage = page;
      void this.refresh();
    }
  }
  goToDetail(id?: string) {
    if (id) void this.router.navigate(['/customer/tin-tuc', id]);
  }
  private message(error: unknown) {
    return error instanceof Error ? error.message : 'Chưa tải được tin tức. Vui lòng thử lại.';
  }
}
