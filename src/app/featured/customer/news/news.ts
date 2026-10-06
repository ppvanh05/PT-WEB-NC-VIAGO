import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ARTICLES, Article, ArticleCategory, JobType, ROUTES } from './news-data';

type TimeFilter = 'all' | 'today' | 'week' | 'month';
type SortOrder = 'newest' | 'oldest';
import { Pagination } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Pagination],
  templateUrl: './news.html',
  styleUrls: ['../customer-pages.css', './news.css', '../customer-page-theme.css'],
})
export class News implements OnInit {
  activeCategory: ArticleCategory | 'all' = 'all';
  searchTerm = '';
  timeFilter: TimeFilter = 'all';
  sortOrder: SortOrder = 'newest';
  selectedRoute = 'all';
  jobType: JobType | 'all' = 'all';
  useFavoriteRoute = false;
  favoriteRoute = 'TP.HCM - Đà Lạt';
  email = '';

  // Share modal state
  showShareModal = false;
  shareUrl = '';

  categories = [
    { key: 'all', name: 'Tất cả' },
    { key: 'tin-nha-xe', name: 'Tin tức nhà xe' },
    { key: 'khuyen-mai', name: 'Khuyến mãi' },
    { key: 'cam-nang', name: 'Cẩm nang di chuyển' },
    { key: 'su-kien', name: 'Sự kiện' },
    { key: 'tuyen-dung', name: 'Tuyển dụng' },
  ] as const;

  routes = ROUTES;
  articles: Article[] = ARTICLES;
  filteredArticles: Article[] = [];
  paginatedArticles: Article[] = [];
  featuredArticle?: Article;
  rightSideArticles: Article[] = [];
  bottomFocusArticles: Article[] = [];
  relatedPreview: Article[] = [];
  bookmarkedIds = new Set<number>();
  subscribed = false;

  currentPage = 1;
  pageSize = 8;
  totalPages = 1;
  pagesArray: number[] = [];

  ngOnInit() {
    this.applyFilters();
  }

  setCategory(categoryKey: ArticleCategory | 'all') {
    this.activeCategory = categoryKey;
    this.currentPage = 1;
    this.selectedRoute = 'all';
    this.jobType = 'all';
    this.applyFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  applyFilters() {
    const query = this.searchTerm.trim().toLowerCase();
    const routeFilter = this.useFavoriteRoute ? this.favoriteRoute : this.selectedRoute;
    const now = new Date(2026, 5, 27);

    let filtered = this.articles.filter((article) => {
      const matchesCategory = this.activeCategory === 'all' || article.categoryKey === this.activeCategory;
      const haystack = `${article.title} ${article.category} ${article.excerpt} ${article.route ?? ''}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesRoute =
        !['khuyen-mai', 'cam-nang'].includes(this.activeCategory) ||
        routeFilter === 'all' ||
        article.route === routeFilter;
      const matchesJob = this.activeCategory !== 'tuyen-dung' || this.jobType === 'all' || article.jobType === this.jobType;
      const matchesTime = this.matchesTimeFilter(article.date, now);

      return matchesCategory && matchesSearch && matchesRoute && matchesJob && matchesTime;
    });

    filtered = filtered.sort((a, b) => {
      const dateA = this.parseDate(a.date).getTime();
      const dateB = this.parseDate(b.date).getTime();
      return this.sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    this.filteredArticles = filtered;
    this.featuredArticle = filtered.find((article) => article.id === 1) ?? filtered[0];
    
    const remaining = filtered.filter((article) => article.id !== this.featuredArticle?.id);
    this.rightSideArticles = remaining.slice(0, 4);
    this.bottomFocusArticles = remaining.slice(4, 7);

    if (this.rightSideArticles.length < 4) {
      const extra = this.articles.filter(a => a.id !== this.featuredArticle?.id && !this.rightSideArticles.includes(a));
      this.rightSideArticles = [...this.rightSideArticles, ...extra].slice(0, 4);
    }
    if (this.bottomFocusArticles.length < 3) {
      const extra = this.articles.filter(a => a.id !== this.featuredArticle?.id && !this.rightSideArticles.includes(a) && !this.bottomFocusArticles.includes(a));
      this.bottomFocusArticles = [...this.bottomFocusArticles, ...extra].slice(0, 3);
    }

    this.pageSize = this.getPageSize();
    this.totalPages = Math.max(1, Math.ceil(this.filteredArticles.length / this.pageSize));
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedArticles();
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedArticles();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  updatePaginatedArticles() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedArticles = this.filteredArticles.slice(startIndex, startIndex + this.pageSize);
  }

  toggleBookmark(articleId: number) {
    if (this.bookmarkedIds.has(articleId)) {
      this.bookmarkedIds.delete(articleId);
      return;
    }
    this.bookmarkedIds.add(articleId);
  }

  copyShareLink(article: Article) {
    this.shareUrl = `${window.location.origin}/tin-tuc/chi-tiet/${article.id}`;
    this.showShareModal = true;
  }

  copyLink() {
    navigator.clipboard.writeText(this.shareUrl).then(() => {
      window.alert('Đã sao chép liên kết vào bộ nhớ tạm!');
      this.showShareModal = false;
    }).catch(() => {
      window.alert('Không thể sao chép liên kết.');
    });
  }

  subscribe() {
    this.subscribed = Boolean(this.email.trim());
  }

  getCategoryName(key: ArticleCategory | 'all'): string {
    return this.categories.find((category) => category.key === key)?.name ?? '';
  }

  getCardMeta(article: Article): string {
    return `${article.date} • ${article.author}`;
  }

  private getPageSize(): number {
    switch (this.activeCategory) {
      case 'khuyen-mai':
        return 12;
      case 'tuyen-dung':
        return 6;
      case 'cam-nang':
      case 'su-kien':
        return 8;
      default:
        return 8;
    }
  }

  private matchesTimeFilter(dateText: string, now: Date): boolean {
    if (this.timeFilter === 'all') {
      return true;
    }

    const articleDate = this.parseDate(dateText);
    const diffDays = Math.floor((now.getTime() - articleDate.getTime()) / 86400000);

    if (this.timeFilter === 'today') {
      return diffDays === 0;
    }
    if (this.timeFilter === 'week') {
      return diffDays >= 0 && diffDays <= 7;
    }
    return diffDays >= 0 && diffDays <= 31;
  }

  private parseDate(dateText: string): Date {
    const [day, month, year] = dateText.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
}
