import { Toast, ToastVariant } from '../../../../shared/components/toast/toast';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ARTICLES, Article } from '../news-data';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [Toast, CommonModule, RouterLink, FormsModule],
  templateUrl: './news-detail.html',
  styleUrls: ['../../customer-pages.css', './news-detail.css', '../../customer-page-theme.css'],
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

      this.bottomArticles = ARTICLES.filter((article) => article.id !== this.article.id).slice(0, 3);
      this.showShareModal = false;
    });
  }

  openShare() {
    this.shareUrl = `${window.location.origin}/tin-tuc/chi-tiet/${this.article.id}`;
    this.showShareModal = true;
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
  }
}
