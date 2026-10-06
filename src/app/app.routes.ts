import { Routes } from '@angular/router';
import { AdminLayout } from './core/layout/admin-layout/admin-layout';
import { CustomerLayout } from './core/layout/customer-layout/customer-layout';
import { Home as AdminHome } from './featured/admin/home/home';
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
  { path: '', pathMatch: 'full', loadComponent: () => import('./featured/customer/home/home').then(m => m.Home) },
  { path: 'faq', loadComponent: () => import('./featured/customer/about/faq/faq').then(m => m.Faq) },
  { path: 'dieu-khoan', loadComponent: () => import('./featured/customer/about/terms/terms').then(m => m.Terms) },
  { path: 'chinh-sach', loadComponent: () => import('./featured/customer/about/policies/policies').then(m => m.Policies) },
  { path: 'lien-he', loadComponent: () => import('./featured/customer/about/contact/contact').then(m => m.Contact) },
  { path: 've-chung-toi', loadComponent: () => import('./featured/customer/about/about-us/about-us').then(m => m.AboutUs) },
  { path: 'tuyen-dung', loadComponent: () => import('./featured/customer/about/careers/careers').then(m => m.Careers) },
  { path: 'tin-tuc', loadComponent: () => import('./featured/customer/news/news').then(m => m.News) },
  { path: 'tin-tuc/chi-tiet/:id', loadComponent: () => import('./featured/customer/news/news-detail/news-detail').then(m => m.NewsDetail) },
  { path: 'lich-trinh', loadComponent: () => import('./featured/customer/schedule/schedule').then(m => m.Schedule) },
  {
    path: 'admin',
    component: AdminLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: AdminHome },
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
