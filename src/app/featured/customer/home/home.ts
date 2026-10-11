import { afterNextRender, ChangeDetectorRef, Component, DestroyRef, HostListener, inject, Injector, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CustomerNavigationService } from '../../../core/services/customer-navigation.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Button } from '../../../shared/components/button/button';
import { Input } from '../../../shared/components/input/input';
import { Select } from '../../../shared/components/input/select/select';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker';
import { SearchableDropdown } from '../../../shared/components/searchable-dropdown/searchable-dropdown';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { Badge } from '../../../shared/components/badge/badge';
import { Amenities } from '../../../shared/components/amenities/amenities';
import { Toast } from '../../../shared/components/toast/toast';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { QrCode } from '../../../shared/components/qr-code/qr-code';
import { VoucherCard, VoucherItem } from '../../../shared/components/voucher-card/voucher-card';
import { SeatMap, SeatStatus, displaySeatLabel } from '../../../shared/components/seat-map/seat-map';
import { DestinationService, DestinationWeather } from './destination-service';
import { BookingError, BookingService, BOOKING_KEY, CATALOG_KEY } from './booking.service';
import { BookingDraft, BookingLeg, BookingOrder, BookingState, BookingStep, Passenger, SearchRequest, Trip, TripPoint, normalizeName, normalizePhone, passengerErrors, vietnamDate } from './booking.models';
import { CITIES, ROUTES, VOUCHERS } from './booking.data';

@Component({
  imports: [CommonModule, FormsModule, RouterLink, Button, Input, Select, DatePickerComponent, SearchableDropdown, ModalComponent, Badge, Amenities, Toast, Pagination, QrCode, VoucherCard, SeatMap],
  selector: 'app-home',
  styleUrls: ['./home.css', './home-original-layout.css', './home-reference-completion.css', './home-destination.css', './home-review.css', './home-payment.css'],
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
  readonly authService = inject(AuthService);
  openLogin(): void { this.customerNavigation.showAuth(); }
  readonly Math = Math;
  readonly booking = inject(BookingService);
  recentSearches: SearchRequest[] = [];
  private readonly cd = inject(ChangeDetectorRef);
  private readonly injector = inject(Injector);
  private readonly customerNavigation = inject(CustomerNavigationService);
  private readonly destroyRef = inject(DestroyRef);
  focusedRoom = '';
  seatLimitNotice = 0;
  private seatLimitSequence = 0;
  private roomFocusTimer?: ReturnType<typeof setTimeout>;
  private readonly route = inject(ActivatedRoute);
  private readonly destinationService = inject(DestinationService);
  destinationWeather: DestinationWeather | null = null; weatherLoading = false; weatherError = '';
  private weatherRequest?: AbortController; private weatherOrder = '';
  get destinationTrip(): Trip | null { return this.order ? this.tripFor(this.order.legs[this.order.legs.length - 1]) : null; }
  get destinationCity(): string { return this.destinationTrip?.to || ''; }
  get destinationArrivalDate(): string { return this.destinationTrip ? vietnamDate(Date.parse(this.destinationTrip.arrivalAt)) : ''; }
  get weatherDescription(): string { const code = this.destinationWeather?.code; return code === 0 ? 'Trời quang' : code !== undefined && code <= 3 ? 'Có mây' : code !== undefined && code >= 95 ? 'Có thể có dông' : code !== undefined && code >= 51 ? 'Có thể có mưa' : 'Sương mù'; }
  async loadDestinationWeather(): Promise<void> {
    if (!this.destinationTrip) return;
    this.weatherRequest?.abort(); const controller = new AbortController(); this.weatherRequest = controller;
    const id = this.order!.id; this.weatherOrder = id; this.weatherLoading = true; this.weatherError = ''; this.destinationWeather = null;
    const timeout = setTimeout(() => controller.abort(), 8000);
    try { const forecast = await this.destinationService.weather(this.destinationCity, this.destinationArrivalDate, controller.signal); if (!controller.signal.aborted && this.order?.id === id) this.destinationWeather = forecast; }
    catch (e) { if (this.order?.id === id && this.weatherRequest === controller) this.weatherError = controller.signal.aborted ? 'Chưa tải được dự báo. Vui lòng thử lại.' : this.message(e); }
    finally { clearTimeout(timeout); if (this.weatherRequest === controller) { this.weatherLoading = false; this.cd.markForCheck(); } }
  }
  get destinationTips() { return [
    {title:'Mang theo áo mưa hoặc ô',text:this.destinationWeather && this.destinationWeather.rain >= 40 ? 'Dự báo có khả năng mưa. Chuẩn bị vật dụng che mưa cho hành trình.' : 'Chuẩn bị vật dụng phù hợp với thời tiết tại điểm đến.'},
    {title:'Bảo vệ giấy tờ và thiết bị điện tử',text:'Sử dụng túi chống nước cho hành lý khi cần thiết.'},
    {title:'Chuẩn bị sạc dự phòng cầm tay',text:'Giữ điện thoại đủ pin để liên hệ khi xe cập bến.'},
    {title:'Chuẩn bị phương tiện đi tiếp',text:'Kiểm tra địa chỉ điểm trả và liên hệ hỗ trợ trung chuyển trước khi đến.'},
  ]; }
  accommodationUrl(query = ''): string { return `https://www.booking.com/searchresults.vi.html?ss=${encodeURIComponent(`${query} ${this.destinationCity}`.trim())}`; }
  readonly accommodationCards = [{image:'hotel_1.jpg',label:'Khách sạn tại trung tâm'}, {image:'hotel_2.jpg',label:'Lưu trú gần điểm trả'}, {image:'hotel_3.jpg',label:'Khách sạn cho gia đình'}];
  readonly cities = CITIES;
  readonly popularRoutes = ROUTES;
  readonly vouchers = VOUCHERS;
  promoPage = 1;
  savedPromos = new Set<string>();
  readonly homePromos: VoucherItem[] = [
    { id: 'v1', code: 'WELCOME50', title: 'GIẢM 50K', description: 'Giảm ngay 50.000đ cho hành trình đầu tiên', value: 50000, type: 'fixed', expiryDate: '31/12/2026' },
    { id: 'v2', code: 'SUMMER10', title: 'GIẢM 10%', description: 'Giảm 10% tối đa 30.000đ cho chuyến đi mùa hè', value: 10, type: 'percentage', expiryDate: '31/08/2026', isExpired: true },
    { id: 'v3', code: 'MIDWEEK10', title: 'GIẢM 10K', description: 'Giảm ngay 10.000đ cho chuyến đi giữa tuần', value: 10000, type: 'fixed', expiryDate: '31/12/2026' },
    { id: 'v4', code: 'VIAGO30', title: 'GIẢM 30K', description: 'Giảm 30.000đ khi đặt vé qua ví điện tử', value: 30000, type: 'fixed', expiryDate: '31/12/2026' },
  ];
  get paginatedPromos(): VoucherItem[] { return this.homePromos.slice((this.promoPage - 1) * 3, this.promoPage * 3); }
  savePromo(voucher: VoucherItem): void { this.savedPromos.add(voucher.code); }
  get featuredRoutes() { return ['Đà Lạt', 'Vũng Tàu', 'Nha Trang'].map(to => ROUTES.find(route => route.from === 'TP.HCM' && route.to === to)!); }
  readonly homeNews = [
    { id: 101, image: 'nha_trang.jpg', date: '01/01/2026', title: 'VIAGO mở thêm chuyến Đà Lạt - Nha Trang', description: 'Nhằm đáp ứng nhu cầu đi lại ngày càng tăng, VIAGO chính thức bổ sung thêm 5 chuyến xe mỗi ngày trên tuyến Đà Lạt - Nha Trang...' },
    { id: 102, image: 'ben_xe.jpg', date: '20/05/2026', title: 'Cập nhật lịch trình tại BX Miền Đông mới', description: 'Lịch trình mới nhất áp dụng cho mùa hè 2026 sẽ giúp quý khách dễ dàng sắp xếp thời gian cho các hành trình tại BX Miền Đông mới...' },
    { id: 103, image: 'summer.jpg', date: '01/06/2026', title: 'Ưu đãi hè rực rỡ: Giảm ngay 10% giá vé', description: 'Đón mùa du lịch hè 2026, VIAGO tung chương trình khuyến mãi cực lớn cho tất cả khách hàng đặt vé trực tuyến qua website...' },
  ];
  expandedTrip: Trip | null = null;
  expandedTab = '';
  toggleTripTab(trip: Trip, tab: string): void { if (this.expandedTrip?.id === trip.id && this.expandedTab === tab) { this.expandedTrip = null; this.expandedTab = ''; } else { this.expandedTrip = trip; this.expandedTab = tab; } }
  readonly seatLabel = displaySeatLabel;
  seatLabels(seats: string[]): string { return seats.map(displaySeatLabel).join(', '); }
  legFor(trip: Trip): BookingLeg | undefined { return this.draft.legs.find(leg => leg.tripId === trip.id); }
  seatStatuses(trip: Trip): Record<string, SeatStatus> { return Object.fromEntries(trip.seats.map(seat => [seat, this.seatStatus(trip, seat)])); }
  disabledSeatIds(trip: Trip): string[] { return trip.seats.filter(seat => ['sold', 'held'].includes(this.seatStatus(trip, seat))); }
  async choosePreviewSeat(trip: Trip, seat: string): Promise<void> {
    if (this.pendingDraft) { this.revealPendingBooking(); return; }
    if (this.seatBusy) return;
    const index = this.appliedSearch?.roundTrip ? this.resultLeg : 0;
    const old = this.draft.legs[index];
    if (old && old.tripId !== trip.id && this.seatCount) {
      if (!await this.requestLeave() || this.pendingDraft) return;
      this.draft = this.emptyDraft(); this.expiresAt = 0;
    }
    if (!this.booking.isOpen(trip)) { this.error = 'Chuyến đã ngừng bán vé.'; return; }
    if (index === 1 && !this.draft.legs[0] && this.selectedOutbound) this.draft.legs[0] = this.newLeg(this.selectedOutbound);
    if (index === 1 && !this.draft.legs[0]) { this.error = 'Chọn chuyến đi trước.'; return; }
    if (!this.draft.legs[index] || this.draft.legs[index].tripId !== trip.id) this.draft.legs[index] = this.newLeg(trip);
    this.draft.search = this.appliedSearch ? { ...this.appliedSearch } : undefined;
    if (index === 0 && this.appliedSearch?.roundTrip) this.selectedOutbound = trip;
    this.seatLeg = index; await this.toggleSeat(seat);
  }
  continuePreview(trip: Trip): void { this.selectTrip(trip); }
  async toggleLegSeat(index: number, seat: string): Promise<void> { this.seatLeg = index; await this.toggleSeat(seat); }
  configureLegSeat(index: number, seat: string, value: string): void { this.seatLeg = index; this.doubleSeat(seat, value); }
  private newLeg(trip: Trip): BookingLeg { return { tripId: trip.id, seats: [], doubleSeats: [], pickupId: '', dropoffId: '' }; }
  seatsFor(trip: Trip, level: string): string[] { return trip.seats.filter(seat => seat.endsWith(level)); }
  interiorGallery: { images: string[]; index: number; title: string } | null = null;
  openInterior(trip: Trip, image: string): void {
    const images = this.vehicleImages(trip);
    this.interiorGallery = { images, index: Math.max(0, images.indexOf(image)), title: `Nội thất ${trip.type}` };
  }
  moveInterior(direction: number): void {
    const gallery = this.interiorGallery;
    if (gallery) gallery.index = (gallery.index + direction + gallery.images.length) % gallery.images.length;
  }
  vehicleImages(trip: Trip): string[] { return trip.type === 'Limousine 9 chỗ' ? ['limo_9_1.jpg', 'limo_9_2.jpg', 'limo_9_3.jpg'] : trip.type === 'Cabin 22 chỗ' ? ['sleeper_22_3.jpg', 'sleeper_22_2.jpg', 'sleeper_22_1.png'] : ['sleeper_34_1.jpg', 'sleeper_34_2.jpg', 'sleeper_34_3.jpg']; }
  readonly types = ['Limousine 9 chỗ', 'Cabin 22 chỗ', 'Giường nằm 34 chỗ'].map(value => ({ label: value, value }));
  readonly countOptions = [1, 2, 3, 4, 5].map(value => ({ label: `${value} vé`, value: String(value) }));
  readonly sortOptions = [{ label: 'Giờ đi sớm nhất', value: 'early' }, { label: 'Giờ đi muộn nhất', value: 'late' }, { label: 'Giá thấp nhất', value: 'price' }];
  readonly methods = [{ id: 'vietqr', name: 'VietQR', image: 'VietQR_Logo.png' }, { id: 'vnpay', name: 'VNPay', image: 'VNPay_logo.png' }, { id: 'momo', name: 'MoMo', image: 'MoMo_Logo.png' }, { id: 'zalopay', name: 'ZaloPay', image: 'zalopay_logo.svg' }];
  step: BookingStep = 'home';
  searchForm: SearchRequest = { from: 'TP.HCM', to: 'Đà Lạt', date: vietnamDate(), returnDate: '', roundTrip: false, count: 1 };
  appliedSearch: SearchRequest | null = null;
  searchTouched = false; searching = false; searchError = '';
  private searchVersion = 0;
  trips: Trip[] = []; returnTrips: Trip[] = []; resultLeg = 0;
  typeFilter = ''; timeFilter = ''; floorFilter = ''; positionFilter = ''; priceFilter = ''; sort = 'early'; page = 1;
  timeChoices = new Set<string>(); positionChoices = new Set<string>(); priceChoices = new Set<string>();
  toggleFilter(group: 'time' | 'position' | 'price', value: string): void { const choices = group === 'time' ? this.timeChoices : group === 'position' ? this.positionChoices : this.priceChoices; choices.has(value) ? choices.delete(value) : choices.add(value); this.page = 1; }
  selectedOutbound: Trip | null = null;
  details: Trip | null = null; detailTab = 'amenities';
  draft: BookingDraft = this.emptyDraft();
  state: BookingState = { holds: [], orders: [], audit: [] };
  pendingDraft: BookingDraft | null = null;
  order: BookingOrder | null = null;
  passengerTouched: Partial<Record<keyof Passenger, boolean>> = {};
  foundCustomer: Passenger | null = null;
  seatLeg = 0; floor = 'A'; pointErrors = false;
  voucherInput = ''; voucherError = ''; voucherOpen = false; discount = 0;
  voucherCelebrating = false;
  private confettiTimer?: ReturnType<typeof setTimeout>;
  readonly confettiPieces = Array.from({ length: 32 }, (_, i) => ({ id: i, left: `${5 + (i * 29 % 90)}%`, delay: `${i % 8 * 40}ms`, drift: `${(i % 2 ? 1 : -1) * (20 + i % 7 * 12)}px`, rotation: `${(i % 2 ? 1 : -1) * (180 + i * 23)}deg`, color: ['var(--color-accent-600)', 'var(--color-primary-600)', 'var(--color-success-500)', 'var(--color-info-500)', 'var(--color-warning-500)'][i % 5] }));
  lookupNote = '';
  expiresAt = 0; clock = Date.now(); seatBusy = false; submitting = false; paymentBusy = false;
  error = ''; failureCode = ''; failureMessage = '';
  leaveOpen = false; private leaveResolve?: (allow: boolean) => void;
  paymentConfirm = false; ticketOpen = false;
  holdExpiredOpen = false;
  method = 'vietqr'; heroIndex = 0;
  get methodName(): string { return this.methods.find(item => item.id === this.method)?.name || 'VietQR'; }
  get methodIndex(): number { return Math.max(0, this.methods.findIndex(item => item.id === this.method)); }
  get ticketUrl(): string { return this.order?.ticketToken ? `${location.origin}/customer?ticket=${encodeURIComponent(this.order.ticketToken)}` : ''; }
  returnHome(): void {
    this.searchVersion++;
    this.searching = false; this.searchError = ''; this.searchTouched = false;
    this.expandedTrip = null;
    this.interiorGallery = null;
    if (this.hasDraft && this.seatCount > 0) {
      this.persistDraft();
      this.pendingDraft = structuredClone(this.draft);
    }
    this.leaveResolve?.(false); this.leaveResolve = undefined;
    this.leaveOpen = false; this.details = null; this.paymentConfirm = false;
    this.ticketOpen = false; this.voucherOpen = false; this.holdExpiredOpen = false;
    clearTimeout(this.roomFocusTimer); this.focusedRoom = '';
    this.step = 'home'; this.draft = this.emptyDraft(); this.order = null;
    this.expiresAt = 0; this.error = ''; this.seatLimitNotice = 0; this.pushStep();
  }
  private timer?: ReturnType<typeof setInterval>; private heroTimer?: ReturnType<typeof setInterval>;
  private alive = true; private expiring = false; private tickCount = 0; private ticking = false;

  private emptyDraft(): BookingDraft { return { owner: crypto.randomUUID(), legs: [], passenger: { name: '', phone: '', email: '' }, voucher: '', terms: false, key: crypto.randomUUID() }; }
  get today(): string { return vietnamDate(this.clock); }
  get departureCities(): string[] { return this.cities; }
  get destinationCities(): string[] { return this.cities.filter(city => city !== this.searchForm.from); }
  get searchErrors(): Record<string, string> {
    const f = this.searchForm, errors: Record<string, string> = {};
    if (!this.cities.includes(f.from)) errors['from'] = 'Chọn điểm đi trong danh sách.';
    if (!this.cities.includes(f.to) || f.to === f.from) errors['to'] = 'Chọn điểm đến khác điểm đi.';
    if (!this.validDate(f.date) || f.date < this.today) errors['date'] = 'Chọn ngày đi từ hôm nay.';
    if (f.roundTrip && (!this.validDate(f.returnDate) || f.returnDate < f.date)) errors['returnDate'] = 'Ngày về phải từ ngày đi trở đi.';
    if (!Number.isInteger(f.count) || f.count < 1 || f.count > (f.roundTrip ? 2 : 5)) errors['count'] = f.roundTrip ? 'Khứ hồi tối đa 2 vé mỗi chiều (5 ghế/đơn).' : 'Chọn từ 1–5 vé.';
    return errors;
  }
  private validDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
  get errors(): Partial<Record<keyof Passenger, string>> { return passengerErrors(this.draft.passenger); }
  get currentLeg(): BookingLeg | undefined { return this.draft.legs[this.seatLeg]; }
  get currentTrip(): Trip | null { return this.currentLeg ? this.booking.trip(this.currentLeg.tripId) : null; }
  get seatCount(): number { return this.draft.legs.reduce((sum, leg) => sum + leg.seats.length, 0); }
  get secondsLeft(): number { return this.expiresAt ? Math.min(600, Math.max(0, Math.ceil((this.expiresAt - this.clock) / 1000))) : 0; }
  get countdown(): string { const seconds = this.secondsLeft; return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  get pendingCountdown(): string { const expiry = Math.min(...this.state.holds.filter(h => h.owner === this.pendingDraft?.owner).map(h => h.expiresAt)); const seconds = Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - this.clock) / 1000)) : 0; return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  get subtotal(): number { return this.booking.subtotal(this.draft.legs); }
  get total(): number { return Math.max(0, this.subtotal - this.discount); }
  get canReview(): boolean {
    return this.draft.legs.length > 0 && this.draft.legs.every(leg => leg.seats.length > 0 && !this.pointError(leg, 'pickup') && !this.pointError(leg, 'dropoff')) && this.seatCount <= 5 && !Object.keys(this.errors).length && this.draft.terms && this.secondsLeft > 0 && !this.voucherError && !this.seatBusy;
  }
  get filteredTrips(): Trip[] {
    return [...(this.resultLeg ? this.returnTrips : this.trips)].filter(trip => {
      if (!this.booking.isOpen(trip) || this.booking.available(trip, this.state, this.draft.owner) < (this.appliedSearch?.count || 1)) return false;
      if (this.typeFilter && trip.type !== this.typeFilter) return false;
      const prices = this.priceChoices.size ? [...this.priceChoices] : this.priceFilter ? [this.priceFilter] : [];
      if (prices.length && !prices.some(value => value === 'under300' ? trip.price < 300000 : trip.price >= 300000)) return false;
      if (this.resultLeg && this.selectedOutbound && Date.parse(trip.departureAt) <= Date.parse(this.selectedOutbound.arrivalAt)) return false;
      const hour = Number(this.time(trip.departureAt).slice(0, 2));
      const times = this.timeChoices.size ? [...this.timeChoices] : this.timeFilter ? [this.timeFilter] : [];
      if (times.length && !times.some(value => value === 'early' ? hour < 6 : value === 'morning' ? hour >= 6 && hour < 12 : value === 'afternoon' ? hour >= 12 && hour < 18 : hour >= 18)) return false;
      const positions = this.positionChoices.size ? [...this.positionChoices] : this.positionFilter ? [this.positionFilter] : [];
      return trip.seats.some(seat => ['available', 'selected'].includes(this.seatStatus(trip, seat)) && (!this.floorFilter || seat.endsWith(this.floorFilter)) && (!positions.length || positions.some(value => value === 'front' ? parseInt(seat) <= 4 : value === 'middle' ? parseInt(seat) >= 5 && parseInt(seat) <= 8 : parseInt(seat) >= 9)));
    }).sort((a, b) => this.sort === 'price' ? a.price - b.price : (Date.parse(a.departureAt) - Date.parse(b.departureAt)) * (this.sort === 'late' ? -1 : 1));
  }
  get visibleTrips(): Trip[] { return this.filteredTrips.slice((this.page - 1) * 6, this.page * 6); }
  ngOnInit(): void {
    this.customerNavigation.homeRequested.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.returnHome());
    void this.load();
    this.timer = setInterval(() => void this.tick(), 1000);
    this.heroTimer = setInterval(() => { this.heroIndex = (this.heroIndex + 1) % 3; this.cd.markForCheck(); }, 6000);
  }
  ngOnDestroy(): void { this.alive = false; clearTimeout(this.roomFocusTimer); clearTimeout(this.confettiTimer); clearInterval(this.timer); clearInterval(this.heroTimer); this.weatherRequest?.abort(); this.leaveResolve?.(false); }
  async load(): Promise<void> {
    this.searchError = '';
    this.pendingDraft = null;
    try {
      let history: unknown = []; try { history = JSON.parse(localStorage.getItem('viago_customer_recent_searches_v1') || '[]'); } catch { history = []; }
      this.recentSearches = Array.isArray(history) ? history.filter(item => item && CITIES.includes(item.from) && CITIES.includes(item.to) && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isInteger(item.count) && item.count >= 1 && item.count <= 5).slice(0, 5) : [];
      this.booking.catalog(); await this.booking.sweep(); this.state = this.booking.state();
      const saved = this.booking.loadDraft();
      if (saved && Array.isArray(saved.legs) && saved.owner && saved.passenger) {
        const pending = this.booking.pending(saved.owner);
        if (pending) { this.pendingDraft = saved; }
        else if (this.state.holds.some(h => h.owner === saved.owner && h.expiresAt > this.clock)) this.pendingDraft = saved;
        else this.booking.clearDraft();
      }
      const p = this.route.snapshot.queryParamMap;
      const token = p.get('ticket');
      if (token) {
        const paid = this.state.orders.find(order => order.status === 'paid' && order.ticketToken === token);
        if (paid) { this.order = paid; this.draft = structuredClone(paid); this.step = 'success'; this.ticketOpen = true; }
        else this.error = 'Không tìm thấy vé. Vui lòng kiểm tra mã vé hoặc liên hệ hỗ trợ.';
      }
      const from = p.get('departure') || p.get('from'), to = p.get('destination') || p.get('to');
      if (from) this.searchForm.from = from === 'TP. Hồ Chí Minh' ? 'TP.HCM' : from;
      if (to) this.searchForm.to = to;
      if (p.get('date')) this.searchForm.date = p.get('date')!;
      if (p.get('autoSearch') === 'true') await this.search();
    } catch (e) { this.searchError = this.message(e); }
    this.cd.markForCheck();
    if (this.pendingDraft && !this.error && !this.searchError) this.revealPendingBooking();
  }
  private message(error: unknown): string { return error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.'; }
  private revealPendingBooking(): void {
    this.error = '';
    this.cd.markForCheck();
    afterNextRender(() => {
      if (!this.alive || !this.pendingDraft) return;
      const banner = document.getElementById('pending-booking');
      if (!banner) return;
      const navbar = parseFloat(getComputedStyle(banner).getPropertyValue('--customer-navbar-height')) || 120;
      const top = Math.max(0, window.scrollY + banner.getBoundingClientRect().top - navbar - 24);
      banner.focus({ preventScroll: true });
      window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }, { injector: this.injector });
  }
  async search(): Promise<void> {
    if (this.searching) return; this.searchTouched = true;
    const version = ++this.searchVersion;
    if (Object.keys(this.searchErrors).length) return;
    if (this.draft.legs.length && !await this.requestLeave()) return;
    if (!this.alive || version !== this.searchVersion) return;
    const query = { ...this.searchForm };
    this.searching = true; this.searchError = '';
    this.cd.markForCheck();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([this.booking.sweep(), new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Tìm chuyến quá lâu. Vui lòng thử lại.')), 5000);
      })]);
      if (!this.alive || version !== this.searchVersion) return;
      this.state = this.booking.state();
      this.trips = this.booking.search(query.from, query.to, query.date);
      this.returnTrips = query.roundTrip ? this.booking.search(query.to, query.from, query.returnDate) : [];
      this.appliedSearch = query; this.resultLeg = 0; this.selectedOutbound = null; this.resetFilters();
      this.recentSearches = [query, ...this.recentSearches.filter(item => item.from !== query.from || item.to !== query.to || item.date !== query.date || item.returnDate !== query.returnDate || item.count !== query.count || item.roundTrip !== query.roundTrip)].slice(0, 5);
      try { localStorage.setItem('viago_customer_recent_searches_v1', JSON.stringify(this.recentSearches)); } catch { /* Optional search history must not prevent booking. */ }
      this.step = 'results'; this.draft = this.emptyDraft(); this.pushStep();
    } catch (e) { if (this.alive && version === this.searchVersion) this.searchError = this.message(e); }
    finally {
      clearTimeout(timeout);
      if (this.alive && version === this.searchVersion) {
        this.searching = false; this.cd.markForCheck();
        if (this.pendingDraft && !this.searchError) this.revealPendingBooking();
      }
    }
  }
  resetFilters(): void { this.typeFilter = ''; this.timeFilter = ''; this.floorFilter = ''; this.positionFilter = ''; this.priceFilter = ''; this.timeChoices.clear(); this.positionChoices.clear(); this.priceChoices.clear(); this.sort = 'early'; this.page = 1; }
  updateSearch(field: 'from' | 'to', value: string): void { this.searchForm[field] = value || ''; }
  useRecentSearch(query: SearchRequest): void { this.searchForm = { ...query }; this.searchTouched = false; }
  legSubtotal(leg: BookingLeg): number { return this.booking.subtotal([leg]); }
  vehicleAmenities(trip: Trip): string[] { return [...(trip.type.includes('9 chỗ') ? ['Tivi giải trí'] : []), ...(trip.type.includes('9 chỗ') || trip.type.includes('22 chỗ') ? ['Cổng sạc USB', 'GPS định vị'] : []), 'Wifi tốc độ cao', 'Nước uống, khăn lạnh', 'Điều hòa thông gió']; }
  swap(): void { [this.searchForm.from, this.searchForm.to] = [this.searchForm.to, this.searchForm.from]; }
  popular(from: string, to: string): void { this.searchForm.from = from; this.searchForm.to = to; document.getElementById('booking-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  showDetails(trip: Trip): void { this.details = trip; this.detailTab = 'amenities'; }
  async selectTrip(trip: Trip): Promise<void> {
    if (this.seatBusy || this.submitting || this.paymentBusy) { this.error = 'Vui lòng chờ thao tác hiện tại hoàn tất.'; return; }
    if (this.pendingDraft) { this.details = null; this.revealPendingBooking(); return; }
    if (!this.booking.isOpen(trip) || this.booking.available(trip, this.state, this.draft.owner) < (this.appliedSearch?.count || 1)) { this.error = 'Chuyến đã ngừng bán vé hoặc không còn đủ ghế.'; return; }
    const index = this.appliedSearch?.roundTrip ? this.resultLeg : 0;
    if (this.seatCount && this.draft.legs[index] && this.draft.legs[index].tripId !== trip.id) {
      if (!await this.requestLeave() || this.pendingDraft) return;
      this.draft = this.emptyDraft(); this.expiresAt = 0;
    }
    this.details = null;
    if (this.appliedSearch?.roundTrip && this.resultLeg && !this.selectedOutbound) { this.error = 'Chọn chuyến đi trước.'; return; }
    if (this.appliedSearch?.roundTrip && !this.resultLeg) { this.selectedOutbound = trip; this.resultLeg = 1; this.page = 1; this.resetFilters(); return; }
    const selected = this.appliedSearch?.roundTrip ? [this.selectedOutbound!, trip] : [trip];
    this.draft.legs = selected.map(t => this.draft.legs.find(leg => leg.tripId === t.id) || this.newLeg(t));
    this.draft.search = this.appliedSearch ? { ...this.appliedSearch } : undefined;
    this.error = ''; this.order = null; this.seatLeg = 0; this.floor = 'A'; this.expandedTrip = null;
    this.step = 'booking'; this.pushStep();
  }
  seatStatus(trip: Trip, seat: string): 'available' | 'held' | 'sold' | 'selected' { return this.booking.seatStatus(trip, seat, this.draft.owner, this.state); }
  seatDisabled(trip: Trip, seat: string): boolean { const status = this.seatStatus(trip, seat); return this.seatBusy || status === 'sold' || status === 'held'; }
  async toggleSeat(seat: string): Promise<void> {
    if (!this.currentLeg || !this.currentTrip || this.seatBusy) return;
    const selected = this.currentLeg.seats.includes(seat);
    if (this.seatDisabled(this.currentTrip, seat)) return;
    if (!selected && this.seatCount >= 5) { this.error = ''; this.seatLimitNotice = ++this.seatLimitSequence; this.cd.markForCheck(); return; }
    this.seatLimitNotice = 0;
    const legs = structuredClone(this.draft.legs), leg = legs[this.seatLeg];
    leg.seats = selected ? leg.seats.filter(s => s !== seat) : [...leg.seats, seat];
    leg.doubleSeats = leg.doubleSeats.filter(s => leg.seats.includes(s));
    const owner = this.draft.owner, deadline = this.expiresAt;
    this.seatBusy = true; this.error = '';
    try {
      const expiry = await this.booking.hold(owner, legs, deadline);
      if (this.draft.owner !== owner) { await this.booking.release(owner); return; }
      this.expiresAt = expiry; this.clock = this.booking.now(); this.draft.legs = legs; this.state = this.booking.state(); this.recalculateVoucher(); this.persistDraft();
      if (!selected && this.tripFor(leg).type === 'Cabin 22 chỗ') this.focusRoomConfiguration(this.seatLeg, seat, owner);
    }
    catch (e) { this.error = this.message(e); this.state = this.booking.state(); }
    finally { this.seatBusy = false; this.cd.markForCheck(); }
  }
  doubleSeat(seat: string, value: string): void { const leg = this.currentLeg; if (!leg || this.seatBusy || !leg.seats.includes(seat) || this.tripFor(leg).type !== 'Cabin 22 chỗ' || !['single', 'double'].includes(value)) return; leg.doubleSeats = leg.doubleSeats.filter(s => s !== seat); if (value === 'double') leg.doubleSeats.push(seat); this.recalculateVoucher(); this.persistDraft(); }
  private focusRoomConfiguration(index: number, seat: string, owner: string): void {
    const key = `${index}:${seat}`;
    this.focusedRoom = key;
    clearTimeout(this.roomFocusTimer);
    afterNextRender(() => {
      if (!this.alive || this.draft.owner !== owner || this.focusedRoom !== key || !this.draft.legs[index]?.seats.includes(seat)) return;
      const control = document.getElementById(`room-${index}-${seat}`) as HTMLSelectElement | null;
      const row = control?.closest<HTMLElement>('.room-config-card');
      if (!control || !row) return;
      const section = row.closest<HTMLElement>('.cabin-config-panel');
      if (!section) return;
      const navbar = parseFloat(getComputedStyle(row).getPropertyValue('--customer-navbar-height')) || 120;
      const banner = document.querySelector('.hold-banner')?.getBoundingClientRect().height || 0;
      const top = Math.max(0, window.scrollY + section.getBoundingClientRect().top - navbar - banner - 24);
      window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      this.roomFocusTimer = setTimeout(() => { if (this.focusedRoom === key) { this.focusedRoom = ''; if (this.alive) this.cd.markForCheck(); } }, 2400);
    }, { injector: this.injector });
  }
  roomSummary(leg: BookingLeg): string { return leg.seats.map(seat => `${this.seatLabel(seat)}: ${leg.doubleSeats.includes(seat) ? 'Phòng đôi' : 'Phòng đơn'}`).join(' · '); }
  setLeg(index: number): void { this.seatLeg = index; this.floor = 'A'; }
  updatePassenger(field: keyof Passenger, value: string): void {
    this.draft.passenger[field] = field === 'phone' ? normalizePhone(value) : value;
    this.passengerTouched[field] = true;
    if (field === 'phone') { this.lookupNote = ''; this.foundCustomer = null; }
    if (field === 'phone') this.recalculateVoucher();
    this.persistDraft();
  }
  lookupCustomer(): void {
    this.passengerTouched.phone = true;
    if (this.errors.phone) return;
    try {
      this.foundCustomer = this.booking.customer(this.draft.passenger.phone);
      if (this.foundCustomer) {
        this.draft.passenger.name = this.foundCustomer.name;
        this.draft.passenger.email = this.foundCustomer.email;
        this.passengerTouched.name = true; this.passengerTouched.email = true;
        this.lookupNote = 'Đã điền thông tin khách hàng.';
        this.persistDraft();
      } else { this.lookupNote = 'Không tìm thấy thông tin với SĐT này.'; }
    }
    catch (e) { this.error = this.message(e); }
  }
  point(leg: BookingLeg, kind: 'pickup' | 'dropoff'): TripPoint | undefined { const trip = this.booking.trip(leg.tripId); return trip[kind].find(p => p.id === (kind === 'pickup' ? leg.pickupId : leg.dropoffId)); }
  pointError(leg: BookingLeg, kind: 'pickup' | 'dropoff'): string {
    const point = this.point(leg, kind);
    if (!point) return kind === 'pickup' ? 'Chọn điểm đón.' : 'Chọn điểm trả.';
    if (kind === 'pickup' && Date.parse(point.at) <= this.clock) return 'Đã qua giờ đón. Chọn điểm khác.';
    return '';
  }
  selectPoint(index: number, kind: 'pickup' | 'dropoff', id: string): void { this.draft.legs[index][kind === 'pickup' ? 'pickupId' : 'dropoffId'] = id; this.persistDraft(); }
  readonly pointKinds = ['pickup', 'dropoff'] as const;
  pointMapUrl(point: TripPoint): string { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.name}, ${point.address}`)}`; }
  arrivalBefore(point: TripPoint): string { return this.time(new Date(Date.parse(point.at) - 15 * 60000).toISOString()); }
  applyVoucher(code = this.voucherInput, celebrate = true): void {
    try { const normalized = code.trim().toUpperCase(); if (!normalized) throw new Error('Nhập mã giảm giá.'); this.discount = this.booking.voucher(normalized, this.draft.legs, this.draft.passenger.phone, this.order?.id); this.draft.voucher = normalized; this.voucherInput = normalized; this.voucherError = ''; this.voucherOpen = false; this.persistDraft(); if (celebrate) this.celebrateVoucher(); }
    catch (e) { this.voucherError = this.message(e); this.discount = 0; this.draft.voucher = ''; }
  }
  updateVoucher(value: string): void { this.voucherInput = value; this.voucherError = ''; this.draft.voucher = ''; this.discount = 0; this.persistDraft(); }
  removeVoucher(): void { this.draft.voucher = ''; this.voucherInput = ''; this.voucherError = ''; this.discount = 0; this.persistDraft(); }
  recalculateVoucher(): void { if (this.draft.voucher) this.applyVoucher(this.draft.voucher, false); }
  private celebrateVoucher(): void {
    clearTimeout(this.confettiTimer);
    this.voucherCelebrating = false; this.cd.detectChanges();
    this.voucherCelebrating = true; this.cd.markForCheck();
    this.confettiTimer = setTimeout(() => { this.voucherCelebrating = false; if (this.alive) this.cd.markForCheck(); }, 2200);
  }
  persistDraft(): void { try { if (this.draft.legs.length) this.booking.saveDraft(this.draft); } catch (e) { this.error = this.message(e); } }
  review(): void {
    this.passengerTouched = { name: true, phone: true, email: true }; this.pointErrors = true;
    this.draft.passenger.name = normalizeName(this.draft.passenger.name); this.draft.passenger.email = this.draft.passenger.email.trim();
    this.recalculateVoucher();
    if (!this.canReview) { this.error = 'Kiểm tra ghế, thông tin hành khách, điểm đón/trả và điều khoản.'; return; }
    this.error = ''; this.step = 'review'; this.persistDraft(); this.pushStep();
  }
  async createOrder(): Promise<void> {
    if (this.submitting || !this.canReview) return;
    this.submitting = true; this.error = '';
    try { this.order = await this.booking.create(this.draft, this.method); this.expiresAt = this.order.expiresAt; this.state = this.booking.state(); this.step = 'payment'; this.persistDraft(); this.pushStep(); }
    catch (e) { this.error = this.message(e); if (e instanceof BookingError && (e.code === 'expired' || e.code === 'closed')) this.fail(e); }
    finally { this.submitting = false; this.cd.markForCheck(); }
  }
  async chooseMethod(id: string): Promise<void> {
    if (this.paymentBusy || !this.order) return;
    try { this.order = await this.booking.setMethod(this.order.id, id); this.method = id; }
    catch (e) { this.error = this.message(e); }
    this.cd.markForCheck();
  }
  async pay(): Promise<void> {
    if (this.paymentBusy || !this.order) return;
    const payingId = this.order.id;
    this.paymentConfirm = false; this.paymentBusy = true; this.error = '';
    try {
      this.order = await this.booking.pay(this.order);
      if (!this.alive) return;
      this.step = 'success'; this.expiresAt = 0; this.pendingDraft = null;
      try { this.booking.clearDraft(); } catch (e) { this.error = this.message(e); }
      this.state = this.booking.state(); this.pushStep();
    } catch (e) { if (this.alive && this.order?.id === payingId) this.fail(e); }
    finally { this.paymentBusy = false; this.cd.markForCheck(); }
  }
  private fail(error: unknown): void { this.failureCode = error instanceof BookingError ? error.code : 'payment'; this.failureMessage = this.message(error); this.step = 'failure'; this.paymentConfirm = false; this.pushStep(); }
  retryPayment(): void { if (this.order && this.secondsLeft > 0 && !['expired', 'closed'].includes(this.failureCode)) { this.step = 'payment'; this.error = ''; this.pushStep(); } else void this.backToResults(); }
  async tick(): Promise<void> {
    if (!this.alive) return;
    this.clock = this.booking.now(); this.cd.markForCheck();
    if (this.ticking) return;
    this.ticking = true; this.tickCount++;
    try {
      if (this.tickCount % 5 === 0 && !this.seatBusy) { await this.booking.sweep(); this.state = this.booking.state(); }
      const savedOrder = this.order && this.state.orders.find(o => o.id === this.order!.id);
      if (savedOrder?.status === 'paid' && ['payment', 'failure'].includes(this.step)) { this.order = savedOrder; this.expiresAt = 0; this.step = 'success'; this.pushStep(); }
      if (['booking', 'review', 'payment'].includes(this.step) && this.draft.legs.some(leg => !this.booking.isOpen(this.booking.trip(leg.tripId)))) {
        await this.booking.release(this.draft.owner); this.expiresAt = 0;
        this.fail(new BookingError('closed', 'Chuyến đã ngừng bán vé. Vui lòng chọn chuyến khác.'));
      }
      if (this.expiresAt && this.secondsLeft === 0 && !this.expiring && this.step !== 'success') {
        this.expiring = true; await this.booking.sweep(); this.state = this.booking.state();
        const paid = this.order && this.state.orders.find(order => order.id === this.order!.id && order.status === 'paid');
        if (paid) { this.order = paid; this.step = 'success'; this.expiresAt = 0; this.pushStep(); }
        else { this.resetExpiredBooking(); this.holdExpiredOpen = true; }
        this.expiring = false;
      }
      if (this.pendingDraft && !this.booking.pending(this.pendingDraft.owner) && !this.state.holds.some(h => h.owner === this.pendingDraft!.owner && h.expiresAt > this.clock)) { this.booking.clearDraft(); this.pendingDraft = null; }
      if (this.step === 'results') this.page = Math.min(this.page, Math.max(1, Math.ceil(this.filteredTrips.length / 6)));
    } catch (e) { this.error = this.message(e); this.expiring = false; }
    finally { this.ticking = false; }
    if (this.step === 'success' && this.order && this.weatherOrder !== this.order.id) void this.loadDestinationWeather();
    this.cd.markForCheck();
  }
  private resetExpiredBooking(): void {
    this.booking.clearDraft(); this.pendingDraft = null; this.draft = this.emptyDraft(); this.order = null; this.expiresAt = 0;
    this.discount = 0; this.voucherInput = ''; this.voucherError = ''; this.voucherOpen = false; this.voucherCelebrating = false; clearTimeout(this.confettiTimer);
    this.passengerTouched = {}; this.pointErrors = false; this.foundCustomer = null; this.lookupNote = '';
    this.paymentConfirm = false; this.ticketOpen = false; this.details = null; this.leaveOpen = false; this.leaveResolve?.(true); this.leaveResolve = undefined;
    this.failureCode = ''; this.failureMessage = ''; this.error = ''; this.seatLeg = 0; this.floor = 'A'; this.selectedOutbound = null; this.resultLeg = 0; this.expandedTrip = null;
    this.step = this.appliedSearch ? 'results' : 'home'; this.pushStep();
  }
  @HostListener('window:storage', ['$event']) onStorage(event: StorageEvent): void {
    if (event.key === CATALOG_KEY) this.booking.refreshCatalog();
    if (event.key === BOOKING_KEY || event.key === CATALOG_KEY) void this.tick();
  }
  @HostListener('window:focus') onFocus(): void { void this.tick(); }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void { if (this.hasDraft && this.step !== 'success') { this.persistDraft(); event.preventDefault(); event.returnValue = ''; } }
  @HostListener('window:popstate') onPopState(): void { if (this.hasDraft && this.step !== 'success') { history.pushState({ booking: true }, ''); void this.backToResults(); } else { this.step = 'home'; this.cd.markForCheck(); } }
  get hasDraft(): boolean { return this.step !== 'success' && (!!this.order && this.order.status === 'pending' || this.seatCount > 0 || Object.values(this.draft.passenger).some(Boolean)); }
  requestLeave(): Promise<boolean> {
    if (!this.hasDraft) return Promise.resolve(true);
    if (this.paymentBusy || this.seatBusy || this.submitting) { this.error = 'Vui lòng chờ thao tác hiện tại hoàn tất.'; return Promise.resolve(false); }
    if (this.leaveResolve) return Promise.resolve(false);
    this.leaveOpen = true; this.cd.markForCheck(); return new Promise(resolve => this.leaveResolve = resolve);
  }
  async resolveLeave(choice: 'stay' | 'keep' | 'discard'): Promise<void> {
    try {
      if (choice === 'keep') { this.booking.saveDraft(this.draft); this.pendingDraft = structuredClone(this.draft); }
      if (choice === 'discard') { await this.booking.release(this.draft.owner); this.booking.clearDraft(); this.pendingDraft = null; this.order = null; }
      this.leaveOpen = false; this.leaveResolve?.(choice !== 'stay'); this.leaveResolve = undefined;
    } catch (e) { this.error = this.message(e); }
    this.cd.markForCheck();
  }
  async backToResults(): Promise<void> {
    if (!await this.requestLeave()) return;
    this.draft = this.emptyDraft(); this.order = null; this.expiresAt = 0; this.step = this.appliedSearch ? 'results' : 'home'; this.error = ''; this.pushStep();
  }
  resume(): void {
    if (!this.pendingDraft) return;
    if (!this.booking.pending(this.pendingDraft.owner) && !this.booking.state().holds.some(hold => hold.owner === this.pendingDraft!.owner && hold.expiresAt > this.booking.now())) {
      this.booking.clearDraft(); this.pendingDraft = null; this.cd.markForCheck(); return;
    }
    try {
      this.draft = structuredClone(this.pendingDraft); this.order = this.booking.pending(this.draft.owner) || null;
      const first = this.booking.trip(this.draft.legs[0].tripId);
      this.appliedSearch = { from: first.from, to: first.to, date: first.date, returnDate: this.draft.legs[1] ? this.booking.trip(this.draft.legs[1].tripId).date : '', count: Math.max(1, this.draft.legs[0].seats.length), roundTrip: this.draft.legs.length === 2 };
      this.searchForm = { ...this.appliedSearch }; const expiry = this.booking.holdExpiry(this.draft.owner); this.expiresAt = Number.isFinite(expiry) ? expiry : 0; this.method = this.order?.method || 'vietqr'; this.seatLeg = 0; this.floor = 'A';
      if (this.draft.search) { this.appliedSearch = { ...this.draft.search }; this.searchForm = { ...this.draft.search }; }
      this.step = this.order ? 'payment' : 'booking'; this.pendingDraft = null; this.recalculateVoucher(); this.pushStep();
    } catch (e) { this.error = this.message(e); }
  }
  async discardPending(): Promise<void> {
    if (!this.pendingDraft) return;
    try { await this.booking.release(this.pendingDraft.owner); this.booking.clearDraft(); this.pendingDraft = null; this.order = null; this.state = this.booking.state(); }
    catch (e) { this.error = this.message(e); }
    this.cd.markForCheck();
  }
  time(value: string): string { return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)); }
  date(value: string): string { return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)); }
  money(value: number): string { return `${value.toLocaleString('vi-VN')}đ`; }
  duration(trip: Trip): string { const minutes = (Date.parse(trip.arrivalAt) - Date.parse(trip.departureAt)) / 60000; return `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}`; }
  tripFor(leg: BookingLeg): Trip { return this.booking.trip(leg.tripId); }
  pointOptions(leg: BookingLeg, kind: 'pickup' | 'dropoff') { return this.tripFor(leg)[kind].filter(p => kind === 'dropoff' || Date.parse(p.at) > this.clock).map(p => ({ label: `${this.time(p.at)} · ${p.name}${p.kind === 'shuttle' ? ' (trung chuyển)' : ''}`, value: p.id })); }
  get floorSeats(): string[] { return this.currentTrip?.seats.filter(s => s.endsWith(this.floor)) || []; }
  private pushStep(): void { history.pushState({ booking: true, step: this.step }, ''); window.scrollTo({ top: 0, behavior: 'smooth' }); this.cd.markForCheck(); }
  printTicket(): void {
    if (this.order?.status !== 'paid') return;
    try {
      this.booking.auditPrint(this.order);
      this.ticketOpen = true;
      afterNextRender(() => {
        void this.printRenderedTicket();
      }, { injector: this.injector });
      this.cd.markForCheck();
    } catch (e) { this.error = this.message(e); }
  }
  private async printRenderedTicket(): Promise<void> {
    const ticket = document.querySelector<HTMLElement>('app-home .ticket-document');
    if (!ticket) return;
    await Promise.allSettled(Array.from(ticket.querySelectorAll('img')).map(image => image.decode()));
    await document.fonts.ready;
    if (!ticket.isConnected || !this.ticketOpen) return;
    window.print();
  }
  showTicket(): void { this.ticketOpen = true; this.cd.markForCheck(); }
}
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
