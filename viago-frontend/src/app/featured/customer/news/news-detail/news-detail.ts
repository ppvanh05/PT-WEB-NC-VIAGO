import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommentItem, NewsItem, NewsService } from '../../../../core/services/news.service';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { Input } from '../../../../shared/components/input/input';
import { Textarea } from '../../../../shared/components/input/textarea/textarea';
import { Pagination } from '../../../../shared/components/pagination/pagination';
@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Button, Input, Textarea, Pagination],
  templateUrl: './news-detail.html',
  styleUrl: './news-detail.css',
})
export class NewsDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(NewsService);
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy = inject(DestroyRef);
  private abort = new AbortController();
  private version = 0;
  private commentVersion = 0;
  private replyPages = new Map<string, number>();
  article?: NewsItem;
  bottomRelatedNews: NewsItem[] = [];
  comments: CommentItem[] = [];
  commentTotal = 0;
  commentPage = 1;
  loading = false;
  error = '';
  commentError = '';
  notice = '';
  sending = false;
  commentsLoading = false;
  commentAuthor = '';
  commentText = '';
  replyingCommentId: string | null = null;
  replyAuthor = '';
  replyText = '';
  readonly busy = signal<string[]>([]);
  private articleKey = '';
  constructor() {
    this.destroy.onDestroy(() => this.abort.abort());
  }
  ngOnInit() {
    this.route.params
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((params) => void this.loadArticle(params['id']));
  }
  async loadArticle(id: string) {
    this.abort.abort();
    this.abort = new AbortController();
    const version = ++this.version;
    this.articleKey = id;
    this.loading = true;
    this.error = '';
    this.article = undefined;
    this.comments = [];
    this.commentTotal = 0;
    this.commentPage = 1;
    this.bottomRelatedNews = [];
    this.commentError = '';
    this.notice = '';
    this.replyingCommentId = null;
    this.replyPages.clear();
    this.busy.set([]);
    this.sending = false;
    this.commentText = '';
    this.replyText = '';
    try {
      const [article, related] = await Promise.all([
        this.api.article(id, this.abort.signal),
        this.api.related(id, this.abort.signal),
      ]);
      if (version !== this.version || this.abort.signal.aborted) return;
      this.article = article;
      this.bottomRelatedNews = related.data;
      try {
        const view = await this.api.view(id, this.abort.signal);
        if (version === this.version && this.article) this.article.viewCount = view.viewCount;
      } catch (e) {
        if (version === this.version && !this.abort.signal.aborted)
          this.commentError = this.message(e);
      }
      if (version === this.version && !this.abort.signal.aborted) await this.loadComments(1);
    } catch (e) {
      if (version === this.version && !this.abort.signal.aborted) this.error = this.message(e);
    } finally {
      if (version === this.version && !this.abort.signal.aborted) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }
  }
  async loadComments(page = this.commentPage) {
    const version = ++this.commentVersion,
      articleVersion = this.version;
    this.commentsLoading = true;
    this.commentError = '';
    try {
      const result = await this.api.comments(this.articleKey, page, this.abort.signal);
      if (
        articleVersion !== this.version ||
        version !== this.commentVersion ||
        this.abort.signal.aborted
      )
        return;
      this.comments = result.data;
      this.commentTotal = result.pagination.total;
      this.commentPage = page;
      this.replyPages.clear();
    } catch (e) {
      if (articleVersion === this.version && !this.abort.signal.aborted)
        this.commentError = this.message(e);
    } finally {
      if (
        articleVersion === this.version &&
        version === this.commentVersion &&
        !this.abort.signal.aborted
      ) {
        this.commentsLoading = false;
        this.cdr.markForCheck();
      }
    }
  }
  async onAddComment() {
    if (!this.commentText.trim() || !this.article || this.sending) return;
    this.sending = true;
    this.commentError = '';
    const version = this.version;
    try {
      await this.api.addComment(
        this.articleKey,
        this.commentAuthor,
        this.commentText,
        this.abort.signal,
      );
      if (version !== this.version) return;
      this.commentText = '';
      this.notice = 'Đã gửi bình luận.';
      await this.loadComments(1);
    } catch (e) {
      if (version === this.version && !this.abort.signal.aborted)
        this.commentError = this.message(e);
    } finally {
      if (version === this.version && !this.abort.signal.aborted) {
        this.sending = false;
        this.cdr.markForCheck();
      }
    }
  }
  toggleReplyForm(id: string) {
    if (this.sending) return;
    this.replyingCommentId = this.replyingCommentId === id ? null : id;
    this.replyAuthor = '';
    this.replyText = '';
  }
  async onAddReply(id: string) {
    if (!this.replyText.trim() || this.sending) return;
    this.sending = true;
    this.commentError = '';
    const version = this.version;
    try {
      await this.api.addReply(
        this.articleKey,
        id,
        this.replyAuthor,
        this.replyText,
        this.abort.signal,
      );
      if (version !== this.version) return;
      this.replyText = '';
      this.replyingCommentId = null;
      this.notice = 'Đã gửi phản hồi.';
      await this.loadComments();
    } catch (e) {
      if (version === this.version && !this.abort.signal.aborted)
        this.commentError = this.message(e);
    } finally {
      if (version === this.version && !this.abort.signal.aborted) {
        this.sending = false;
        this.cdr.markForCheck();
      }
    }
  }
  async toggleLikeComment(comment: CommentItem) {
    if (this.busy().includes(comment.id)) return;
    const version = this.version;
    this.busy.update((ids) => [...ids, comment.id]);
    this.commentError = '';
    try {
      const result = await this.api.toggleLike(this.articleKey, comment, this.abort.signal);
      if (version === this.version) {
        comment.likes = result.likes;
        comment.isLiked = result.isLiked;
      }
    } catch (e) {
      if (version === this.version && !this.abort.signal.aborted)
        this.commentError = this.message(e);
    } finally {
      if (version === this.version && !this.abort.signal.aborted) {
        this.busy.update((ids) => ids.filter((id) => id !== comment.id));
        this.cdr.markForCheck();
      }
    }
  }
  async loadMoreReplies(comment: CommentItem) {
    if (this.busy().includes(comment.id)) return;
    const version = this.version;
    this.busy.update((ids) => [...ids, comment.id]);
    const page = (this.replyPages.get(comment.id) || 0) + 1;
    try {
      const result = await this.api.replies(this.articleKey, comment.id, page, this.abort.signal);
      if (version === this.version) {
        comment.replies = page === 1 ? result.data : [...(comment.replies || []), ...result.data];
        comment.replyCount = result.pagination.total;
        this.replyPages.set(comment.id, page);
      }
    } catch (e) {
      if (version === this.version && !this.abort.signal.aborted)
        this.commentError = this.message(e);
    } finally {
      if (version === this.version && !this.abort.signal.aborted) {
        this.busy.update((ids) => ids.filter((id) => id !== comment.id));
        this.cdr.markForCheck();
      }
    }
  }
  goToDetail(id: string) {
    void this.router.navigate(['/customer/tin-tuc', id]);
  }
  goBack() {
    window.history.length > 1
      ? this.location.back()
      : void this.router.navigate(['/customer/tin-tuc']);
  }
  private message(e: unknown) {
    return e instanceof Error ? e.message : 'Chưa thực hiện được yêu cầu.';
  }
}
