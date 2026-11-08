import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface FaqItem {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  categoryName?: string;
  updatedAt?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './faq.html',
  styleUrls: ['../../customer-pages.css', './faq.css', '../../customer-page-theme.css'],
})
export class Faq implements OnInit, OnDestroy {
  loading = true;
  loadError = '';
  lastUpdated = '';
  private readonly abort = new AbortController();
  searchQuery: string = '';
  selectedSearchCategory: string | null = null;
  activeSection: string = 'booking';
  openIndex: number | null = null;

  categories: Category[] = [
    {
      id: 'booking',
      name: 'Đặt vé',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>',
    },
    {
      id: 'payment',
      name: 'Thanh toán',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    },
    {
      id: 'refund',
      name: 'Hủy vé & Hoàn tiền',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    },
    {
      id: 'info',
      name: 'Thông tin chuyến đi',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    },
    {
      id: 'member',
      name: 'Tài khoản thành viên',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    },
    {
      id: 'support',
      name: 'Hỗ trợ khách hàng',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    },
  ];

  faqs: FaqItem[] = [];

  filteredFaqs: FaqItem[] = [];

  constructor(private readonly cdr: ChangeDetectorRef) {}
  ngOnInit() {
    void this.loadFaqs();
  }
  ngOnDestroy() {
    this.abort.abort();
  }
  async loadFaqs() {
    this.loading = true;
    this.loadError = '';
    try {
      const items: FaqItem[] = [];
      let pages = 1;
      for (let page = 1; page <= pages; page++) {
        const response = await fetch(`/customer/about/faq?pageSize=100&page=${page}`, {
          signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(15000)]),
        });
        if (!response.ok) throw new Error('FAQ unavailable');
        const body = (await response.json()) as {
          data: FaqItem[];
          pagination: { totalPages: number };
        };
        if (
          !Array.isArray(body.data) ||
          !Number.isInteger(body.pagination?.totalPages) ||
          body.pagination.totalPages > 10
        )
          throw new Error('Invalid FAQ response');
        pages = body.pagination.totalPages;
        items.push(...body.data);
      }
      this.faqs = items;
      const updates = items.map((item) => Date.parse(item.updatedAt || '')).filter(Number.isFinite);
      this.lastUpdated = updates.length
        ? new Date(Math.max(...updates)).toLocaleDateString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
          })
        : '';
      for (const item of items) {
        if (!this.categories.some((category) => category.id === item.categoryId))
          this.categories.push({
            id: item.categoryId,
            name: item.categoryName || item.categoryId,
            icon: '',
          });
      }
      this.updateFilteredFaqs();
      const fragment = window.location.hash.slice(1);
      const selected = items.find((item) => 'faq-' + encodeURIComponent(item.id) === fragment);
      if (selected) {
        this.activeSection = selected.categoryId;
        this.openIndex = this.getGlobalIndex(
          this.getFaqsByCategory(selected.categoryId).findIndex((item) => item.id === selected.id),
          selected.categoryId,
        );
        setTimeout(
          () => document.getElementById('faq-' + selected.id)?.scrollIntoView({ block: 'center' }),
          0,
        );
      }
    } catch {
      if (!this.abort.signal.aborted)
        this.loadError = 'Chưa tải được câu hỏi thường gặp. Vui lòng thử lại.';
    } finally {
      if (!this.abort.signal.aborted) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }
  }

  scrollToSection(sectionId: string) {
    this.activeSection = sectionId;
    this.searchQuery = '';
    this.selectedSearchCategory = null;
    this.updateFilteredFaqs();

    // Use setTimeout to ensure the DOM is updated if filtering changed
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }

  getFaqsByCategory(categoryId: string): FaqItem[] {
    if (this.selectedSearchCategory && this.selectedSearchCategory !== categoryId) {
      return [];
    }
    if (this.searchQuery && !this.selectedSearchCategory) {
      return this.faqs.filter(
        (f) =>
          f.categoryId === categoryId &&
          (f.question.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            f.answer.toLowerCase().includes(this.searchQuery.toLowerCase())),
      );
    }
    return this.faqs.filter((f) => f.categoryId === categoryId);
  }

  toggleAccordion(index: number, categoryId: string) {
    const globalIndex = this.getGlobalIndex(index, categoryId);
    this.openIndex = this.openIndex === globalIndex ? null : globalIndex;
  }

  getGlobalIndex(index: number, categoryId: string): number {
    // This is a simple way to create a unique ID for accordion state
    let count = 0;
    for (const cat of this.categories) {
      if (cat.id === categoryId) break;
      count += this.getFaqsByCategory(cat.id).length;
    }
    return count + index;
  }

  isAccordionOpen(index: number, categoryId: string): boolean {
    return this.openIndex === this.getGlobalIndex(index, categoryId);
  }

  onSearch() {
    this.selectedSearchCategory = null;
    this.updateFilteredFaqs();
  }

  updateFilteredFaqs() {
    if (this.selectedSearchCategory) {
      this.filteredFaqs = this.faqs.filter(
        (item) => item.categoryId === this.selectedSearchCategory,
      );
      return;
    }
    if (!this.searchQuery) {
      this.filteredFaqs = [...this.faqs];
      return;
    }
    const query = this.searchQuery.toLowerCase();
    this.filteredFaqs = this.faqs.filter(
      (item) =>
        item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query),
    );
  }

  setSearch(text: string, categoryId: string) {
    this.searchQuery = text;
    this.selectedSearchCategory = categoryId;
    this.updateFilteredFaqs();
  }
}
