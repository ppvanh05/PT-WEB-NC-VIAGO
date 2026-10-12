import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastVariant } from '../../../../shared/components/toast/toast';
import { NewsItem, NewsService } from '../../../../core/services/news.service';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './news-detail.html',
  styleUrl: './news-detail.css',
})
export class NewsDetail implements OnInit {
  toast = signal<{ message: string; variant: ToastVariant } | null>(null);
  article?: NewsItem;
  sidebarRelatedNews: NewsItem[] = [];
  bottomRelatedNews: NewsItem[] = [];
  showToast = false;
  toastMessage = '';
  toastVariant: 'success' | 'info' = 'success';
  commentAuthor = '';
  commentText = '';
  replyingCommentId: string | null = null;
  replyAuthor = '';
  replyText = '';

  constructor(private route: ActivatedRoute, private router: Router, private newsService: NewsService, private location: Location) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => this.loadArticle(params['id']));
  }

  loadArticle(id: string): void {
    this.article = this.newsService.getNewsById(id) ?? this.newsService.getAllNews()[0];
    if (this.article) {
      this.sidebarRelatedNews = this.newsService.getRelatedNews(this.article.id, this.article.category, 4);
      this.bottomRelatedNews = this.newsService.getRelatedNews(this.article.id, this.article.category, 3);
      this.article.viewCount += 1;
    }
    window.scrollTo(0, 0);
  }

  shareArticle(): void {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).then(
      () => this.triggerToast('Đã sao chép đường dẫn bài viết vào bộ nhớ tạm!'),
      () => this.triggerToast('Đường dẫn: ' + url, 'info'),
    );
  }

  triggerToast(message: string, variant: 'success' | 'info' = 'success'): void {
    this.toastMessage = message;
    this.toastVariant = variant;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }

  onAddComment(): void {
    if (!this.commentText.trim() || !this.article) return;
    const comment = this.newsService.addComment(this.article.id, this.commentAuthor.trim() || 'Hành khách Viago', this.commentText);
    if (comment) {
      this.commentAuthor = '';
      this.commentText = '';
      this.triggerToast('Đã đăng bình luận thành công!');
    }
  }

  toggleLikeComment(id: string): void { if (this.article) this.newsService.toggleLikeComment(this.article.id, id); }

  toggleReplyForm(id: string): void {
    this.replyingCommentId = this.replyingCommentId === id ? null : id;
    this.replyAuthor = '';
    this.replyText = '';
  }

  onAddReply(id: string): void {
    if (!this.replyText.trim() || !this.article) return;
    const reply = this.newsService.addReply(this.article.id, id, this.replyAuthor.trim() || 'Hành khách Viago', this.replyText);
    if (reply) {
      this.replyAuthor = '';
      this.replyText = '';
      this.replyingCommentId = null;
      this.triggerToast('Đã gửi phản hồi thành công!');
    }
  }

  goToDetail(id: string): void { this.router.navigate(['/customer/tin-tuc', id]); }
  goToHome(): void { this.router.navigate(['/customer']); }
  goBack(): void { window.history.length > 1 ? this.location.back() : this.goToNewsList(this.article?.category); }
  goToNewsList(category?: string): void {
    category && category !== 'all'
      ? this.router.navigate(['/customer/tin-tuc'], { queryParams: { category } })
      : this.router.navigate(['/customer/tin-tuc']);
  }
}
