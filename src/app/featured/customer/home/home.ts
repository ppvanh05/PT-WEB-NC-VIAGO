import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { VoucherService, Voucher } from '../../../core/services/voucher.service';
import { ToastService } from '../../../core/services/toast.service';
import { VoucherCard } from '../../../shared/components/voucher-card/voucher-card';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker';
import { scrollToTop, todayIso } from '../../../shared/utils/form-validators';

type SearchField = 'departure' | 'destination' | 'departureDate' | 'returnDate';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VoucherCard, SearchableDropdownComponent, DatePickerComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  @ViewChild('searchPanel') searchPanel?: ElementRef<HTMLElement>;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);
  readonly voucherService = inject(VoucherService);

  private subscriptions = new Subscription();
  private heroIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly todayDate = todayIso();

  // ===== Banner =====
  heroImages = [
    '/assets/customer/hero_banner_1.png',
    '/assets/customer/hero_banner_2.png',
    '/assets/customer/hero_banner_3.png'
  ];
  currentHeroIndex = signal(0);

  // ===== Form tìm chuyến =====
  tripType: 'one-way' | 'round-trip' = 'one-way';
  departure = '';
  destination = '';
  departureDate = '';
  returnDate = '';
  ticketCount = 1;
  searchSubmitted = false;

  allCities = [
    'TP. Hồ Chí Minh',
    'Đà Lạt',
    'Nha Trang',
    'Cần Thơ',
    'Vũng Tàu',
    'Đà Nẵng',
    'Rạch Giá',
    'Buôn Ma Thuột',
    'Phan Thiết'
  ];

  routesData = [
    { cities: ['TP. Hồ Chí Minh', 'Cần Thơ'] },
    { cities: ['TP. Hồ Chí Minh', 'Vũng Tàu'] },
    { cities: ['Đà Lạt', 'Buôn Ma Thuột'] },
    { cities: ['Đà Lạt', 'Nha Trang'] },
    { cities: ['Cần Thơ', 'Rạch Giá'] },
    { cities: ['TP. Hồ Chí Minh', 'Phan Thiết'] },
    { cities: ['TP. Hồ Chí Minh', 'Đà Lạt'] },
    { cities: ['TP. Hồ Chí Minh', 'Nha Trang'] },
    { cities: ['Nha Trang', 'Đà Nẵng'] }
  ];

  departureCities: string[] = [...this.allCities];
  destinationCities: string[] = [...this.allCities];

  // ===== Tuyến phổ biến / Tin tức (dữ liệu hiển thị) =====
  readonly popularRoutes = [
    { from: 'TP. Hồ Chí Minh', to: 'Đà Lạt', image: '/assets/customer/da_lat.jpg', distance: '310km', duration: '6 giờ', price: '280.000đ' },
    { from: 'Cần Thơ', to: 'Rạch Giá', image: '/assets/customer/cho_noi.jpg', distance: '115km', duration: '2.5 giờ', price: '140.000đ' },
    { from: 'Nha Trang', to: 'Đà Nẵng', image: '/assets/customer/da_nang.jpg', distance: '530km', duration: '10 giờ', price: '350.000đ' },
  ];

  readonly testimonials = [
    { initials: 'TP', color: 'pink', name: 'Đỗ Thanh Phương', route: 'TP. Hồ Chí Minh - Vũng Tàu', content: 'Nhân viên phục vụ nhiệt tình, hướng dẫn chỗ ngồi chu đáo, 5 sao cho nhà xe. Xe chạy rất êm, tài xế lái xe cẩn thận và đón đúng giờ. Sẽ tiếp tục ủng hộ' },
    { initials: 'VA', color: 'blue', name: 'Nguyễn Văn An', route: 'TP. Hồ Chí Minh - Nha Trang', content: 'Dịch vụ chuyên nghiệp, ghế ngồi rất thoải mái. Wifi trên xe mạnh, sạc điện thoại tiện lợi. Một trải nghiệm đi đường dài tuyệt vời.' },
  ];

  readonly latestNews = [
    { id: 101, date: '01/01/2026', image: '/assets/customer/nha_trang.jpg', title: 'VIAGO mở thêm chuyến Đà Lạt - Nha Trang', summary: 'Nhằm đáp ứng nhu cầu đi lại ngày càng tăng, VIAGO chính thức bổ sung thêm 5 chuyến xe mỗi ngày trên tuyến Đà Lạt - Nha Trang...' },
    { id: 102, date: '20/05/2026', image: '/assets/customer/ben_xe.jpg', title: 'Cập nhật lịch trình tại BX Miền Đông mới', summary: 'Lịch trình mới nhất áp dụng cho mùa hè 2026 sẽ giúp quý khách dễ dàng sắp xếp thời gian cho các hành trình tại BX Miền Đông mới...' },
    { id: 103, date: '01/06/2026', image: '/assets/customer/summer.jpg', title: 'Ưu đãi hè rực rỡ: Giảm ngay 10% giá vé', summary: 'Đón mùa du lịch hè 2026, VIAGO tung chương trình khuyến mãi cực lớn cho tất cả khách hàng đặt vé trực tuyến qua website...' },
  ];

  readonly stars = [1, 2, 3, 4, 5];

  // ===== Khuyến mãi (phân trang) =====
  currentPromoPage = 1;

  get totalPromoPages(): number {
    return Math.max(1, Math.ceil(this.voucherService.publicVouchers.length / 3));
  }

  get paginatedPromos(): Voucher[] {
    const startIndex = (this.currentPromoPage - 1) * 3;
    return this.voucherService.publicVouchers.slice(startIndex, startIndex + 3);
  }

  prevPromoPage(): void {
    if (this.currentPromoPage > 1) this.currentPromoPage--;
  }

  nextPromoPage(): void {
    if (this.currentPromoPage < this.totalPromoPages) this.currentPromoPage++;
  }

  ngOnInit(): void {
    this.startHeroTimer();

    // Quay về Trang chủ (logo / menu): luôn cuộn lên đầu trang và làm mới form tìm kiếm
    this.subscriptions.add(
      this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
        const url = (event as NavigationEnd).urlAfterRedirects.split('?')[0];
        if (url === '/customer' || url === '/customer/') {
          scrollToTop();
        }
      })
    );

    // Điền sẵn tuyến khi đi từ "Đặt lại chuyến" / "Đặt vé ngay"
    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        const from = params['departure'] || params['from'];
        const to = params['destination'] || params['to'];
        if (from) this.departure = this.normalizeCity(from);
        if (to) this.destination = this.normalizeCity(to);
        if (from || to) {
          this.updateCitiesLists();
          setTimeout(() => this.scrollToSearchPanel());
        }
      })
    );
  }

  ngOnDestroy(): void {
    if (this.heroIntervalId) clearInterval(this.heroIntervalId);
    this.subscriptions.unsubscribe();
  }

  // ===== Banner =====
  private startHeroTimer(): void {
    this.heroIntervalId = setInterval(() => {
      this.currentHeroIndex.update(idx => (idx + 1) % this.heroImages.length);
    }, 5000);
  }

  private resetHeroTimer(): void {
    if (this.heroIntervalId) clearInterval(this.heroIntervalId);
    this.startHeroTimer();
  }

  setHeroIndex(index: number): void {
    this.currentHeroIndex.set(index);
    this.resetHeroTimer();
  }

  previousHeroIndex(): void {
    this.currentHeroIndex.update(idx => (idx - 1 + this.heroImages.length) % this.heroImages.length);
    this.resetHeroTimer();
  }

  nextHeroIndex(): void {
    this.currentHeroIndex.update(idx => (idx + 1) % this.heroImages.length);
    this.resetHeroTimer();
  }

  // ===== Form tìm chuyến =====
  private normalizeCity(city: string): string {
    const upper = city.trim().toUpperCase();
    if (['TP.HCM', 'TPHCM', 'TP HỒ CHÍ MINH', 'HỒ CHÍ MINH', 'TP. HỒ CHÍ MINH', 'SÀI GÒN'].includes(upper)) {
      return 'TP. Hồ Chí Minh';
    }
    return this.allCities.find(c => c.toUpperCase() === upper) || city;
  }

  private connectedCities(city: string): string[] {
    return this.routesData
      .filter(r => r.cities.includes(city))
      .map(r => r.cities.find(c => c !== city) || '');
  }

  updateCitiesLists(): void {
    this.destinationCities = this.departure
      ? this.allCities.filter(c => this.connectedCities(this.departure).includes(c))
      : [...this.allCities];
    this.departureCities = this.destination
      ? this.allCities.filter(c => this.connectedCities(this.destination).includes(c))
      : [...this.allCities];

    if (this.departure && !this.departureCities.includes(this.departure)) this.departure = '';
    if (this.destination && !this.destinationCities.includes(this.destination)) this.destination = '';
  }

  onDepartureChange(val: string): void {
    this.departure = val;
    this.updateCitiesLists();
  }

  onDestinationChange(val: string): void {
    this.destination = val;
    this.updateCitiesLists();
  }

  swapLocations(): void {
    [this.departure, this.destination] = [this.destination, this.departure];
    this.updateCitiesLists();
  }

  onTripTypeChange(): void {
    if (this.tripType === 'one-way') this.returnDate = '';
  }

  /** Lỗi của từng ô hiển thị inline ngay dưới ô (không dùng Toast). */
  getSearchError(field: SearchField): string {
    switch (field) {
      case 'departure':
        return this.departure ? '' : 'Vui lòng chọn điểm đi.';
      case 'destination':
        return this.destination ? '' : 'Vui lòng chọn điểm đến.';
      case 'departureDate':
        if (!this.departureDate) return 'Vui lòng chọn ngày đi.';
        return this.departureDate < this.todayDate ? 'Ngày đi không được ở quá khứ.' : '';
      case 'returnDate':
        if (this.tripType !== 'round-trip') return '';
        if (!this.returnDate) return 'Vui lòng chọn ngày về.';
        return this.returnDate < this.departureDate ? 'Ngày về không được trước ngày đi.' : '';
    }
  }

  showSearchError(field: SearchField): boolean {
    return this.searchSubmitted && !!this.getSearchError(field);
  }

  onSubmitSearch(): void {
    this.searchSubmitted = true;
    const fields: SearchField[] = ['departure', 'destination', 'departureDate', 'returnDate'];
    const firstInvalid = fields.find(field => this.getSearchError(field));
    if (firstInvalid) {
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-search-field="${firstInvalid}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true });
      });
      return;
    }
    this.toastService.showInfo('Chức năng đặt vé trực tuyến đang được cập nhật trên phiên bản mới.');
  }

  /** "Đặt vé ngay" ở Tuyến phổ biến: điền tuyến và cuộn lên form tìm kiếm. */
  bookRoute(dep: string, dest: string): void {
    this.departure = dep;
    this.destination = dest;
    this.updateCitiesLists();
    if (!this.departureDate) this.departureDate = this.todayDate;
    this.scrollToSearchPanel();
  }

  private scrollToSearchPanel(): void {
    scrollToTop(this.searchPanel?.nativeElement, 140);
  }
}

export { Home as HomeComponent };
