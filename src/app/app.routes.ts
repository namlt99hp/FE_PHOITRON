import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { RoleGuard } from './core/guards/role.guard';
import { authGuard } from './core/guards/auth.guard';
// import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadChildren: () => import('./features/home/home.routes').then(m => m.HOME_ROUTES),
        data: { roles: ['admin'], title: 'TRANG CHỦ' }
      },
      // {
      //   path: 'phuong-phap-phoi-tron',
      //   loadChildren: () => import('./features/cong-thuc-phoi/cong-thuc-phoi.routes').then(m => m.CONGTHUCPHOI_ROUTES),
      //   // canActivate: [authGuard],
      //   data: { roles: ['admin'] ,title: 'CÔNG THỨC PHỐI TRỘN'}
      // },
      {
        path: 'quang',
        loadChildren: () => import('./features/quang/quang.routes').then(m => m.QUANG_ROUTES),
        data: { roles: ['admin'] , title: 'QUẶNG'}
      },
      {
        path: 'thanh-phan-hoa-hoc',
        loadChildren: () => import('./features/tphh/tphh.routes').then(m => m.TPHH_ROUTES),
        data: { roles: ['admin'] , title: 'THÀNH PHẦN HÓA HỌC'}
      },
      {
        path: 'quang-gang',
        loadChildren: () => import('./features/gang/gang.routes').then(m => m.GANG_ROUTES),
        data: { roles: ['admin'] , title: 'QUẶNG GANG'}
      },  
      {
        path: 'phoi-gang/:id',
        loadComponent: () => import('./features/phoi-gang/phoi-gang.component').then(m => m.PhoiGangPageComponent),
        data: { roles: ['admin'] , title: 'PHỐI QUẶNG GANG'}
      },
      {
        path: 'phoi-gang/:id/compare',
        loadComponent: () => import('./features/phoi-gang/compare/phoi-gang-compare.component').then(m => m.PhoiGangCompareComponent),
        data: { roles: ['admin'] , title: 'SO SÁNH PHƯƠNG ÁN'}
      },
      {
        path: 'phoi-gang/:id/summary',
        loadComponent: () => import('./features/phoi-gang/summary/phoi-gang-summary.component').then(m => m.PhoiGangSummaryComponent),
        data: { roles: ['admin'] , title: 'TỔNG HỢP PHƯƠNG ÁN'}
      },
      {
        path: 'locao-process-params',
        loadComponent: () => import('./features/locao-process-param/locao-process-param.page').then(m => m.LoCaoProcessParamPage),
        data: { roles: ['admin'] , title: 'THAM SỐ LÒ CAO'}
      },
      {
        path: 'thongke-phuongan',
        loadChildren: () => import('./features/thongke-function/thongke-function.routes').then(m => m.thongkeFunctionRoutes),
        data: { roles: ['admin'] , title: 'HÀM THỐNG KÊ'}
      },
      {
        path: 'quan-tri-nhan-su',
        loadChildren: () => import('./features/quan-tri-nhan-su/quan-tri-nhan-su.routes').then(m => m.QUAN_TRI_NHAN_SU_ROUTES),
        data: { roles: ['admin', 'user'], title: 'QUẢN TRỊ NHÂN SỰ' }
      },
      
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
