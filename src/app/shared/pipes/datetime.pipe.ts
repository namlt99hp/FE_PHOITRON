import { Injectable, Pipe, PipeTransform, inject } from '@angular/core';
import { DatePipe } from '@angular/common';

@Injectable({ providedIn: 'root' })
@Pipe({
  name: 'vnTime',
  standalone: true,
  pure: true,
})
export class VnTimePipe implements PipeTransform {
  private datePipe = inject(DatePipe);

  /**
   * Chuyển UTC -> Asia/Ho_Chi_Minh và format theo pattern.
   * @param value  Date | string | number (nên là ISO UTC có 'Z' hoặc epoch)
   * @param pattern format Angular DatePipe (mặc định dd/MM/yyyy HH:mm:ss)
   * @param assumeUtcForNaive nếu chuỗi KHÔNG có timezone, true = coi là UTC
   */
  transform(
    value: Date | string | number | null | undefined,
    pattern: string = 'dd/MM/yyyy HH:mm:ss',
    assumeUtcForNaive: boolean = true
  ): string {
    if (value == null) return '';

    let date: Date;
    if (typeof value === 'string') {
      const s = value.trim();
      const hasTZ = /Z|[+-]\d{2}:\d{2}$/i.test(s);
      date = new Date(hasTZ ? s : (assumeUtcForNaive ? s + 'Z' : s));
    } else {
      date = new Date(value);
    }

    // Ưu tiên IANA tz, fallback UTC+7 nếu môi trường không hỗ trợ
    return (
      this.datePipe.transform(date, pattern, 'Asia/Ho_Chi_Minh', 'vi') ??
      this.datePipe.transform(date, pattern, 'UTC+7', 'vi') ??
      ''
    );
  }
}
