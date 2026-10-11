import { Routes } from '@angular/router';
import { AdminLayout } from './core/layout/admin-layout/admin-layout';
import { CustomerLayout } from './core/layout/customer-layout/customer-layout';

// Admin components
import { Home as AdminHome } from './featured/admin/home/home';
import { NewBooking } from './featured/admin/booking/new-booking/new-booking';
import { BookingManagement } from './featured/admin/booking/booking-management/booking-management';
import { Routes as DispatchRoutes } from './featured/admin/dispatch/routes/routes';
import { Schedules as DispatchSchedules } from './featured/admin/dispatch/schedules/schedules';
import { PickupDropoff as DispatchPickup } from './featured/admin/dispatch/pickup-dropoff/pickup-dropoff';
import { Vehicles as DispatchVehicles } from './featured/admin/dispatch/vehicles/vehicles';
import { DriversAssistants as DispatchDrivers } from './featured/admin/dispatch/drivers-assistants/drivers-assistants';
import { CustomerAccountManagement } from './featured/admin/customers/customer-account-management/customer-account-management';
import { ReviewsFeedback } from './featured/admin/customers/reviews-feedback/reviews-feedback';
import { LostAndFound as AdminLostAndFound } from './featured/admin/customers/lost-and-found/lost-and-found';
import { EmployeeAccountManagement } from './featured/admin/employees/employee-account-management/employee-account-management';
import { News as AdminNews } from './featured/admin/content/news/news';
import { Policies as AdminPolicies } from './featured/admin/content/policies/policies';
import { Promotions as AdminPromotions } from './featured/admin/content/promotions/promotions';
import { ContractRentals } from './featured/admin/contract-rentals/contract-rentals';
import { DetailedReport } from './featured/admin/reports/detailed-report/detailed-report';
import { CustomerReport } from './featured/admin/reports/customer-report/customer-report';
import { DriverAssistantReport } from './featured/admin/reports/driver-assistant-report/driver-assistant-report';
import { RouteReport } from './featured/admin/reports/route-report/route-report';
import { CancellationReport } from './featured/admin/reports/cancellation-report/cancellation-report';
import { ActivityLogs } from './featured/admin/activity-logs/activity-logs';

// Customer components
import { Home as CustomerHome } from './featured/customer/home/home';
import { Schedule } from './featured/customer/schedule/schedule';
import { TicketLookup } from './featured/customer/ticket-lookup/ticket-lookup';
import { News } from './featured/customer/news/news';
import { NewsDetail } from './featured/customer/news/news-detail/news-detail';
import { Invoice } from './featured/customer/invoice/invoice';
import { Reviews } from './featured/customer/reviews/reviews';
import { Services } from './featured/customer/services/services';
import { Profile } from './featured/customer/profile/profile';
import { AboutUs } from './featured/customer/about/about-us/about-us';
import { Careers } from './featured/customer/about/careers/careers';
import { Contact } from './featured/customer/about/contact/contact';
import { Faq } from './featured/customer/about/faq/faq';
import { Guide } from './featured/customer/about/guide/guide';
import { Policies } from './featured/customer/about/policies/policies';
import { Terms } from './featured/customer/about/terms/terms';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: AdminHome },
      { path: 'tickets/new', component: NewBooking },
      { path: 'tickets/list', component: BookingManagement },
      { path: 'dispatch/routes', component: DispatchRoutes },
      { path: 'dispatch/schedules', component: DispatchSchedules },
      { path: 'dispatch/pickup', component: DispatchPickup },
      { path: 'dispatch/vehicles', component: DispatchVehicles },
      { path: 'dispatch/drivers', component: DispatchDrivers },
      { path: 'customers/accounts', component: CustomerAccountManagement },
      { path: 'customers/reviews', component: ReviewsFeedback },
      { path: 'customers/lost-items', component: AdminLostAndFound },
      { path: 'staff/accounts', component: EmployeeAccountManagement },
      { path: 'content/news', component: AdminNews },
      { path: 'content/policies', component: AdminPolicies },
      { path: 'content/promotions', component: AdminPromotions },
      { path: 'contract', component: ContractRentals },
      { path: 'reports/revenue', component: DetailedReport },
      { path: 'reports/customers', component: CustomerReport },
      { path: 'reports/drivers', component: DriverAssistantReport },
      { path: 'reports/routes', component: RouteReport },
      { path: 'reports/cancellations', component: CancellationReport },
      { path: 'logs', component: ActivityLogs },
      { path: '**', redirectTo: 'home' },
    ],
  },
  {
    path: 'customer',
    component: CustomerLayout,
    children: [
      { path: '', component: CustomerHome },
      { path: 'lich-trinh', component: Schedule },
      { path: 'tra-cuu-ve', component: TicketLookup },
      { path: 'tin-tuc', component: News },
      { path: 'tin-tuc/:id', component: NewsDetail },
      { path: 'hoa-don', component: Invoice },
      { path: 'danh-gia', component: Reviews },
      { path: 'dich-vu', component: Services },
      { path: 'do-that-lac', component: Services },
      { path: 'profile', component: Profile },
      { path: 've-chung-toi', component: AboutUs },
      { path: 'gioi-thieu', component: AboutUs },
      { path: 'tuyen-dung', component: Careers },
      { path: 'lien-he', component: Contact },
      { path: 'faq', component: Faq },
      { path: 'huong-dan-mua-ve', component: Guide },
      { path: 'chinh-sach', component: Policies },
      { path: 'dieu-khoan', component: Terms },
      { path: '**', redirectTo: '' },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'customer' },
  { path: '**', redirectTo: 'customer' },
];
