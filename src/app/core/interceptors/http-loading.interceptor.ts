import { Injectable, inject } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HTTP_INTERCEPTORS
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class HttpLoadingInterceptor implements HttpInterceptor {
  private loading = inject(LoadingService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.headers.has('X-Disable-Loading')) {
      return next.handle(req);
    }
    this.loading.begin();
    return next.handle(req).pipe(finalize(() => this.loading.end()));
  }
}

/** Provider cho withInterceptorsFromDi() */
export const HTTP_LOADING_INTERCEPTOR_PROVIDER = {
  provide: HTTP_INTERCEPTORS,
  useClass: HttpLoadingInterceptor,
  multi: true,
};
