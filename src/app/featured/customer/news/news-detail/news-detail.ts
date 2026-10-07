import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NewsService, NewsItem, CommentItem } from '../../../../core/services/news.service';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './news-detail.html',
  styleUrl: './news-detail.css',
})
export class NewsDetail implements OnInit {
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
