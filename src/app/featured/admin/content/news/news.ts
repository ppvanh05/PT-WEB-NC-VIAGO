import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../core/services/toast.service';
import { inject } from '@angular/core';
import { ARTICLES as CUSTOMER_ARTICLES } from '../../../customer/news/news-data';

interface Comment {
  author: string;
  date: string;
  content: string;
}

interface Article {
  id: string;
  tieuDe: string;
  moTa: string;
  loai: string;
  nguoiDang: string;
  ngayDang: string;
  trangThai: string;
  image: string;
  noiBat: boolean;
  comments: Comment[];
  tags?: string[];
}

interface CoverOption {
  url: string;
  label: string;
}

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './news.html',
  styleUrl: './news.css'
})
export class News implements OnInit {
  quillModules = {
    toolbar: '#quill-toolbar'
  };

  toastService = inject(ToastService);
  cdr = inject(ChangeDetectorRef);

  articles: Article[] = [];

  // Quick cover selection options
  coverOptions: CoverOption[] = [
    { url: 'asset/images/customer/xe.png', label: 'Xe khách hiện đại' },
    { url: 'asset/images/customer/tien_ich_1.jpg', label: 'Hành trình xe buýt' },
    { url: 'asset/images/customer/tien_ich_2.jpg', label: 'Vô lăng & Buồng lái' },
    { url: 'asset/images/customer/da_lat.jpg', label: 'Thắng cảnh thiên n...' },
    { url: 'asset/images/customer/nha_trang.jpg', label: 'Hoàng hôn rực rỡ' },
    { url: 'asset/images/customer/summer.jpg', label: 'Voucher & Khuyến...' }
  ];

  categories = ['Tin tức nhà xe', 'Khuyến mãi', 'Cẩm nang di chuyển', 'Sự kiện', 'Tuyển dụng'];

  // Search & Filter State
  searchText = '';
  currentTab = 'Tất cả';
  sortBy = 'newest';
  filterLoai = 'Tất cả';
  filterThoiGian = ''; // Empty string for month input

  // Comments State
  showCommentsModal = false;
  selectedArticleForComments: Article | null = null;

  // Modal Control States
  showCreateModal = false;
  showEditModal = false;
  showSuccessModal = false;

  // Header Preview Toggle
  showPreview = true;

  // Form fields for Create
  newArticleId = '';
  newArticleTitle = '';
  newArticleMoTa = '';
  newArticleCoverUrl = '';
  newArticleLoai = 'Tin tức nhà xe';
  newArticleNoiBat = false;
  newArticleTrangThai = 'Đang hiển thị';
  newArticleAuthor = 'Ban Vận Hành';
  newArticleContent = '';
  newArticleScheduleDate = '';
  newArticleScheduleTime = '';
  newArticleTags: string[] = [];
  newArticleTagInput = '';
  createFormSubmitted = false;

  // Edit Form fields (cloned object)
  editingArticle: Article | null = null;
  editingArticleContent = '';
  editingArticleScheduleDate = '';
  editingArticleScheduleTime = '';
  editingArticleTags: string[] = [];
  editingArticleTagInput = '';
  editFormSubmitted = false;

  get currentTime(): Date {
    return new Date();
  }

  // Success dialog fields
  successMessageTitle = '';
  successMessageBody = '';
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  // Pagination fields
  itemsPerPage = 10;
  currentPage = 1;

  // --- STATS GETTERS ---
  get totalNews(): number {
    return this.articles.length;
  }
  get totalActive(): number {
    return this.articles.filter(a => a.trangThai === 'Đang hiển thị').length;
  }
  get totalNhaXe(): number {
    return this.articles.filter(a => a.loai === 'Tin tức nhà xe').length;
  }
  get totalKhuyenMai(): number {
    return this.articles.filter(a => a.loai === 'Khuyến mãi').length;
  }
  get totalCamNang(): number {
    return this.articles.filter(a => a.loai === 'Cẩm nang di chuyển').length;
  }
  get totalSuKien(): number {
    return this.articles.filter(a => a.loai === 'Sự kiện').length;
  }
  get totalTuyenDung(): number {
    return this.articles.filter(a => a.loai === 'Tuyển dụng').length;
  }

  ngOnInit() {
    this.articles = CUSTOMER_ARTICLES.map(art => {
      // Determine loai (category)
      let loai = 'Tin tức nhà xe';
      if (art.categoryKey === 'khuyen-mai') loai = 'Khuyến mãi';
      else if (art.categoryKey === 'cam-nang') loai = 'Cẩm nang di chuyển';
      else if (art.categoryKey === 'su-kien') loai = 'Sự kiện';
      else if (art.categoryKey === 'tuyen-dung') loai = 'Tuyển dụng';

      // Determine trangThai (status)
      let trangThai = 'Đang hiển thị';
      if (art.id % 7 === 0) trangThai = 'Đã ẩn';
      else if (art.id % 11 === 0) trangThai = 'Lịch hẹn đăng';
      else if (art.id % 13 === 0) trangThai = 'Bản nháp';

      // Comments: let's add mock comments
      let commentsList: Comment[] = [];
      if (art.id === 1) {
        commentsList = [
          { author: 'Minh Quân', date: '28/06/2026', content: 'Bài viết rất hữu ích, giúp tôi biết thêm nhiều thông tin di chuyển bằng xe limousine.' },
          { author: 'Thu Trang', date: '27/06/2026', content: 'Dịch vụ của VIAGO đúng là chất lượng cao, rất mong chờ có thêm nhiều chuyến đi mới!' }
        ];
      } else if (art.id === 2) {
        commentsList = [
          { author: 'Nguyễn Văn Hùng', date: '29/06/2026', content: 'Tôi vừa đặt thử vé, rất nhanh và tiện lợi!' }
        ];
      }

      return {
        id: 'TT' + String(art.id).padStart(5, '0'),
        tieuDe: art.title,
        moTa: art.excerpt,
        loai: loai,
        nguoiDang: art.author,
        ngayDang: art.date,
        trangThai: trangThai,
        image: art.imageUrl,
        noiBat: art.isFeatured ?? false,
        comments: commentsList
      };
    });
  }

  // Count getters for tabs
  get countAll() {
    return this.articles.length;
  }

  get countActive() {
    return this.articles.filter(a => a.trangThai === 'Đang hiển thị').length;
  }

  get countScheduled() {
    return this.articles.filter(a => a.trangThai === 'Lịch hẹn đăng').length;
  }

  get countDraft() {
    return this.articles.filter(a => a.trangThai === 'Bản nháp').length;
  }

  get countHidden() {
    return this.articles.filter(a => a.trangThai === 'Đã ẩn').length;
  }

  private parseDate(dateText: string): Date {
    const [day, month, year] = dateText.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  private matchesTimeFilter(dateText: string, now: Date): boolean {
    if (!this.filterThoiGian || this.filterThoiGian === 'Tất cả') {
      return true;
    }

    try {
      const [filterYear, filterMonth] = this.filterThoiGian.split('-');
      if (!filterYear || !filterMonth) return true;
      
      const articleDate = this.parseDate(dateText);
      return articleDate.getFullYear() === parseInt(filterYear, 10) && 
             (articleDate.getMonth() + 1) === parseInt(filterMonth, 10);
    } catch (e) {
      return true;
    }
  }

  // Filtered and Sorted list (internal)
  getFilteredAndSortedArticles(): Article[] {
    let result = this.articles;

    // Filter by Tab
    if (this.currentTab === 'Đang hiển thị') {
      result = result.filter(a => a.trangThai === 'Đang hiển thị');
    } else if (this.currentTab === 'Lịch hẹn đăng') {
      result = result.filter(a => a.trangThai === 'Lịch hẹn đăng');
    } else if (this.currentTab === 'Bản nháp') {
      result = result.filter(a => a.trangThai === 'Bản nháp');
    } else if (this.currentTab === 'Đã ẩn') {
      result = result.filter(a => a.trangThai === 'Đã ẩn');
    }

    // Filter by Loại tin tức
    if (this.filterLoai !== 'Tất cả') {
      result = result.filter(a => a.loai === this.filterLoai);
    }

    // Filter by Thời gian
    const now = new Date(2026, 5, 27); // reference date to match mock data
    result = result.filter(a => this.matchesTimeFilter(a.ngayDang, now));

    // Filter by Search Text
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase().trim();
      result = result.filter(
        a =>
          a.tieuDe.toLowerCase().includes(search) ||
          a.id.toLowerCase().includes(search) ||
          a.moTa.toLowerCase().includes(search)
      );
    }

    // Sort
    if (this.sortBy === 'newest') {
      result = [...result].sort((a, b) => {
        try {
          return this.parseDate(b.ngayDang).getTime() - this.parseDate(a.ngayDang).getTime();
        } catch (e) {
          return b.id.localeCompare(a.id);
        }
      });
    } else if (this.sortBy === 'oldest') {
      result = [...result].sort((a, b) => {
        try {
          return this.parseDate(a.ngayDang).getTime() - this.parseDate(b.ngayDang).getTime();
        } catch (e) {
          return a.id.localeCompare(b.id);
        }
      });
    } else if (this.sortBy === 'title-az') {
      result = [...result].sort((a, b) => a.tieuDe.localeCompare(b.tieuDe));
    } else if (this.sortBy === 'title-za') {
      result = [...result].sort((a, b) => b.tieuDe.localeCompare(a.tieuDe));
    }

    return result;
  }

  // Paginated list for table display
  get filteredArticles(): Article[] {
    const list = this.getFilteredAndSortedArticles();
    return list.slice(this.startIndex, this.endIndex);
  }

  // Pagination getters
  get totalPages(): number {
    return Math.ceil(this.getFilteredAndSortedArticles().length / this.itemsPerPage) || 1;
  }

  get pageNumbers(): number[] {
    const windowSize = 3;
    let start = this.currentPage - Math.floor(windowSize / 2);
    let end = this.currentPage + Math.floor(windowSize / 2);

    if (start < 1) {
      start = 1;
      end = Math.min(this.totalPages, windowSize);
    }

    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(1, this.totalPages - windowSize + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  get startIndex(): number {
    const total = this.getFilteredAndSortedArticles().length;
    const maxPage = Math.ceil(total / this.itemsPerPage) || 1;
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.itemsPerPage, this.getFilteredAndSortedArticles().length);
  }

  // Page navigation methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  // Set active tab
  selectTab(tab: string) {
    this.currentTab = tab;
    this.currentPage = 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Clear all filters
  clearFilters() {
    this.searchText = '';
    this.filterLoai = 'Tất cả';
    this.filterThoiGian = '';
    this.sortBy = 'newest';
    this.currentTab = 'Tất cả';
    this.currentPage = 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Modal Open Handlers
  openCreateModal() {
    const maxNum = this.articles
      .map(a => parseInt(a.id.replace('TT', ''), 10))
      .reduce((max, num) => (!isNaN(num) && num > max ? num : max), 0);
    this.newArticleId = `TT${String(maxNum + 1).padStart(5, '0')}`;

    this.newArticleTitle = '';
    this.newArticleMoTa = '';
    this.newArticleCoverUrl = ''; 
    this.newArticleLoai = 'Tin tức nhà xe';
    this.newArticleNoiBat = false;
    this.newArticleTrangThai = 'Đang hiển thị';
    this.newArticleAuthor = 'Ban Vận Hành';
    this.newArticleContent = '';
    this.newArticleScheduleDate = '';
    this.newArticleScheduleTime = '';
    this.newArticleTags = [];
    this.newArticleTagInput = '';
    this.createFormSubmitted = false;
    this.showPreview = true;
    this.showCreateModal = true;
  }

  openEditModal(article: Article) {
    this.editingArticle = { ...article };
    this.editingArticleContent = `<p>Nội dung chi tiết của bài viết <strong>${article.tieuDe}</strong>...</p>`; 
    this.editingArticleScheduleDate = '';
    this.editingArticleScheduleTime = '';
    this.editingArticleTags = article.tags && article.tags.length > 0 ? [...article.tags] : ['Khuyến mãi', 'Dịch vụ'];

    this.editingArticleTagInput = '';
    this.editFormSubmitted = false;
    this.showPreview = true;
    this.showEditModal = true;
  }

  openCommentsModal(article: Article) {
    this.selectedArticleForComments = article;
    this.showCommentsModal = true;
  }

  deleteComment(idx: number) {
    if (this.selectedArticleForComments && this.selectedArticleForComments.comments) {
      if (confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
        this.selectedArticleForComments.comments.splice(idx, 1);
        
        // Synced back to the main list
        const mainArt = this.articles.find(a => a.id === this.selectedArticleForComments!.id);
        if (mainArt) {
          mainArt.comments = this.selectedArticleForComments.comments;
        }
      }
    }
  }

  // Suggest cover selection helper
  selectNewCover(url: string) {
    this.newArticleCoverUrl = url;
  }

  selectEditCover(url: string) {
    if (this.editingArticle) {
      this.editingArticle.image = url;
    }
  }

  onCategorySelect(cat: string, mode: 'create' | 'edit') {
    let nguoiDang = 'Nguyễn Hoài Nam (Admin)';
    if (cat === 'Tuyển dụng') nguoiDang = 'Nhân sự Viago';
    else if (cat === 'Khuyến mãi') nguoiDang = 'Viago Rewards';
    else if (cat === 'Cẩm nang di chuyển') nguoiDang = 'Viago Guide';
    else if (cat === 'Sự kiện') nguoiDang = 'Viago Events';
    else if (cat === 'Tin tức nhà xe') nguoiDang = 'Ban Vận Hành';

    if (mode === 'create') {
      this.newArticleLoai = cat;
      this.newArticleAuthor = nguoiDang;
    } else if (mode === 'edit' && this.editingArticle) {
      this.editingArticle.loai = cat;
      this.editingArticle.nguoiDang = nguoiDang;
    }
  }

  // Save new article
  saveNewArticle() {
    this.createFormSubmitted = true;
    
    // Check required fields
    if (
      !this.newArticleTitle.trim() || 
      !this.newArticleMoTa.trim() || 
      !this.newArticleCoverUrl.trim() || 
      (this.newArticleTrangThai === 'Lịch hẹn đăng' && (!this.newArticleScheduleDate || !this.newArticleScheduleTime))
    ) {
      this.toastService.showError('Vui lòng điền đầy đủ các trường bắt buộc!');
      return;
    }

    const newArt: Article = {
      id: this.newArticleId,
      tieuDe: this.newArticleTitle,
      moTa: this.newArticleMoTa || 'Tóm tắt bài viết mới cập nhật...',
      loai: this.newArticleLoai,
      nguoiDang: this.newArticleAuthor,
      ngayDang: this.getCurrentDateFormatted(),
      trangThai: this.newArticleTrangThai,
      image: this.newArticleCoverUrl || '',
      noiBat: this.newArticleNoiBat,
      tags: [...this.newArticleTags],
      comments: []
    };

    this.articles.unshift(newArt);
    this.showCreateModal = false;

    // Show Success Dialog
    this.successMessageTitle = 'Đăng tải thành công';
    this.successMessageBody = `Bài viết ${newArt.tieuDe} đã được đăng tải thành công.`;
    this.showCenteredSuccess();
  }

  // Save edited article
  saveEditedArticle() {
    this.editFormSubmitted = true;

    if (
      !this.editingArticle || 
      !this.editingArticle.tieuDe.trim() || 
      !this.editingArticle.moTa.trim() || 
      !this.editingArticle.image.trim() || 
      (this.editingArticle.trangThai === 'Lịch hẹn đăng' && (!this.editingArticleScheduleDate || !this.editingArticleScheduleTime))
    ) {
      this.toastService.showError('Vui lòng điền đầy đủ các trường bắt buộc!');
      return;
    }

    const index = this.articles.findIndex(a => a.id === this.editingArticle!.id);
    if (index !== -1) {
      const original = this.articles[index];
      const originalTags = original.tags || [];
      const currentTags = this.editingArticleTags || [];
      const tagsChanged = originalTags.length !== currentTags.length || originalTags.some((t, i) => t !== currentTags[i]);
      
      const hasChanged = 
        original.tieuDe !== this.editingArticle.tieuDe ||
        original.moTa !== this.editingArticle.moTa ||
        original.loai !== this.editingArticle.loai ||
        original.trangThai !== this.editingArticle.trangThai ||
        original.image !== this.editingArticle.image ||
        original.noiBat !== this.editingArticle.noiBat ||
        tagsChanged;

      if (!hasChanged) {
        this.toastService.showError('Không có dữ liệu nào thay đổi');
        return;
      }

      this.editingArticle!.tags = [...this.editingArticleTags];
      this.articles[index] = { ...this.editingArticle! };
      
      this.successMessageTitle = 'Cập nhật thành công';
      let msg = `Bài viết ${this.editingArticle.tieuDe} đã được lưu trữ thành công.`;
      if (this.editingArticle.trangThai === 'Đang hiển thị') {
        msg = `Bài viết ${this.editingArticle.tieuDe} đã được hiển thị.`;
      } else if (this.editingArticle.trangThai === 'Đã ẩn') {
        msg = `Bài viết ${this.editingArticle.tieuDe} đã bị ẩn.`;
      }
      this.successMessageBody = msg;
      
      this.showEditModal = false;
      this.showCenteredSuccess();
    }
  }

  // Toggle publishing status from left footer buttons
  hideArticle() {
    if (this.editingArticle) {
      this.editingArticle.trangThai = 'Đã ẩn';
      this.saveEditedArticle();
    }
  }

  publishArticle() {
    if (this.editingArticle) {
      this.editingArticle.trangThai = 'Đang hiển thị';
      this.saveEditedArticle();
    }
  }

  // Format editor helper matching admin/policies
  applyFormatting(target: 'create' | 'edit', formatType: string) {
    if (target === 'create') {
      let content = this.newArticleContent || '';
      switch (formatType) {
        case 'bold':
          content += ' <b>nội dung in đậm</b>';
          break;
        case 'italic':
          content += ' <i>nội dung in nghiêng</i>';
          break;
        case 'underline':
          content += ' <u>nội dung gạch chân</u>';
          break;
        case 'h2':
          content += '\n<h2>Tiêu đề mục mới</h2>';
          break;
        case 'ol':
          content += '\n<ol>\n  <li>Mục 1: Điều khoản...</li>\n  <li>Mục 2: Điều khoản...</li>\n</ol>';
          break;
        case 'ul':
          content += '\n<ul>\n  <li>Ý 1...</li>\n  <li>Ý 2...</li>\n</ul>';
          break;
        case 'blockquote':
          content += '\n<blockquote>Ghi chú quan trọng...</blockquote>';
          break;
        case 'clear':
          content = content.replace(/<[^>]*>/g, '');
          break;
      }
      this.newArticleContent = content;
    } else {
      let content = this.editingArticleContent || '';
      switch (formatType) {
        case 'bold':
          content += ' <b>nội dung in đậm</b>';
          break;
        case 'italic':
          content += ' <i>nội dung in nghiêng</i>';
          break;
        case 'underline':
          content += ' <u>nội dung gạch chân</u>';
          break;
        case 'h2':
          content += '\n<h2>Tiêu đề mục mới</h2>';
          break;
        case 'ol':
          content += '\n<ol>\n  <li>Mục 1: Điều khoản...</li>\n  <li>Mục 2: Điều khoản...</li>\n</ol>';
          break;
        case 'ul':
          content += '\n<ul>\n  <li>Ý 1...</li>\n  <li>Ý 2...</li>\n</ul>';
          break;
        case 'blockquote':
          content += '\n<blockquote>Ghi chú quan trọng...</blockquote>';
          break;
        case 'clear':
          content = content.replace(/<[^>]*>/g, '');
          break;
      }
      this.editingArticleContent = content;
    }
    this.cdr.detectChanges();
  }

  // Upload trigger mock
  triggerUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      // Set to mock or read as base64
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (this.showCreateModal) {
          this.newArticleCoverUrl = e.target.result;
        } else if (this.showEditModal && this.editingArticle) {
          this.editingArticle.image = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Tag Management
  addTag(mode: 'create' | 'edit', event: Event) {
    event.preventDefault();
    if (mode === 'create') {
      const val = this.newArticleTagInput.trim();
      if (val && !this.newArticleTags.includes(val)) {
        this.newArticleTags.push(val);
      }
      this.newArticleTagInput = '';
    } else {
      const val = this.editingArticleTagInput.trim();
      if (val && !this.editingArticleTags.includes(val)) {
        this.editingArticleTags.push(val);
      }
      this.editingArticleTagInput = '';
    }
  }

  removeTag(mode: 'create' | 'edit', index: number) {
    if (mode === 'create') {
      this.newArticleTags.splice(index, 1);
    } else {
      this.editingArticleTags.splice(index, 1);
    }
  }

  // Helper date formatter
  getCurrentDateFormatted(): string {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }
    this.cdr.detectChanges();
  }

  private showCenteredSuccess() {
    this.showSuccessModal = true;
    this.cdr.detectChanges();
    if (this.successTimer) {
      clearTimeout(this.successTimer);
    }
    this.successTimer = setTimeout(() => this.closeSuccessModal(), 2000);
  }
}

export { News as TinTucComponent };
