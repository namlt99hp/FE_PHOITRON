import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ApiResponseInterceptor } from './api-response.interceptor';

export const API_RESPONSE_INTERCEPTOR_PROVIDER = {
  provide: HTTP_INTERCEPTORS,
  useClass: ApiResponseInterceptor,
  multi: true,
};


