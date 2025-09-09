import { Injectable, signal, computed } from '@angular/core';
import { Observable, finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  /** Thời gian hiển thị tối thiểu (ms) */
  minDuration = 300;
  /** (tuỳ chọn) Trì hoãn bật overlay (ms) để tránh chớp cho request siêu nhanh */
  showDelay = 0; // ví dụ 100 nếu muốn

  private pending = signal(0);
  private _visible = signal(false);

  private showAt = 0;               // timestamp khi overlay bắt đầu hiển thị
  private hideTimer: any = null;    // timer trì hoãn tắt
  private showTimer: any = null;    // timer trì hoãn bật (nếu showDelay > 0)

  /** Overlay đang HIỂN THỊ (đã qua showDelay, nếu có) */
  readonly isVisible = computed(() => this._visible());
  /** Đếm số request đang pending (thông tin phụ) */
  readonly hasPending = computed(() => this.pending() > 0);

  begin(): void {
    // bắt đầu 1 request
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }

    // nếu đây là request đầu tiên -> bật overlay (ngay hoặc sau showDelay)
    if (this.pending() === 0) {
      if (this.showDelay > 0) {
        if (!this.showTimer) {
          this.showTimer = setTimeout(() => {
            this._visible.set(true);
            this.showAt = Date.now();
            this.showTimer = null;
          }, this.showDelay);
        }
      } else {
        this._visible.set(true);
        this.showAt = Date.now();
      }
    }

    this.pending.set(this.pending() + 1);
  }

  end(): void {
    const next = Math.max(0, this.pending() - 1);
    this.pending.set(next);

    // khi tất cả request đã xong
    if (next === 0) {
      // Nếu còn timer bật (request kết thúc trước khi kịp show), hủy bật -> không hiển thị
      if (this.showTimer) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
        this.showAt = 0;
        return;
      }

      const elapsed = this.showAt ? Date.now() - this.showAt : 0;
      const remain = this.minDuration - elapsed;

      const hide = () => {
        this._visible.set(false);
        this.showAt = 0;
      };

      if (remain > 0) {
        this.hideTimer = setTimeout(() => { hide(); this.hideTimer = null; }, remain);
      } else {
        hide();
      }
    }
  }

  /** Bọc 1 observable để tự begin/end */
  track<T>(obs$: Observable<T>): Observable<T> {
    this.begin();
    return obs$.pipe(finalize(() => this.end()));
  }
}
