import { Toast, ToastVariant } from '../../../../shared/components/toast/toast';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NewsService, NewsItem, CommentItem } from '../../../../core/services/news.service';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [Toast, CommonModule, RouterLink, FormsModule],
  imports: [CommonModule, FormsModule],
  templateUrl: './news-detail.html',
  styleUrl: './news-detail.css',
})
export class NewsDetail implements OnInit {
  toast = signal<{ message: string; variant: ToastVariant } | null>(null);
  article!: Article;
  relatedArticles: Article[] = [];
  bottomArticles: Article[] = [];
  
  // Custom share modal state
  showShareModal = false;
  shareUrl = '';

  // Comments state
  comments: Array<{ author: string; date: string; content: string }> = [
    { author: 'Minh Quân', date: '28/06/2026', content: 'Bài viết rất hữu ích, giúp tôi biết thêm nhiều thông tin di chuyển bằng xe limousine.' },
    { author: 'Thu Trang', date: '27/06/2026', content: 'Dịch vụ của VIAGO đúng là chất lượng cao, rất mong chờ có thêm nhiều chuyến đi mới!' }
  ];
  commentError = '';
  newCommentName = '';
  newCommentText = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id') ?? 1);
      const originalArticle = ARTICLES.find((article) => article.id === id) ?? ARTICLES[0];
      
      // Make a copy so we do not mutate the shared database directly, and append long content for 1-page length
      const articleCopy = { ...originalArticle };
      
      const extraLongText = `
      
      Để có trải nghiệm di chuyển tối ưu nhất trên mọi nẻo đường cùng VIAGO, hành khách nên lưu ý một số chuẩn bị quan trọng trước khi khởi hành. Đầu tiên là việc sắp xếp hành lý ký gửi và hành lý xách tay gọn gàng, có nhãn tên rõ ràng để tránh thất lạc. Các trang thiết bị điện tử giá trị cao và giấy tờ tùy thân nên luôn mang theo bên người.
      
      Nhà xe VIAGO cũng khuyến khích quý khách hàng có mặt tại văn phòng đại diện hoặc bến xe trước giờ xuất bến tối thiểu 15 đến 30 phút để hoàn tất các thủ tục check-in, đối soát thông tin vé điện tử và sắp xếp vị trí khoang giường nằm một cách thảnh thơi. Đội ngũ nhân viên điều phối luôn sẵn sàng hỗ trợ nâng đỡ hành lý và hướng dẫn chi tiết sơ đồ ghế ngồi.
      
      Trong suốt hành trình dài, VIAGO cung cấp các dịch vụ tiện ích tiêu chuẩn 5 sao hoàn toàn miễn phí bao gồm nước uống đóng chai tinh khiết, khăn lạnh tiệt trùng, chăn gối mềm mại được sấy vô trùng và mạng kết nối wifi tốc độ cao liên tục. Quý khách có thể sử dụng cổng sạc USB được tích hợp sẵn tại mỗi khoang cabin riêng biệt để nạp năng lượng cho các thiết bị cá nhân của mình.
      
      Chúng tôi cam kết mang đến những chuyến đi an toàn, êm ái nhờ hệ thống xe giường phòng đời mới được bảo trì kỹ thuật định kỳ nghiêm ngặt cùng đội ngũ tài xế giàu kinh nghiệm, lịch sự và chu đáo. Mọi ý kiến phản hồi hay đóng góp ý kiến của quý hành khách luôn là động lực to lớn giúp VIAGO không ngừng cải tiến và nâng cao chất lượng dịch vụ phục vụ khách hàng trên toàn quốc.`;

      articleCopy.contentBody = (articleCopy.contentBody || articleCopy.excerpt || '') + extraLongText;
      this.article = articleCopy;

      this.relatedArticles = ARTICLES
        .filter((article) => article.categoryKey === this.article.categoryKey && article.id !== this.article.id)
        .slice(0, 4);

      if (this.relatedArticles.length < 4) {
        const extra = ARTICLES.filter((article) => article.id !== this.article.id && !this.relatedArticles.includes(article));
        this.relatedArticles = [...this.relatedArticles, ...extra].slice(0, 4);
      }
  article?: NewsItem;
  sidebarRelatedNews: NewsItem[] = [];
  bottomRelatedNews: NewsItem[] = [];

  // Form input model
  commentAuthor = '';
  commentText = '';

  // Toast / Share notification state
  showToast = false;
  toastMessage = '';
  toastVariant: 'success' | 'info' = 'success';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private newsService: NewsService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadArticle(id);
      }
    });
  }

  loadArticle(id: string): void {
    this.article = this.newsService.getNewsById(id);
    if (!this.article) {
      // Fallback to first news item if ID not found
      this.article = this.newsService.getAllNews()[0];
    }

    if (this.article) {
      this.sidebarRelatedNews = this.newsService.getRelatedNews(this.article.id, this.article.category, 4);
      this.bottomRelatedNews = this.newsService.getRelatedNews(this.article.id, this.article.category, 3);
      // Increment view count
      this.article.viewCount += 1;
    }

    // Instant scroll to top (no smooth scrolling animation)
    window.scrollTo(0, 0);
  }

  copyLink() {
    Promise.resolve().then(() => navigator.clipboard.writeText(this.shareUrl)).then(() => {
      this.toast.set({ message: 'Đã sao chép liên kết.', variant: 'success' });
      this.showShareModal = false;
    }).catch(() => {
      this.toast.set({ message: 'Không thể sao chép liên kết. Vui lòng thử lại.', variant: 'error' });
    });
  }

  submitComment() {
    if (!this.newCommentName.trim() || !this.newCommentText.trim()) {
      this.commentError = 'Vui lòng nhập tên và nội dung bình luận.';
      return;
    }
    this.commentError = '';
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    
    this.comments.push({
      author: this.newCommentName.trim(),
      date: formattedDate,
      content: this.newCommentText.trim()
    });
    
    this.newCommentName = '';
    this.newCommentText = '';
    this.toast.set({ message: 'Đã gửi bình luận.', variant: 'success' });
  shareArticle(): void {
    const currentUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl).then(() => {
        this.triggerToast('Đã sao chép đường dẫn bài viết vào bộ nhớ tạm!');
      }).catch(() => {
        this.triggerToast('Đường dẫn: ' + currentUrl);
      });
    } else {
      this.triggerToast('Đã sao chép liên kết bài viết!');
    }
  }

  triggerToast(message: string, variant: 'success' | 'info' = 'success'): void {
    this.toastMessage = message;
    this.toastVariant = variant;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3500);
  }

  onAddComment(): void {
    if (!this.commentText.trim() || !this.article) return;

    const name = this.commentAuthor.trim() || 'Hành khách Viago';
    const newComment = this.newsService.addComment(this.article.id, name, this.commentText);

    if (newComment) {
      this.commentText = '';
      this.commentAuthor = '';
      this.triggerToast('Đã đăng bình luận thành công!');
    }
  }

  toggleLikeComment(commentId: string): void {
    if (!this.article) return;
    this.newsService.toggleLikeComment(this.article.id, commentId);
  }

  // Inline comment reply logic
  replyingCommentId: string | null = null;
  replyAuthor = '';
  replyText = '';

  toggleReplyForm(commentId: string): void {
    if (this.replyingCommentId === commentId) {
      this.replyingCommentId = null;
    } else {
      this.replyingCommentId = commentId;
      this.replyAuthor = '';
      this.replyText = '';
    }
  }

  onAddReply(commentId: string): void {
    if (!this.replyText.trim() || !this.article) return;

    const name = this.replyAuthor.trim() || 'Hành khách Viago';
    const newReply = this.newsService.addReply(this.article.id, commentId, name, this.replyText);

    if (newReply) {
      this.replyText = '';
      this.replyAuthor = '';
      this.replyingCommentId = null;
      this.triggerToast('Đã gửi phản hồi thành công!');
    }
  }

  goToDetail(id: string): void {
    this.router.navigate(['/customer/tin-tuc', id]);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.goToNewsList(this.article?.category);
    }
  }

  goToHome(): void {
    this.router.navigate(['/customer']);
  }

  goToNewsList(category?: string): void {
    const targetCategory = category || this.article?.category;
    if (targetCategory && targetCategory !== 'all') {
      this.router.navigate(['/customer/tin-tuc'], { queryParams: { category: targetCategory } });
    } else {
      this.router.navigate(['/customer/tin-tuc']);
    }
  }
}
