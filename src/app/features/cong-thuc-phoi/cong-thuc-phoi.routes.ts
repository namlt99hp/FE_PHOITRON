import { Routes } from '@angular/router';
import { CongThucPhoiComponent } from './cong-thuc-phoi.component';

export const CONGTHUCPHOI_ROUTES: Routes = [
  {
    path: '',
    component: CongThucPhoiComponent,
    // canActivate: [RoleGuard],
    // data: { roles: ['admin'] }
  }
];
