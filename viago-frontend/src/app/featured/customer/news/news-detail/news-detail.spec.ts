import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { NewsService, type CommentItem, type NewsItem } from '../../../../core/services/news.service';
import { NewsDetail } from './news-detail';

const article = (over: Partial<NewsItem> = {}): NewsItem => ({
  id: 'TIN001',
  slug: 'mo-tuyen-moi',
  title: 'VIAGO mở tuyến TP.HCM - Cần Thơ',
  category: 'news',
  categoryLabel: 'Tin tức',
  image: '/assets/customer/tin1.jpg',
  date: '18/06/2026',
  author: 'Ban truyền thông',
  summary: 'Tuyến mới chạy từ tháng 7.',
  content: '<p>Nội dung bài viết</p>',
  isFeatured: false,
  tags: ['tuyến mới'],
  viewCount: 120,
  commentCount: 2,
  publishedAt: '2026-06-18T03:00:00.000Z',
  ...over,
});

const comment = (over: Partial<CommentItem> = {}): CommentItem => ({
  id: 'BL001',
  authorName: 'Nguyễn Văn An',
  content: 'Tin vui cho dân Cần Thơ.',
  createdAt: '2026-06-18T04:00:00.000Z',
  likes: 2,
  isLiked: false,
  replies: [],
  replyCount: 0,
  ...over,
});

interface Added { author: string; content: string; parent?: string }

/**
 * Dựng trang chi tiết tin. `comments` là trang bình luận API trả về;
 * `fail` là tên hàm của NewsService sẽ trả lỗi.
 */
function build(
  comments: CommentItem[] = [comment()],
  fail = '',
  options: { commentTotal?: number; replies?: CommentItem[]; repliesTotal?: number } = {},
) {
  const added: Added[] = [];
  const params = new BehaviorSubject<Record<string, string>>({ id: 'TIN001' });
  const navigations: unknown[][] = [];
  let backs = 0;
  const guard = <T>(name: string, value: T) => {
    if (fail === name) throw new Error('Chưa thực hiện được yêu cầu lúc này.');
    return value;
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [NewsDetail],
    providers: [
      {
        provide: NewsService,
        useValue: {
          article: async (id: string) => guard('article', article({ id })),
          related: async () => guard('related', { data: [article({ id: 'TIN002' })] }),
          view: async () => guard('view', { viewCount: 121 }),
          comments: async (_id: string, page: number) => guard('comments', {
            data: comments,
            pagination: { page, pageSize: 5, total: options.commentTotal ?? comments.length, totalPages: 1 },
          }),
          addComment: async (_id: string, author: string, content: string) => {
            added.push({ author, content });
            return guard('addComment', { id: 'BL100' });
          },
          addReply: async (_id: string, parent: string, author: string, content: string) => {
            added.push({ author, content, parent });
            return guard('addReply', { id: 'BL101' });
          },
          toggleLike: async (_id: string, item: CommentItem) =>
            guard('toggleLike', { likes: item.isLiked ? item.likes - 1 : item.likes + 1, isLiked: !item.isLiked }),
          replies: async (_id: string, _commentId: string, page: number) => guard('replies', {
            data: options.replies ?? [comment({ id: `PH00${page}`, parentId: 'BL001' })],
            pagination: { page, pageSize: 2, total: options.repliesTotal ?? 1, totalPages: 1 },
          }),
        },
      },
      {
        provide: Router,
        useValue: { navigate: (commands: unknown[]) => { navigations.push(commands); return Promise.resolve(true); } },
      },
      { provide: ActivatedRoute, useValue: { params: params.asObservable(), snapshot: { params: { id: 'TIN001' } } } },
      { provide: Location, useValue: { back: () => { backs++; } } },
    ],
  });
  const fixture = TestBed.createComponent(NewsDetail);
  return { page: fixture.componentInstance, fixture, added, params, navigations, backs: () => backs };
}

const settle = () => new Promise(resolve => setTimeout(resolve));

describe('Customer news detail page', () => {
  it('shows the article, the related ones and its comments on opening', async () => {
    const { page, fixture } = build();
    fixture.detectChanges();
    await settle();
    expect(page.article?.title).toContain('VIAGO mở tuyến');
    expect(page.bottomRelatedNews.map(a => a.id)).toEqual(['TIN002']);
    expect(page.comments.map(c => c.id)).toEqual(['BL001']);
    expect(page.commentTotal).toBe(1);
    expect(page.loading).toBe(false);
    expect(page.error).toBe('');
  });

  it('counts the reader in the number of views', async () => {
    const { page, fixture } = build();
    fixture.detectChanges();
    await settle();
    expect(page.article?.viewCount).toBe(121);
  });

  it('still shows the article when the view could not be counted', async () => {
    const { page, fixture } = build([comment()], 'view');
    fixture.detectChanges();
    await settle();
    expect(page.article?.viewCount).toBe(120);
    expect(page.error).toBe('');
    expect(page.comments.map(c => c.id)).toEqual(['BL001']);
    // Đếm lượt xem hỏng không đáng để báo cho người đọc, nên tải bình luận
    // xong là thông báo lỗi đó được xóa đi.
    expect(page.commentError).toBe('');
  });

  it('says why nothing is shown when the article itself cannot be loaded', async () => {
    const { page, fixture } = build([comment()], 'article');
    fixture.detectChanges();
    await settle();
    expect(page.article).toBeUndefined();
    expect(page.error).toBe('Chưa thực hiện được yêu cầu lúc này.');
    expect(page.loading).toBe(false);
  });

  it('shows the article even when its comments cannot be loaded', async () => {
    const { page, fixture } = build([comment()], 'comments');
    fixture.detectChanges();
    await settle();
    expect(page.article?.id).toBe('TIN001');
    expect(page.comments).toEqual([]);
    expect(page.commentError).toBe('Chưa thực hiện được yêu cầu lúc này.');
  });

  it('starts afresh when the reader opens another article', async () => {
    const { page, fixture, params } = build();
    fixture.detectChanges();
    await settle();
    page.commentText = 'Đang viết nửa câu';
    page.replyingCommentId = 'BL001';
    page.commentPage = 3;
    params.next({ id: 'TIN050' });
    await settle();
    expect(page.article?.id).toBe('TIN050');
    expect(page.commentText).toBe('');
    expect(page.replyingCommentId).toBeNull();
    expect(page.commentPage).toBe(1);
    expect(page.busy()).toEqual([]);
  });

  it('sends a comment, empties the box and reloads the first page of comments', async () => {
    const { page, fixture, added } = build();
    fixture.detectChanges();
    await settle();
    page.commentPage = 2;
    page.commentAuthor = 'Nguyễn Văn An';
    page.commentText = 'Bài viết hữu ích.';
    await page.onAddComment();
    expect(added).toEqual([{ author: 'Nguyễn Văn An', content: 'Bài viết hữu ích.' }]);
    expect(page.commentText).toBe('');
    expect(page.notice).toBe('Đã gửi bình luận.');
    expect(page.commentPage).toBe(1);
    expect(page.sending).toBe(false);
  });

  it('sends nothing when the comment box holds only spaces', async () => {
    const { page, fixture, added } = build();
    fixture.detectChanges();
    await settle();
    page.commentText = '    ';
    await page.onAddComment();
    expect(added).toEqual([]);
  });

  it('keeps what was written when the comment is refused', async () => {
    const { page, fixture } = build([comment()], 'addComment');
    fixture.detectChanges();
    await settle();
    page.commentText = 'Bài viết hữu ích.';
    await page.onAddComment();
    expect(page.commentError).toBe('Chưa thực hiện được yêu cầu lúc này.');
    expect(page.commentText).toBe('Bài viết hữu ích.');
    expect(page.sending).toBe(false);
  });

  it('opens the reply box under one comment at a time and empties it each time', async () => {
    const { page, fixture } = build([comment({ id: 'BL001' }), comment({ id: 'BL002' })]);
    fixture.detectChanges();
    await settle();
    page.toggleReplyForm('BL001');
    expect(page.replyingCommentId).toBe('BL001');
    page.replyText = 'Đồng ý';
    page.toggleReplyForm('BL002');
    expect(page.replyingCommentId).toBe('BL002');
    expect(page.replyText).toBe('');
    // Bấm lại đúng bình luận đang mở thì đóng hộp trả lời.
    page.toggleReplyForm('BL002');
    expect(page.replyingCommentId).toBeNull();
  });

  it('sends a reply under the comment it belongs to and closes the box', async () => {
    const { page, fixture, added } = build();
    fixture.detectChanges();
    await settle();
    page.toggleReplyForm('BL001');
    page.replyAuthor = 'Trần Thị Bé';
    page.replyText = 'Mình cũng mong tuyến này.';
    await page.onAddReply('BL001');
    expect(added).toEqual([{ author: 'Trần Thị Bé', content: 'Mình cũng mong tuyến này.', parent: 'BL001' }]);
    expect(page.replyText).toBe('');
    expect(page.replyingCommentId).toBeNull();
    expect(page.notice).toBe('Đã gửi phản hồi.');
  });

  it('sends nothing when the reply box is empty', async () => {
    const { page, fixture, added } = build();
    fixture.detectChanges();
    await settle();
    page.replyText = '   ';
    await page.onAddReply('BL001');
    expect(added).toEqual([]);
  });

  it('keeps the reply box open with its text when the reply is refused', async () => {
    const { page, fixture } = build([comment()], 'addReply');
    fixture.detectChanges();
    await settle();
    page.toggleReplyForm('BL001');
    page.replyText = 'Mình cũng mong tuyến này.';
    await page.onAddReply('BL001');
    expect(page.commentError).toBe('Chưa thực hiện được yêu cầu lúc này.');
    expect(page.replyText).toBe('Mình cũng mong tuyến này.');
    expect(page.replyingCommentId).toBe('BL001');
  });

  it('likes a comment and takes the like back again', async () => {
    const { page, fixture } = build();
    fixture.detectChanges();
    await settle();
    const first = page.comments[0];
    await page.toggleLikeComment(first);
    expect(first.likes).toBe(3);
    expect(first.isLiked).toBe(true);
    await page.toggleLikeComment(first);
    expect(first.likes).toBe(2);
    expect(first.isLiked).toBe(false);
    expect(page.busy()).toEqual([]);
  });

  it('leaves the number of likes alone when the like cannot be recorded', async () => {
    const { page, fixture } = build([comment()], 'toggleLike');
    fixture.detectChanges();
    await settle();
    const first = page.comments[0];
    await page.toggleLikeComment(first);
    expect(first.likes).toBe(2);
    expect(first.isLiked).toBe(false);
    expect(page.commentError).toBe('Chưa thực hiện được yêu cầu lúc này.');
    expect(page.busy()).toEqual([]);
  });

  it('shows the replies of a comment and adds the next lot underneath', async () => {
    const { page, fixture } = build([comment({ id: 'BL001', replyCount: 3 })], '', { repliesTotal: 3 });
    fixture.detectChanges();
    await settle();
    const first = page.comments[0];
    await page.loadMoreReplies(first);
    expect(first.replies!.map(r => r.id)).toEqual(['PH001']);
    expect(first.replyCount).toBe(3);
    await page.loadMoreReplies(first);
    // Lượt sau nối tiếp vào danh sách đang có, không thay thế.
    expect(first.replies!.map(r => r.id)).toEqual(['PH001', 'PH002']);
    expect(page.busy()).toEqual([]);
  });

  it('says so when the replies cannot be loaded', async () => {
    const { page, fixture } = build([comment()], 'replies');
    fixture.detectChanges();
    await settle();
    await page.loadMoreReplies(page.comments[0]);
    expect(page.commentError).toBe('Chưa thực hiện được yêu cầu lúc này.');
    expect(page.busy()).toEqual([]);
  });

  it('opens another article from the related list', async () => {
    const { page, navigations } = build();
    page.goToDetail('TIN002');
    expect(navigations[0]).toEqual(['/customer/tin-tuc', 'TIN002']);
  });

  it('goes back the way the reader came, or to the news list when there is no way back', () => {
    const { page, navigations, backs } = build();
    Object.defineProperty(window.history, 'length', { value: 5, configurable: true });
    page.goBack();
    expect(backs()).toBe(1);
    expect(navigations).toHaveLength(0);
    Object.defineProperty(window.history, 'length', { value: 1, configurable: true });
    page.goBack();
    expect(navigations[0]).toEqual(['/customer/tin-tuc']);
  });
});
