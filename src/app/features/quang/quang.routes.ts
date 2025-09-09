import { Routes } from '@angular/router';
import { QuangComponent } from './quang.component';

export const QUANG_ROUTES: Routes = [
  {
    path: '',
    component: QuangComponent,
    // canActivate: [RoleGuard],
    // data: { roles: ['admin'] }
  }
];
