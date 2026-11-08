import { bookingLeaveGuard } from './featured/customer/home/booking.guard';
import { Routes } from '@angular/router';
import { adminSessionGuard } from './core/guards/admin-session.guard';

const loadNewBooking = () =>
  import('./featured/admin/booking/new-booking/new-booking').then((m) => m.NewBooking);
const loadBookingManagement = () =>
  import('./featured/admin/booking/booking-management/booking-management').then(
    (m) => m.BookingManagement,
  );

export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: () => import('./featured/admin/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'admin',
    canActivate: [adminSessionGuard],
    canActivateChild: [adminSessionGuard],
    loadComponent: () =>
      import('./core/layout/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./featured/admin/home/home').then((m) => m.Home),
      },
      {
        path: 'home',
        loadComponent: () => import('./featured/admin/home/home').then((m) => m.Home),
      },
      { path: 'tickets/new', loadComponent: loadNewBooking },
      { path: 'tickets/list', loadComponent: loadBookingManagement },
      { path: 'booking/new', loadComponent: loadNewBooking },
      { path: 'booking/management', loadComponent: loadBookingManagement },
      { path: 'datve/moi', loadComponent: loadNewBooking },
      { path: 'datve/danhsach', loadComponent: loadBookingManagement },
      {
        path: 'dispatch/drivers',
        loadComponent: () =>
          import('./featured/admin/dispatch/drivers-assistants/drivers-assistants').then(
            (m) => m.DriversAssistants,
          ),
      },
      {
        path: 'customers/reviews',
        loadComponent: () =>
          import('./featured/admin/customers/reviews-feedback/reviews-feedback').then(
            (m) => m.ReviewsFeedback,
          ),
      },
      {
        path: 'reports/cancellations',
        loadComponent: () =>
          import('./featured/admin/reports/cancellation-report/cancellation-report').then(
            (m) => m.CancellationReport,
          ),
      },
      {
        path: 'dispatch/pickup',
        loadComponent: () =>
          import('./featured/admin/dispatch/pickup-dropoff/pickup-dropoff').then(
            (m) => m.PickupDropoffComponent,
          ),
      },
      {
        path: 'dispatch/vehicles',
        loadComponent: () =>
          import('./featured/admin/dispatch/vehicles/vehicles').then((m) => m.VehiclesComponent),
      },
      {
        path: 'dispatch/drivers-assistants',
        loadComponent: () =>
          import('./featured/admin/dispatch/drivers-assistants/drivers-assistants').then(
            (m) => m.DriversAssistants,
          ),
      },
      {
        path: 'contract-rentals',
        loadComponent: () =>
          import('./featured/admin/contract-rentals/contract-rentals').then(
            (m) => m.ContractRentalsComponent,
          ),
      },
      {
        path: 'reports/customer-report',
        loadComponent: () =>
          import('./featured/admin/reports/customer-report/customer-report').then(
            (m) => m.CustomerReportComponent,
          ),
      },
      {
        path: 'tickets/new',
        loadComponent: () =>
          import('./featured/admin/booking/new-booking/new-booking').then((m) => m.NewBooking),
      },
      {
        path: 'tickets/list',
        loadComponent: () =>
          import('./featured/admin/booking/booking-management/booking-management').then(
            (m) => m.BookingManagement,
          ),
      },
      {
        path: 'dispatch/routes',
        loadComponent: () =>
          import('./featured/admin/dispatch/routes/routes').then((m) => m.RoutesComponent),
      },
      {
        path: 'dispatch/schedules',
        loadComponent: () =>
          import('./featured/admin/dispatch/schedules/schedules').then((m) => m.SchedulesComponent),
      },
      {
        path: 'dispatch/pickup',
        loadComponent: () =>
          import('./featured/admin/dispatch/pickup-dropoff/pickup-dropoff').then(
            (m) => m.PickupDropoffComponent,
          ),
      },
      {
        path: 'dispatch/vehicles',
        loadComponent: () =>
          import('./featured/admin/dispatch/vehicles/vehicles').then((m) => m.VehiclesComponent),
      },
      {
        path: 'dispatch/drivers',
        loadComponent: () =>
          import('./featured/admin/dispatch/drivers-assistants/drivers-assistants').then(
            (m) => m.DriversAssistants,
          ),
      },
      {
        path: 'customers/accounts',
        loadComponent: () =>
          import('./featured/admin/customers/customer-account-management/customer-account-management').then(
            (m) => m.CustomerAccountManagement,
          ),
      },
      {
        path: 'customers/support',
        loadComponent: () =>
          import('./featured/admin/customers/support/support').then((m) => m.CustomerSupport),
      },
      {
        path: 'customers/contacts',
        data: { kind: 'contacts' },
        loadComponent: () => import('./featured/admin/intake/intake').then((m) => m.AdminIntake),
      },
      {
        path: 'staff/applications',
        data: { kind: 'applications' },
        loadComponent: () => import('./featured/admin/intake/intake').then((m) => m.AdminIntake),
      },
      {
        path: 'staff/jobs',
        loadComponent: () => import('./featured/admin/intake/jobs').then((m) => m.AdminJobs),
      },
      {
        path: 'customers/reviews',
        loadComponent: () =>
          import('./featured/admin/customers/reviews-feedback/reviews-feedback').then(
            (m) => m.ReviewsFeedback,
          ),
      },
      {
        path: 'customers/lost-items',
        loadComponent: () =>
          import('./featured/admin/customers/lost-and-found/lost-and-found').then(
            (m) => m.LostAndFound,
          ),
      },
      {
        path: 'staff/accounts',
        loadComponent: () =>
          import('./featured/admin/staff/staff-account-management/staff-account-management').then(
            (m) => m.StaffAccountManagement,
          ),
      },
      {
        path: 'content/news',
        loadComponent: () => import('./featured/admin/content/news/news').then((m) => m.News),
      },
      {
        path: 'content/policies',
        loadComponent: () =>
          import('./featured/admin/content/policies/policies').then((m) => m.Policies),
      },
      {
        path: 'content/promotions',
        loadComponent: () =>
          import('./featured/admin/content/promotions/promotions').then(
            (m) => m.PromotionsComponent,
          ),
      },
      {
        path: 'contract',
        loadComponent: () =>
          import('./featured/admin/contract-rentals/contract-rentals').then(
            (m) => m.ContractRentalsComponent,
          ),
      },
      {
        path: 'reports/revenue',
        loadComponent: () =>
          import('./featured/admin/reports/detailed-report/detailed-report').then(
            (m) => m.DetailedReportComponent,
          ),
      },
      {
        path: 'reports/customers',
        loadComponent: () =>
          import('./featured/admin/reports/customer-report/customer-report').then(
            (m) => m.CustomerReportComponent,
          ),
      },
      {
        path: 'reports/drivers',
        loadComponent: () =>
          import('./featured/admin/reports/driver-assistant-report/driver-assistant-report').then(
            (m) => m.DriverAssistantReport,
          ),
      },
      {
        path: 'reports/routes',
        loadComponent: () =>
          import('./featured/admin/reports/route-report/route-report').then(
            (m) => m.RouteReportComponent,
          ),
      },
      {
        path: 'reports/cancellations',
        loadComponent: () =>
          import('./featured/admin/reports/cancellation-report/cancellation-report').then(
            (m) => m.CancellationReport,
          ),
      },
      {
        path: 'logs',
        loadComponent: () =>
          import('./featured/admin/logs/activity-log/activity-log').then((m) => m.ActivityLog),
      },
      { path: '**', redirectTo: 'home' },
    ],
  },
  {
    path: 'customer',
    loadComponent: () =>
      import('./core/layout/customer-layout/customer-layout').then((m) => m.CustomerLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./featured/customer/home/home').then((m) => m.Home),
        canDeactivate: [bookingLeaveGuard],
      },
      {
        path: 'lich-trinh',
        loadComponent: () =>
          import('./featured/customer/schedule/schedule').then((m) => m.Schedule),
      },
      {
        path: 'tra-cuu-ve',
        loadComponent: () =>
          import('./featured/customer/ticket-lookup/ticket-lookup').then((m) => m.TicketLookup),
      },
      {
        path: 'tin-tuc',
        loadComponent: () => import('./featured/customer/news/news').then((m) => m.News),
      },
      {
        path: 'tin-tuc/:id',
        loadComponent: () =>
          import('./featured/customer/news/news-detail/news-detail').then((m) => m.NewsDetail),
      },
      {
        path: 'hoa-don',
        loadComponent: () => import('./featured/customer/invoice/invoice').then((m) => m.Invoice),
      },
      {
        path: 'danh-gia',
        loadComponent: () => import('./featured/customer/reviews/reviews').then((m) => m.Reviews),
      },
      {
        path: 'dich-vu',
        loadComponent: () =>
          import('./featured/customer/services/services').then((m) => m.Services),
      },
      {
        path: 'do-that-lac',
        loadComponent: () =>
          import('./featured/customer/services/services').then((m) => m.Services),
      },
      {
        path: 'profile',
        loadComponent: () => import('./featured/customer/profile/profile').then((m) => m.Profile),
      },
      {
        path: 've-chung-toi',
        loadComponent: () =>
          import('./featured/customer/about/about-us/about-us').then((m) => m.AboutUs),
      },
      {
        path: 'gioi-thieu',
        loadComponent: () =>
          import('./featured/customer/about/about-us/about-us').then((m) => m.AboutUs),
      },
      {
        path: 'tuyen-dung',
        loadComponent: () =>
          import('./featured/customer/about/careers/careers').then((m) => m.Careers),
      },
      {
        path: 'lien-he',
        loadComponent: () =>
          import('./featured/customer/about/contact/contact').then((m) => m.Contact),
      },
      {
        path: 'faq',
        loadComponent: () => import('./featured/customer/about/faq/faq').then((m) => m.Faq),
      },
      {
        path: 'huong-dan-mua-ve',
        loadComponent: () => import('./featured/customer/about/guide/guide').then((m) => m.Guide),
      },
      {
        path: 'chinh-sach',
        loadComponent: () =>
          import('./featured/customer/about/policies/policies').then((m) => m.Policies),
      },
      {
        path: 'dieu-khoan',
        loadComponent: () => import('./featured/customer/about/terms/terms').then((m) => m.Terms),
      },
      {
        path: 'dich-vu/tim-do-that-lac',
        loadComponent: () =>
          import('./featured/customer/services/lost-and-found/lost-and-found').then(
            (m) => m.LostAndFound,
          ),
      },
      {
        path: 'huong-dan-mua-ve/dat-ve-online',
        loadComponent: () =>
          import('./featured/customer/about/guide/guide-detail').then((m) => m.GuideDetail),
      },
      {
        path: 'huong-dan-mua-ve/dat-ve-hotline',
        loadComponent: () =>
          import('./featured/customer/about/guide/guide-hotline/guide-hotline').then(
            (m) => m.GuideHotline,
          ),
      },
      {
        path: 'huong-dan-mua-ve/nhan-ve-tai-ben',
        loadComponent: () =>
          import('./featured/customer/about/guide/guide-pickup/guide-pickup').then(
            (m) => m.GuidePickup,
          ),
      },
      { path: '**', redirectTo: '' },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'customer' },
  { path: '**', redirectTo: 'customer' },
];
