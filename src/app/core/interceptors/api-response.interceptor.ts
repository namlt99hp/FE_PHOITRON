import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiResponse } from '../models/http-response.model';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class ApiResponseInterceptor implements HttpInterceptor {
  private notificationService = inject(NotificationService);

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

        // Hiển thị snackbar message dựa trên status code
        this.showErrorNotification(apiError.statusCode, apiError.message || 'Đã xảy ra lỗi');

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

  /**
   * Hiển thị thông báo lỗi dựa trên status code
   */
  private showErrorNotification(statusCode: number, message: string): void {
    // Không hiển thị snackbar cho một số status code (ví dụ: 401 Unauthorized - có thể handle riêng)
    if (statusCode === 401) {
      // Unauthorized - có thể redirect hoặc handle riêng
      return;
    }

    // Format và rút gọn message cho dễ đọc
    const formattedMessage = this.formatErrorMessage(message);

    // Hiển thị snackbar với duration khác nhau tùy theo loại lỗi
    let duration = 3000; // Mặc định 3 giây

    switch (statusCode) {
      case 400: // Bad Request
        duration = 3000;
        break;
      case 409: // Conflict (Foreign key violation, duplicate key, etc.)
        duration = 4000; // Lỗi conflict thường quan trọng, hiển thị lâu hơn
        break;
      case 404: // Not Found
        duration = 2500;
        break;
      case 500: // Internal Server Error
        duration = 4000;
        break;
      default:
        duration = 3000;
    }

    this.notificationService.error(formattedMessage, duration);
  }

  /**
   * Format và rút gọn message lỗi cho dễ đọc
   */
  private formatErrorMessage(message: string): string {
    if (!message) return 'Đã xảy ra lỗi';

    let formatted = message.trim();

    // Rút gọn các message dài về foreign key violation
    if (formatted.includes('đang được sử dụng ở nơi khác')) {
      // Tìm tên đối tượng/bảng trong message
      const match = formatted.match(/([^\.]+) đang được sử dụng[^\.]*/);
      if (match) {
        const objectName = match[1].trim();
        // Rút gọn thành message ngắn gọn
        formatted = `${objectName} đang được sử dụng, không thể xóa.`;
      } else {
        // Fallback: chỉ giữ phần quan trọng
        formatted = formatted.replace(/Không thể [^\.]+ dữ liệu này\.\s*/g, '');
        formatted = formatted.replace(/và không thể xóa\/cập nhật để đảm bảo tính toàn vẹn dữ liệu\.?/g, '');
        formatted = formatted.replace(/trong hệ thống và không thể xóa\/cập nhật/g, '');
        formatted = formatted.replace(/đang được sử dụng ở nơi khác trong hệ thống/g, 'đang được sử dụng');
      }
    }

    // Rút gọn các message duplicate key
    if (formatted.includes('đã tồn tại')) {
      formatted = formatted.replace(/Dữ liệu đã tồn tại trong hệ thống\.\s*Vui lòng kiểm tra lại mã hoặc thông tin trùng lặp\./g, 'Dữ liệu đã tồn tại.');
      formatted = formatted.replace(/Vui lòng kiểm tra lại mã hoặc thông tin trùng lặp\./g, '');
    }

    // Giới hạn độ dài message (80 ký tự để dễ đọc trong snackbar)
    const maxLength = 80;
    if (formatted.length > maxLength) {
      // Cắt tại dấu chấm gần nhất
      const lastPeriod = formatted.substring(0, maxLength).lastIndexOf('.');
      if (lastPeriod > 40) {
        formatted = formatted.substring(0, lastPeriod + 1);
      } else {
        formatted = formatted.substring(0, maxLength - 3) + '...';
      }
    }

    // Loại bỏ các khoảng trắng thừa
    formatted = formatted.replace(/\s+/g, ' ').trim();

    // Đảm bảo kết thúc bằng dấu chấm
    if (formatted && !formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
      formatted += '.';
    }

    return formatted;
  }
}


