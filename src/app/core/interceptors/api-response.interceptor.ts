import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiResponse } from '../models/http-response.model';

@Injectable()
export class ApiResponseInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      map((event) => {
        if (event instanceof HttpResponse) {
          const body = event.body as ApiResponse | any;
          if (body && typeof body.success === 'boolean' && typeof body.statusCode === 'number') {
            // Normalize success API responses: keep as-is
            return event.clone({ body });
          }
          // Non-standard response: wrap it as success true with status 200
          const wrapped: ApiResponse = { success: true, statusCode: event.status, data: body, message: undefined };
          return event.clone({ body: wrapped });
        }
        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        // Ensure consistent error shape
        const apiError: ApiResponse = {
          success: false,
          statusCode: error.status || 500,
          message: (error.error && (error.error.message || error.error.error || error.message)) || 'Đã xảy ra lỗi',
          data: null,
        };
        // Re-throw as HttpErrorResponse with normalized body so callers can read consistently
        const errClone = new HttpErrorResponse({
          error: apiError,
          headers: error.headers,
          status: error.status,
          statusText: error.statusText,
          url: error.url || undefined,
        });
        return throwError(() => errClone);
      })
    );
  }
}


