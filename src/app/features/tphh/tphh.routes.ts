import { Routes } from '@angular/router';
import { TphhComponent } from './tphh.component';

export const TPHH_ROUTES: Routes = [
  {
    path: '',
    component: TphhComponent,
    // canActivate: [RoleGuard],
    // data: { roles: ['admin'] }
  }
];
