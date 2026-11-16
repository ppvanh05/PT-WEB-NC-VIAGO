import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HomeApiService } from '../home/home-api.service';
import { Amenities } from '../../../shared/components/amenities/amenities';

interface Route {
  id: string | number;
  from: string;
  to: string;
  distance: string;
  duration: string;
  price: number;
  image: string;
  tags?: string[];
  vehicleTypes: string[];
  tripsPerDay?: number;
  isFeatured?: boolean;
  featuredTag?: string;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, Amenities],
  templateUrl: './schedule.html',
  styleUrls: ['../customer-pages.css', './schedule.css', '../customer-page-theme.css'],
})
export class Schedule implements OnInit {
  searchTerm: string = '';

  constructor(private router: Router) {}

  featuredRoutes: Route[] = [];

  allRoutes: Route[] = [];

  filteredRoutes: Route[] = [];
  selectedRouteForDetails: Route | null = null;
  selectedDirection: 'forward' | 'backward' = 'forward';

  private liveTrips: Record<
    'forward' | 'backward',
    { time: string; type: string; price: number; amenities: string }[]
  > = { forward: [], backward: [] };
  get mockTrips() {
    return this.liveTrips[this.selectedDirection];
  }

  mockStops = {
    forward: { pickups: [] as string[], dropoffs: [] as string[] },
    backward: { pickups: [] as string[], dropoffs: [] as string[] },
  };

  private readonly api = inject(HomeApiService);
  error = '';
  async ngOnInit() {
    try {
      let page = 1,
        pages = 1;
      this.allRoutes = [];
      do {
        const data = await this.api.request<any>('/routes?pageSize=100&page=' + page);
        pages = data.pagination.totalPages;
        this.allRoutes.push(
          ...data.data.map((r: any) => ({
            id: r.id,
            from: r.from,
            to: r.to,
            distance: r.distance + ' km',
            duration: r.durationMinutes + ' phút',
            price: r.price,
            image: r.image || '/assets/brand/logo.png',
            vehicleTypes: r.vehicleTypes || [],
          })),
        );
        page++;
      } while (page <= pages);
      this.filteredRoutes = [...this.allRoutes];
      this.featuredRoutes = this.allRoutes.slice(0, 3);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Không tải được tuyến xe.';
    }
  }

  onSearch() {
    let term = this.normalizeSearchTerm(this.searchTerm);
    if (!term) {
      this.filteredRoutes = [...this.allRoutes];
      return;
    }

    // Smart aliases matching user request ("Lâm Đồng", "Sài Gòn/Sgon")
    if (term.includes('lâm đồng') || term.includes('lam dong') || term.includes('lâmđồng')) {
      term = 'đà lạt';
    } else if (
      term.includes('sài gòn') ||
      term.includes('sai gon') ||
      term.includes('sgon') ||
      term.includes('sg')
    ) {
      term = 'tp.hcm';
    }

    term = this.normalizeSearchTerm(term);

    const aliases: Record<string, string> = {
      // "thành phố" is a common way users refer to TP.HCM.
      thanh: 'tphcm',
      thanhpho: 'tphcm',
      thanhphohochiminh: 'tphcm',
      saigon: 'tphcm',
      sgon: 'tphcm',
      sg: 'tphcm',
      lamdong: 'dalat',
    };
    term = aliases[term] ?? (term.startsWith('thanh') ? 'tphcm' : term);

    this.filteredRoutes = this.allRoutes.filter((route) => {
      const from = this.normalizeSearchTerm(route.from);
      const to = this.normalizeSearchTerm(route.to);
      return from.includes(term) || to.includes(term);
    });
  }

  private normalizeSearchTerm(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  async viewSchedule(route: Route) {
    this.selectedRouteForDetails = route;
    this.error = '';
    this.selectedDirection = 'forward';
    this.liveTrips = { forward: [], backward: [] };
    try {
      const data = await this.api.request<any>(
        '/trips?from=' +
          encodeURIComponent(route.from) +
          '&to=' +
          encodeURIComponent(route.to) +
          '&date=' +
          this.getTodayDateString() +
          '&roundTrip=true&returnDate=' +
          this.getTodayDateString() +
          '&count=1&pageSize=100',
      );
      this.liveTrips.forward = data.outbound.data.map((t: any) => ({
        time: new Date(t.departureAt).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Ho_Chi_Minh',
        }),
        type: t.typeCode || t.type,
        price: t.price,
        amenities: t.amenities.join(', '),
      }));
      this.liveTrips.backward = (data.inbound?.data || []).map((t: any) => ({
        time: new Date(t.departureAt).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Ho_Chi_Minh',
        }),
        type: t.typeCode || t.type,
        price: t.price,
        amenities: t.amenities.join(', '),
      }));
      const stops = (rows: any[]) => ({
        pickups: rows[0]?.pickup.map((p: any) => p.name) || [],
        dropoffs: rows[0]?.dropoff.map((p: any) => p.name) || [],
      });
      this.mockStops = {
        forward: stops(data.outbound.data),
        backward: stops(data.inbound?.data || []),
      };
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Không tải được chuyến xe.';
    }
  }

  closeSchedule() {
    this.selectedRouteForDetails = null;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  private getTodayDateString(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private navigateToBooking(from: string, to: string): void {
    const today = this.getTodayDateString();

    this.router.navigate(['/'], {
      queryParams: {
        from,
        to,
        date: today,
        autoSearch: 'true',
      },
    });
  }

  handleViewSchedule(route: Route) {
    this.navigateToBooking(route.from, route.to);
  }

  bookSelectedRoute() {
    if (!this.selectedRouteForDetails) return;

    const from =
      this.selectedDirection === 'forward'
        ? this.selectedRouteForDetails.from
        : this.selectedRouteForDetails.to;
    const to =
      this.selectedDirection === 'forward'
        ? this.selectedRouteForDetails.to
        : this.selectedRouteForDetails.from;

    this.navigateToBooking(from, to);
  }
}
