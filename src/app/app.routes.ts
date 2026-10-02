import { Routes } from '@angular/router';
import { AdminLayout } from './core/layout/admin-layout/admin-layout';
import { Home as AdminHome } from './featured/admin/home/home';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: AdminHome },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
];
