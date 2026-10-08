import { bookingLeaveGuard } from './featured/customer/home/booking.guard';
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'admin', pathMatch: 'full', redirectTo: 'admin/login' },
  {
    path: 'admin/login',
    loadComponent: () => import('./featured/admin/auth/login/login').then(m => m.Login),
  },
  {
    path: 'admin',
    loadComponent: () => import('./core/layout/admin-layout/admin-layout').then(m => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: () => import('./featured/admin/home/home').then(m => m.Home) },
      { path: '**', redirectTo: 'home' },
    ],
  },
  {
    path: 'customer',
    loadComponent: () => import('./core/layout/customer-layout/customer-layout').then(m => m.CustomerLayout),
    children: [
      { path: '', loadComponent: () => import('./featured/customer/home/home').then(m => m.Home), canDeactivate: [bookingLeaveGuard] },
      { path: 'lich-trinh', loadComponent: () => import('./featured/customer/schedule/schedule').then(m => m.Schedule) },
      { path: 'tra-cuu-ve', loadComponent: () => import('./featured/customer/ticket-lookup/ticket-lookup').then(m => m.TicketLookup) },
      { path: 'tin-tuc', loadComponent: () => import('./featured/customer/news/news').then(m => m.News) },
      { path: 'tin-tuc/:id', loadComponent: () => import('./featured/customer/news/news-detail/news-detail').then(m => m.NewsDetail) },
      { path: 'hoa-don', loadComponent: () => import('./featured/customer/invoice/invoice').then(m => m.Invoice) },
      { path: 'danh-gia', loadComponent: () => import('./featured/customer/reviews/reviews').then(m => m.Reviews) },
      { path: 'dich-vu', loadComponent: () => import('./featured/customer/services/services').then(m => m.Services) },
      { path: 'do-that-lac', loadComponent: () => import('./featured/customer/services/services').then(m => m.Services) },
      { path: 'profile', loadComponent: () => import('./featured/customer/profile/profile').then(m => m.Profile) },
      { path: 've-chung-toi', loadComponent: () => import('./featured/customer/about/about-us/about-us').then(m => m.AboutUs) },
      { path: 'gioi-thieu', loadComponent: () => import('./featured/customer/about/about-us/about-us').then(m => m.AboutUs) },
      { path: 'tuyen-dung', loadComponent: () => import('./featured/customer/about/careers/careers').then(m => m.Careers) },
      { path: 'lien-he', loadComponent: () => import('./featured/customer/about/contact/contact').then(m => m.Contact) },
      { path: 'faq', loadComponent: () => import('./featured/customer/about/faq/faq').then(m => m.Faq) },
      { path: 'huong-dan-mua-ve', loadComponent: () => import('./featured/customer/about/guide/guide').then(m => m.Guide) },
      { path: 'chinh-sach', loadComponent: () => import('./featured/customer/about/policies/policies').then(m => m.Policies) },
      { path: 'dieu-khoan', loadComponent: () => import('./featured/customer/about/terms/terms').then(m => m.Terms) },
      { path: '**', redirectTo: '' },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'customer' },
  { path: '**', redirectTo: 'customer' },
];
