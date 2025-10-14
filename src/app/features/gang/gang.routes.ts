import { Routes } from '@angular/router';
import { GangComponent } from './gang.component';

export const GANG_ROUTES: Routes = [
  {
    path: '',
    component: GangComponent,
    // canActivate: [RoleGuard],
    // data: { roles: ['admin'] }
  }
];
