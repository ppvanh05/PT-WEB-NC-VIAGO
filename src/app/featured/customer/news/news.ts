import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NewsItem, NewsService } from '../../../core/services/news.service';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Toast, ToastVariant } from '../../../shared/components/toast/toast';

type Category = 'all' | 'news' | 'promotion' | 'guide' | 'event' | 'recruitment';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination, Toast],
  templateUrl: './news.html',
  styleUrl: './news.css',
})
export class News implements OnInit {
  toast = signal<{ message: string; variant: ToastVariant } | null>(null);
  activeCategory: Category = 'all';
  selectedCategory: Category = 'all';
  searchTerm = '';
  selectedTime = 'all';
  selectedSort = 'newest';
  currentPage = 1;
  pageSize = 12;
  shareUrl = '';
  showShareModal = false;
  email = '';
  categories = [
    { id: 'all' as Category, key: 'all' as Category, name: 'Tin tức tổng hợp', label: 'Tin tức tổng hợp', icon: 'bi bi-grid-fill' },
    { id: 'news' as Category, key: 'news' as Category, name: 'Tin tức nhà xe', label: 'Tin tức nhà xe', icon: 'bi bi-bus-front-fill' },
    { id: 'promotion' as Category, key: 'promotion' as Category, name: 'Khuyến mãi', label: 'Khuyến mãi', icon: 'bi bi-tag-fill' },
    { id: 'guide' as Category, key: 'guide' as Category, name: 'Cẩm nang di chuyển', label: 'Cẩm nang di chuyển', icon: 'bi bi-compass-fill' },
    { id: 'event' as Category, key: 'event' as Category, name: 'Sự kiện', label: 'Sự kiện', icon: 'bi bi-calendar-event-fill' },
    { id: 'recruitment' as Category, key: 'recruitment' as Category, name: 'Tuyển dụng', label: 'Tuyển dụng', icon: 'bi bi-briefcase-fill' },
  ];
  featuredData: { main?: NewsItem; grid: NewsItem[]; subHighlight?: NewsItem; subGrid: NewsItem[] } = { grid: [], subGrid: [] };
  filteredArticles: NewsItem[] = [];

  constructor(private newsService: NewsService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.updatePageSize();
    this.route.queryParams.subscribe(params => {
      const category = params['category'] as Category;
      this.selectedCategory = this.categories.some(c => c.id === category) ? category : 'all';
      this.activeCategory = this.selectedCategory;
      this.searchTerm = params['search'] || params['q'] || '';
      this.refresh();
    });
  }

  @HostListener('window:resize') onResize(): void { this.updatePageSize(); }
  updatePageSize(): void { this.pageSize = window.innerWidth <= 640 ? 4 : window.innerWidth <= 1024 ? 8 : 12; }
  refresh(): void { this.featuredData = this.newsService.getFeaturedNews(this.selectedCategory); this.loadArticles(); }
  loadArticles(): void { this.filteredArticles = this.newsService.getNewsListFiltered(this.selectedCategory, this.searchTerm, this.selectedTime, this.selectedSort); }
  setCategory(category: Category): void { this.onCategoryChange(category); }
  onCategoryChange(category: Category): void { this.selectedCategory = this.activeCategory = category; this.currentPage = 1; this.refresh(); this.router.navigate([], { relativeTo: this.route, queryParams: category === 'all' ? {} : { category }, queryParamsHandling: '' }); }
  onFilterChange(): void { this.currentPage = 1; this.loadArticles(); }
  clearSearch(): void { this.searchTerm = ''; this.onFilterChange(); }
  onImageError(event: Event): void { (event.target as HTMLImageElement).src = '/assets/customer/logo.png'; }
  get paginatedArticles(): NewsItem[] { const start = (this.currentPage - 1) * this.pageSize; return this.filteredArticles.slice(start, start + this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredArticles.length / this.pageSize)); }
  get firstItem(): number { return this.filteredArticles.length ? (this.currentPage - 1) * this.pageSize + 1 : 0; }
  get lastItem(): number { return Math.min(this.currentPage * this.pageSize, this.filteredArticles.length); }
  get displayedPages(): (number | string)[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get sectionTitle(): string { const cat = this.categories.find(c => c.id === this.selectedCategory); return this.searchTerm ? 'KẾT QUẢ TÌM KIẾM' : (cat?.label || 'DANH SÁCH BÀI VIẾT').toUpperCase(); }
  setPage(page: number | string): void { if (typeof page === 'number' && page >= 1 && page <= this.totalPages) this.currentPage = page; }
  goToDetail(id?: string): void { if (id) this.router.navigate(['/customer/tin-tuc', id]); }
  copyLink(): void { navigator.clipboard?.writeText(this.shareUrl).then(() => this.toast.set({ message: 'Đã sao chép liên kết.', variant: 'success' })); }
}
