import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NewsService, NewsItem } from '../../../core/services/news.service';
import { Pagination } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './news.html',
  styleUrl: './news.css',
})
export class News implements OnInit {
  categories = [
    { id: 'all', label: 'Tin tức tổng hợp', icon: 'bi bi-grid-fill' },
    { id: 'news', label: 'Tin tức nhà xe', icon: 'bi bi-bus-front-fill' },
    { id: 'promotion', label: 'Khuyến mãi', icon: 'bi bi-tag-fill' },
    { id: 'guide', label: 'Cẩm nang di chuyển', icon: 'bi bi-compass-fill' },
    { id: 'event', label: 'Sự kiện', icon: 'bi bi-calendar-event-fill' },
    { id: 'recruitment', label: 'Tuyển dụng', icon: 'bi bi-briefcase-fill' }
  ];

  selectedCategory = 'all';
  searchTerm = '';
  selectedTime = 'all';
  selectedSort = 'newest';

  currentPage = 1;
  pageSize = 12;

  featuredData: {
    main?: NewsItem;
    grid: NewsItem[];
    subHighlight?: NewsItem;
    subGrid: NewsItem[];
  } = { grid: [], subGrid: [] };

  filteredArticles: NewsItem[] = [];

  constructor(
    private newsService: NewsService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('window:resize')
  onResize() {
    this.updatePageSize();
  }

  updatePageSize() {
    const width = window.innerWidth;
    let newPageSize = 12;
    
    if (width <= 640) {
      newPageSize = 4; // Mobile: 4 items (4 rows)
    } else if (width <= 1024) {
      newPageSize = 8; // Tablet: 8 items (4 rows x 2 cols)
    } else {
      newPageSize = 12; // Desktop: 12 items (4 rows x 3 cols)
    }

    if (this.pageSize !== newPageSize) {
      this.pageSize = newPageSize;
      if (this.currentPage > this.totalPages) {
        this.currentPage = Math.max(1, this.totalPages);
      }
      this.cdr.detectChanges(); // Force UI update immediately
    }
  }

  ngOnInit(): void {
    this.updatePageSize();
    this.route.queryParams.subscribe(params => {
      const catParam = params['category'];
      if (catParam && this.categories.some(c => c.id === catParam)) {
        this.selectedCategory = catParam;
      } else {
        this.selectedCategory = 'all';
      }
      const searchParam = params['search'] || params['q'];
      if (searchParam) {
        this.searchTerm = searchParam;
      }
      this.featuredData = this.newsService.getFeaturedNews(this.selectedCategory);
      this.loadArticles();
      window.scrollTo(0, 0);
    });
  }

  onCategoryChange(catId: string): void {
    this.selectedCategory = catId;
    this.currentPage = 1;
    this.featuredData = this.newsService.getFeaturedNews(catId);
    this.loadArticles();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: catId === 'all' ? {} : { category: catId },
      queryParamsHandling: ''
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800';
    }
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadArticles();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onFilterChange();
  }

  loadArticles(): void {
    this.filteredArticles = this.newsService.getNewsListFiltered(
      this.selectedCategory,
      this.searchTerm,
      this.selectedTime,
      this.selectedSort
    );
  }

  get paginatedArticles(): NewsItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredArticles.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredArticles.length / this.pageSize) || 1;
  }

  get firstItem(): number {
    if (this.filteredArticles.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get lastItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredArticles.length);
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

  get sectionTitle(): string {
    if (this.searchTerm.trim()) {
      return `KẾT QUẢ TÌM KIẾM CHO "${this.searchTerm.trim().toUpperCase()}"`;
    }
    const cat = this.categories.find(c => c.id === this.selectedCategory);
    if (this.selectedCategory === 'all') return 'DANH SÁCH BÀI VIẾT';
    return (cat ? cat.label : 'DANH SÁCH BÀI VIẾT').toUpperCase();
  }

  setPage(page: number | string): void {
    if (typeof page !== 'number') return;
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;

    setTimeout(() => {
      const sectionEl = document.getElementById('all-news-section');
      if (sectionEl) {
        const navbarOffset = 100;
        const y = sectionEl.getBoundingClientRect().top + window.pageYOffset - navbarOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }
    }, 50);
  }

  goToDetail(id?: string): void {
    if (!id) return;
    this.router.navigate(['/customer/tin-tuc', id]);
  }
}
