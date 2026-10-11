import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../../shared/components/pagination/pagination';

export interface CriterionRating {
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
  id: number;
  authorName: string;
  avatarColor: string;
  avatarInitials: string;
  verifiedTrip: boolean;
  date: string;
  rating: number; // 1-5
  content: string;
  busType: string;
  route: string;
  category: string;
  hasImages: boolean;
  images?: string[];
  helpfulCount: number;
  isHelpfulClicked?: boolean;
  reply?: ReviewReply;
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './reviews.html',
  styleUrl: './reviews.css',
})
export class Reviews {
  @ViewChild('topFilterSection') topFilterSectionRef!: ElementRef;

  // Overall Statistics
  overallRating = 4.8;
  maxRating = 5;
  totalReviewsCount = 152;
  hasCommentsCount = 152;
  hasImagesCount = 90;

  criteriaList: CriterionRating[] = [
    { name: 'An toàn', score: 4.4, maxScore: 5 },
    { name: 'Thông tin chính xác', score: 4.5, maxScore: 5 },
    { name: 'Thông tin đầy đủ', score: 4.5, maxScore: 5 },
    { name: 'Thái độ nhân viên', score: 4.9, maxScore: 5 },
    { name: 'Tiện nghi & thoải mái', score: 4.5, maxScore: 5 },
    { name: 'Chất lượng dịch vụ', score: 4.4, maxScore: 5 },
    { name: 'Đúng giờ', score: 4.4, maxScore: 5 },
  ];

  // Filters state
  activeTab: 'all' | 'has_comment' | 'has_image' = 'all';
  selectedRating: string = 'all';
  selectedBusType: string = 'all';
  selectedRoute: string = 'all';
  searchKeyword: string = '';
  selectedCategory: string = 'all';
  selectedSort: string = 'newest';

  // Mobile filter toggle
  isFilterExpanded: boolean = false;

  // Modal Image Preview
  activeImageModal: string | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;

  reviewsData: ReviewItem[] = [];

  // Clean bus types
  busTypeOptions = [
    'Limousine 9 chỗ',
    'Giường nằm 34 chỗ',
    'Cabin 22 phòng'
  ];

  // Routes list
  routeOptions = [
    'TP.HCM ↔ Cần Thơ',
    'TP.HCM ↔ Vũng Tàu',
    'Đà Lạt ↔ Buôn Ma Thuột',
    'Đà Lạt ↔ Nha Trang',
    'Cần Thơ ↔ Rạch Giá',
    'TP.HCM ↔ Phan Thiết',
    'TP.HCM ↔ Đà Lạt',
    'TP.HCM ↔ Nha Trang',
    'Nha Trang ↔ Đà Nẵng'
  ];

  constructor() {
    this.generate152Reviews();
  }

  private generate152Reviews(): void {
    const names = [
      'Đỗ Thanh Phương', 'Trần Hoàng Nam', 'Nguyễn Văn Hải', 'Lê Mỹ Duyên',
      'Phạm Minh Đức', 'Vũ Quốc Bảo', 'Hoàng Ánh Nguyệt', 'Đặng Tiến Dũng',
      'Ngô Thu Trang', 'Trịnh Khánh Linh', 'Bùi Đức Anh', 'Phan Châu Giang',
      'Đinh Hoàng Việt', 'Cao Thanh Hà', 'Mai Tuyết Nhi', 'Trương Gia Huy',
      'Võ Khánh Vân', 'Lê Tấn Phát', 'Nguyễn Quỳnh Anh', 'Hồ Bảo Lâm',
      'Dương Phương Thảo', 'Lý Văn Khoa', 'Đoàn Nhật Minh', 'Huỳnh Bích Ngọc'
    ];

    const colors = ['#e91e63', '#3f51b5', '#10b981', '#f59e0b', '#0284c7', '#8b5cf6', '#06b6d4', '#ef4444'];
    
    const categories = [
      'An toàn', 'Thông tin chính xác', 'Thông tin đầy đủ',
      'Thái độ nhân viên', 'Tiện nghi & thoải mái', 'Chất lượng dịch vụ', 'Đúng giờ'
    ];

    const sampleImages = [
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&auto=format&fit=crop&q=80'
    ];

    const commentsByBusType: { [key: string]: string[] } = {
      'Limousine 9 chỗ': [
        'Xe Limousine 9 chỗ ghế da VIP bọc da êm ái, bác tài chạy cẩn thận, đón đúng giờ tận nơi. Đánh giá 5 sao cho chất lượng dịch vụ!',
        'Dịch vụ xe Limousine 9 chỗ tuyệt vời. Ghế ngồi rộng rãi ngả lưng dễ chịu, nước uống khăn lạnh đầy đủ trong suốt hành trình.',
        'Đi xe 9 chỗ sang trọng, không gian yên tĩnh, không đón khách dọc đường. Rất hài lòng với trải nghiệm chuyến đi của VIAGO!',
        'Xe 9 chỗ chạy rất êm ru, có cổng sạc USB riêng tại mỗi ghế VIP rất tiện lợi cho công việc khi di chuyển.'
      ],
      'Giường nằm 34 chỗ': [
        'Xe giường nằm 34 chỗ sạch sẻ, chăn gối thơm tho. Bác tài lái xe rất êm không bị xóc hay say xe, đón đúng giờ hẹn.',
        'Giường nằm 34 chỗ rộng rãi, rèm che riêng tư. Chuyến đi đêm giấc ngủ rất ngon và thoải mái, nhân viên hỗ trợ chu đáo.',
        'Nhà xe phục vụ xe giường nằm 34 chỗ chất lượng cao, thông tin chính xác trên app và trả khách đúng bến an toàn.',
        'Xe giường nằm sạch đẹp, điều hòa mát lạnh, nhân viên hỗ trợ cất sắp xếp hành lý cho hành khách rất nhiệt tình.'
      ],
      'Cabin 22 phòng': [
        'Xe Cabin 22 phòng cực kỳ sang trọng và riêng tư, có tivi giải trí và cổng sạc riêng. Trải nghiệm tuyệt vời xứng đáng 5 sao!',
        'Phòng Cabin 22 chỗ rộng rãi thoải mái cho chuyến đi đường dài. Không gian yên tĩnh, giường nằm đệm êm ái như ở nhà.',
        'Rất thích dòng xe Cabin 22 phòng này của VIAGO, rèm kéo riêng tư hoàn toàn, đi đêm ngủ ngon giấc tới sáng.',
        'Chuyến xe Cabin 22 phòng chất lượng đỉnh cao. Tài xế chạy vững tay an toàn, nhân viên hướng dẫn thân thiện chu đáo.'
      ]
    };

    const items: ReviewItem[] = [];

    const ratingPattern = [5, 4, 3, 5, 5, 2, 5, 4, 1, 5];

    for (let i = 1; i <= 152; i++) {
      const name = names[(i - 1) % names.length];
      const initials = name.split(' ').map(n => n[0]).join('').slice(-2).toUpperCase();
      const color = colors[(i - 1) % colors.length];
      const rating = ratingPattern[(i - 1) % ratingPattern.length];

      const busType = this.busTypeOptions[(i - 1) % this.busTypeOptions.length];
      const route = this.routeOptions[(i - 1) % this.routeOptions.length];
      const category = categories[(i - 1) % categories.length];
      const hasImg = i <= 90; // Exactly 90 reviews with images
      const day = String((i % 28) + 1).padStart(2, '0');
      const month = String(((i % 5) + 5)).padStart(2, '0');

      const busComments = commentsByBusType[busType];
      const commentText = busComments[(i - 1) % busComments.length];

      const reviewItem: ReviewItem = {
        id: i,
        authorName: name,
        avatarColor: color,
        avatarInitials: initials,
        verifiedTrip: true,
        date: `${day}/${month}/2026`,
        rating: rating,
        content: commentText,
        busType: busType,
        route: route,
        category: category,
        hasImages: hasImg,
        images: hasImg ? (i % 2 === 0 ? [sampleImages[0], sampleImages[1]] : [sampleImages[0]]) : undefined,
        helpfulCount: Math.floor((152 - i) / 3) + 8,
        isHelpfulClicked: false
      };

      if (i === 1) {
        reviewItem.reply = {
          author: 'VIAGO Team',
          date: '21/06/2026',
          content: 'Cảm ơn chị Phương đã tin tưởng lựa chọn VIAGO. Rất hân hạnh được phục vụ chị trên những hành trình tiếp theo!'
        };
      } else if (i === 3) {
        reviewItem.reply = {
          author: 'VIAGO Team',
          date: '19/08/2026',
          content: 'Chào anh Hải, VIAGO chân thành cảm ơn đánh giá tích cực của anh. Chúc anh luôn có những chuyến đi thượng lộ bình an!'
        };
      } else if (i === 6) {
        reviewItem.reply = {
          author: 'VIAGO Team',
          date: '06/08/2026',
          content: 'Cảm ơn anh Bảo đã trải nghiệm dịch vụ của VIAGO! Hẹn gặp lại anh trong chuyến đi sắp tới.'
        };
      }

      items.push(reviewItem);
    }

    this.reviewsData = items;
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
      if (this.selectedCategory !== 'all' && item.category !== this.selectedCategory) {
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
        return b.id - a.id;
      } else if (this.selectedSort === 'oldest') {
        return a.id - b.id;
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

  setCategory(cat: string): void {
    this.selectedCategory = cat;
    this.resetPagination();
  }

  clearFilters(): void {
    this.activeTab = 'all';
    this.selectedRating = 'all';
    this.selectedBusType = 'all';
    this.selectedRoute = 'all';
    this.searchKeyword = '';
    this.selectedCategory = 'all';
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

  toggleHelpful(review: ReviewItem): void {
    if (review.isHelpfulClicked) {
      review.helpfulCount--;
      review.isHelpfulClicked = false;
    } else {
      review.helpfulCount++;
      review.isHelpfulClicked = true;
    }
  }

  openImageModal(imgUrl: string): void {
    this.activeImageModal = imgUrl;
  }

  closeImageModal(): void {
    this.activeImageModal = null;
  }
}
