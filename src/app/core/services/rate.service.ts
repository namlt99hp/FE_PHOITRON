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
   * Lấy tỷ giá USD->VND theo ngày (yyyy-MM-dd) từ GrandTrunk.
   * Nếu trả "N/A" sẽ tự lùi tối đa `maxLookbackDays` ngày.
   */
  async getUsdVndByDate(
    isoDate: string,
    opts: { maxLookbackDays?: number; fallback?: boolean } = {}
  ): Promise<{ rate: number; dateUsed: string }> {
    const maxLookbackDays = opts.maxLookbackDays ?? 7;
    const fallback = opts.fallback ?? true;

    let dateUsed = isoDate.slice(0, 10); // Ensure YYYY-MM-DD format
    
    for (let i = 0; i <= maxLookbackDays; i++) {
      const url = `http://currencies.apps.grandtrunk.net/getrate/${dateUsed}/USD/VND`;
      
      try {
        
        // Simple fetch with text response
        const response = await fetch(url);
        const text = await response.text();
        
        
        // Parse the rate
        const rate = parseFloat(text.trim());
        
        if (!isNaN(rate) && rate > 0) {
          console.log(`Valid rate found for ${dateUsed}:`, rate);
          return { rate, dateUsed };
        } else {
          console.log(`Invalid rate for ${dateUsed}:`, text);
        }
      } catch (error) {
        console.warn(`Failed to fetch rate for ${dateUsed}:`, error);
      }
      
      if (!fallback) break;
      dateUsed = this.minusOneDayUTC(dateUsed);
    }
    
    throw new Error(`Không tìm thấy tỷ giá quanh ngày yêu cầu (đã lùi tối đa ${maxLookbackDays} ngày).`);
  }
  
}
