import { Component, EventEmitter, Input, Output } from '@angular/core';

type PageItem = number | 'ellipsis';

@Component({
  imports: [],
  selector: 'app-pagination',
  styleUrl: './pagination.css',
  templateUrl: './pagination.html',
})
export class Pagination {
  @Input() currentPage = 1;
  @Input() totalItems = 0;
  @Input() pageSize = 10;
  @Input() siblingCount = 1;
  @Input() showSummary = true;

  @Output() readonly pageChange = new EventEmitter<number>();

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / Math.max(1, this.pageSize)));
  }

  protected get safeCurrentPage(): number {
    return Math.min(Math.max(1, this.currentPage), this.totalPages);
  }

  protected get firstItem(): number {
    return this.totalItems === 0 ? 0 : (this.safeCurrentPage - 1) * this.pageSize + 1;
  }

  protected get lastItem(): number {
    return Math.min(this.safeCurrentPage * this.pageSize, this.totalItems);
  }

  protected get pages(): PageItem[] {
    const total = this.totalPages;
    const current = this.safeCurrentPage;
    const siblings = Math.max(0, this.siblingCount);
    const visibleSlots = siblings * 2 + 5;

    if (total <= visibleSlots) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const left = Math.max(2, current - siblings);
    const right = Math.min(total - 1, current + siblings);
    const showLeftEllipsis = left > 2;
    const showRightEllipsis = right < total - 1;
    const items: PageItem[] = [1];

    if (showLeftEllipsis) items.push('ellipsis');
    for (let page = left; page <= right; page += 1) items.push(page);
    if (showRightEllipsis) items.push('ellipsis');
    items.push(total);

    return items;
  }

  protected selectPage(page: number): void {
    const nextPage = Math.min(Math.max(1, page), this.totalPages);
    if (nextPage === this.safeCurrentPage) return;

    this.pageChange.emit(nextPage);
  }
}
