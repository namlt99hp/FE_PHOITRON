// src/app/rate.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RateService {
  private http = inject(HttpClient);

  private toISODateUTC(date: Date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  private minusOneDayUTC(dateISO: string) {
    const d = new Date(`${dateISO}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return this.toISODateUTC(d);
  }

  /**
   * Lấy tỷ giá USD->VND theo ngày (yyyy-MM-dd) từ API chính thống của Vietcombank.
   * Nếu ngày đó không có dữ liệu (cuối tuần/lễ) sẽ tự lùi tối đa `maxLookbackDays` ngày.
   */
  async getUsdVndByDate(
    isoDate: string,
    opts: { maxLookbackDays?: number; fallback?: boolean } = {}
  ): Promise<{ rate: number; dateUsed: string }> {
    const maxLookbackDays = opts.maxLookbackDays ?? 7;
    const fallback = opts.fallback ?? true;

    let dateUsed = isoDate.slice(0, 10); // Ensure YYYY-MM-DD format

    for (let i = 0; i <= maxLookbackDays; i++) {
      try {
        const rate = await this.getVcbRate(dateUsed, 'USD');

        if (rate != null && !isNaN(rate) && rate > 0) {
          console.log(`Valid VCB rate found for ${dateUsed}:`, rate);
          return { rate, dateUsed };
        } else {
          console.log(`No VCB rate for ${dateUsed}`);
        }
      } catch (error) {
        console.warn(`Failed to fetch VCB rate for ${dateUsed}:`, error);
      }

      if (!fallback) break;
      dateUsed = this.minusOneDayUTC(dateUsed);
    }

    throw new Error(`Không tìm thấy tỷ giá quanh ngày yêu cầu (đã lùi tối đa ${maxLookbackDays} ngày).`);
  }

  /**
   * Gọi API tỷ giá chính thống của Vietcombank cho 1 ngày cụ thể,
   * lấy tỷ giá "transfer" (chuyển khoản) của đồng tiền `code`.
   */
  private async getVcbRate(dateStr: string, code: string = 'USD'): Promise<number | null> {
    const res = await fetch(`https://www.vietcombank.com.vn/api/exchangerates?date=${dateStr}`);
    if (!res.ok) {
      throw new Error(`VCB API trả về lỗi HTTP ${res.status}`);
    }
    const json = await res.json();
    const item = (json?.Data ?? []).find((d: any) => d.currencyCode === code);
    return item ? parseFloat(String(item.transfer).replace(/,/g, '')) : null;
  }

}
