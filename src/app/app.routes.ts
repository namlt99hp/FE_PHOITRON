import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { RoleGuard } from './core/guards/role.guard';
// import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadChildren: () => import('./features/home/home.routes').then(m => m.HOME_ROUTES),
        // canActivate: [authGuard],
        data: { roles: ['admin'], title: 'TRANG CHỦ' }
      },
      {
        path: 'phuong-phap-phoi-tron',
        loadChildren: () => import('./features/cong-thuc-phoi/cong-thuc-phoi.routes').then(m => m.CONGTHUCPHOI_ROUTES),
        // canActivate: [authGuard],
        data: { roles: ['admin'] ,title: 'CÔNG THỨC PHỐI TRỘN'}
      },
      {
        path: 'quang',
        loadChildren: () => import('./features/quang/quang.routes').then(m => m.QUANG_ROUTES),
        // canActivate: [authGuard],
        data: { roles: ['admin'] , title: 'QUẶNG'}
      },
      {
        path: 'thanh-phan-hoa-hoc',
        loadChildren: () => import('./features/tphh/tphh.routes').then(m => m.TPHH_ROUTES),
        // canActivate: [authGuard],
        data: { roles: ['admin'] , title: 'THÀNH PHẦN HÓA HỌC'}
      },
      // { path: 'products', loadChildren: () => import('./features/products/products.routes').then(m => m.PRODUCT_ROUTES) },
    ]
  },
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
