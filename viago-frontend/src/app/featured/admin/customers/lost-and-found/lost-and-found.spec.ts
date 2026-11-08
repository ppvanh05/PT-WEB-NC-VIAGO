import { TestBed } from '@angular/core/testing';
import { BookingService } from '../../../customer/home/booking.service';
import { LostAndFound } from './lost-and-found';

describe('Lost items overview and pagination', () => {
  beforeEach(() => {
    window.scrollTo = () => {};
    TestBed.configureTestingModule({
      imports: [LostAndFound],
      providers: [{ provide: BookingService, useValue: {} }],
    });
  });

  it('keeps all five summary counts independent of the search results', () => {
    const fixture = TestBed.createComponent(LostAndFound);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    const values = () => Array.from(
      fixture.nativeElement.querySelectorAll('.lost-statistics .viago-card__stat-value'),
      (element: any) => Number(element.textContent.trim()),
    );
    const before = values();
    expect(before).toEqual([9, 4, 2, 2, 1]);
    expect(fixture.nativeElement.querySelector('.lost-statistics button, .lost-statistics [role="button"]')).toBeNull();
    page.searchText = 'no-matching-lost-item-123';
    page.filterData();
    fixture.detectChanges();
    expect(page.filteredItems).toHaveLength(0);
    expect(values()).toEqual(before);
    expect(fixture.nativeElement.querySelector('app-admin-page-header .eyebrow').textContent.trim()).toBe('Khách hàng / Đồ thất lạc');
  });

  it('uses nine items per page and changes the rendered items through the shared pager', () => {
    const fixture = TestBed.createComponent(LostAndFound);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    const item = page.items[0];
    page.items = Array.from({ length: 20 }, (_, index) => ({
      ...item, ma_do_that_lac: `DTL_TEST_${index}`,
    }));
    page.filterData();
    fixture.detectChanges();
    expect(page.paginatedItems).toHaveLength(9);
    const firstIds = page.paginatedItems.map((row) => row.ma_do_that_lac);
    const pageTwo = fixture.nativeElement.querySelector('app-pagination button[aria-label="Trang 2"]') as HTMLButtonElement;
    pageTwo.click();
    fixture.detectChanges();
    expect(page.currentPage).toBe(2);
    expect(page.paginatedItems).toHaveLength(9);
    expect(page.paginatedItems.every((row) => !firstIds.includes(row.ma_do_that_lac))).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.cards-grid .lost-card')).toHaveLength(9);
  });
});
