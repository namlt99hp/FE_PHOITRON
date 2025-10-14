import { Routes } from '@angular/router';
import { PhoiGangPageComponent } from './phoi-gang.component';

export const PHOI_GANG_ROUTES: Routes = [
  { path: '', component: PhoiGangPageComponent },
  { path: 'locao-process-params', loadComponent: () => import('../locao-process-param/locao-process-param.page').then(m => m.LoCaoProcessParamPage) }
];


