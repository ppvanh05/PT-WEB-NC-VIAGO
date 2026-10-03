import { Routes } from '@angular/router';

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
];
