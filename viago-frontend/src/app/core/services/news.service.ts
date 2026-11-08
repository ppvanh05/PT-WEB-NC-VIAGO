import { Injectable } from '@angular/core';
import { contentRequest } from './content-api.service';
export type NewsCategory = 'all' | 'news' | 'promotion' | 'guide' | 'event' | 'recruitment';
export interface CommentItem {
  id: string;
  parentId?: string | null;
  authorName: string;
  content: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
  replies?: CommentItem[];
  replyCount?: number;
}
export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  category: Exclude<NewsCategory, 'all'>;
  categoryLabel: string;
  image: string;
  date: string;
  author: string;
  summary: string;
  content?: string;
  isFeatured: boolean;
  featuredPosition?: string;
  tags: string[];
  viewCount: number;
  commentCount: number;
  publishedAt: string;
}
export interface NewsPage<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface FeaturedNews {
  main?: NewsItem | null;
  grid: NewsItem[];
  subHighlight?: NewsItem | null;
  subGrid: NewsItem[];
}
@Injectable({ providedIn: 'root' })
export class NewsService {
  private request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal) {
    return contentRequest<T>('/customer/news' + path, { method, body, signal });
  }
  categories(signal?: AbortSignal) {
    return this.request<{ data: { id: NewsCategory; label: string; count: number }[] }>(
      '/categories',
      'GET',
      undefined,
      signal,
    );
  }
  list(
    query: {
      category: NewsCategory;
      search: string;
      time: string;
      sort: string;
      page: number;
      pageSize: number;
    },
    signal?: AbortSignal,
  ) {
    const params = new URLSearchParams(
      Object.entries(query).map(([key, value]) => [key, String(value)]),
    );
    return this.request<NewsPage<NewsItem>>('?' + params, 'GET', undefined, signal);
  }
  featured(category: NewsCategory, signal?: AbortSignal) {
    return this.request<FeaturedNews>('/featured?category=' + category, 'GET', undefined, signal);
  }
  article(id: string, signal?: AbortSignal) {
    return this.request<NewsItem>('/' + encodeURIComponent(id), 'GET', undefined, signal);
  }
  related(id: string, signal?: AbortSignal) {
    return this.request<{ data: NewsItem[] }>(
      '/' + encodeURIComponent(id) + '/related?limit=4',
      'GET',
      undefined,
      signal,
    );
  }
  view(id: string, signal?: AbortSignal) {
    return this.request<{ viewCount: number }>(
      '/' + encodeURIComponent(id) + '/views',
      'POST',
      {},
      signal,
    );
  }
  comments(id: string, page = 1, signal?: AbortSignal) {
    return this.request<NewsPage<CommentItem>>(
      '/' + encodeURIComponent(id) + '/comments?page=' + page + '&pageSize=10',
      'GET',
      undefined,
      signal,
    );
  }
  replies(id: string, commentId: string, page = 1, signal?: AbortSignal) {
    return this.request<NewsPage<CommentItem>>(
      '/' +
        encodeURIComponent(id) +
        '/comments/' +
        encodeURIComponent(commentId) +
        '/replies?page=' +
        page +
        '&pageSize=20',
      'GET',
      undefined,
      signal,
    );
  }
  addComment(id: string, authorName: string, content: string, signal?: AbortSignal) {
    return this.request<CommentItem>(
      '/' + encodeURIComponent(id) + '/comments',
      'POST',
      { ...(authorName.trim() ? { authorName: authorName.trim() } : {}), content: content.trim() },
      signal,
    );
  }
  addReply(
    id: string,
    commentId: string,
    authorName: string,
    content: string,
    signal?: AbortSignal,
  ) {
    return this.request<CommentItem>(
      '/' + encodeURIComponent(id) + '/comments/' + encodeURIComponent(commentId) + '/replies',
      'POST',
      { ...(authorName.trim() ? { authorName: authorName.trim() } : {}), content: content.trim() },
      signal,
    );
  }
  toggleLike(id: string, comment: CommentItem, signal?: AbortSignal) {
    return this.request<{ id: string; likes: number; isLiked: boolean }>(
      '/' + encodeURIComponent(id) + '/comments/' + encodeURIComponent(comment.id) + '/like',
      comment.isLiked ? 'DELETE' : 'PUT',
      undefined,
      signal,
    );
  }
}
