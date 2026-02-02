import { Routes } from '@angular/router';
import { QuanTriNhanSuComponent } from './quan-tri-nhan-su.component';

export const QUAN_TRI_NHAN_SU_ROUTES: Routes = [
  {
    path: '',
    component: QuanTriNhanSuComponent,
    children: [
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full'
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  }
];

