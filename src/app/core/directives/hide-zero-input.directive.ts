import { Directive, ElementRef, HostListener, OnInit } from '@angular/core';

@Directive({
  selector: '[hideZeroInput]',
  standalone: true
})
export class HideZeroInputDirective implements OnInit {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  ngOnInit(): void {
    // Chuyển input sang text để kiểm soát nhập số (0-9 và dấu chấm)
    const input = this.el.nativeElement;
    try {
      input.setAttribute('type', 'text');
      input.setAttribute('inputmode', 'decimal');
      input.setAttribute('pattern', '^\\d*(\\.\\d*)?$');
    } catch {}
    this.applyInitialFormatting();
  }

  @HostListener('blur', ['$event'])
  onBlur(event: FocusEvent): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    if (!isNaN(value) && input.value !== '' && !input.value.endsWith('.')) {
      const formatted = this.formatDecimalToFirstNonZero(value);
      if (formatted !== input.value) {
        input.value = formatted;
        this.dispatchInputEvent(input);
      }
    }
  }

  @HostListener('focus', ['$event'])
  onFocus(event: FocusEvent): void {
    // Không thay đổi giá trị khi focus để người dùng nhập 0.x thuận lợi
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    // Sanitize và auto-format ngay khi nhập
    const input = event.target as HTMLInputElement;
    let v = input.value;
    // Chỉ giữ số và dấu chấm
    v = v.replace(/[^\d.]/g, '');
    // Chỉ giữ duy nhất một dấu chấm
    const i = v.indexOf('.');
    if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '');
    if (v !== input.value) {
      input.value = v;
      this.dispatchInputEvent(input);
    }
    const value = parseFloat(input.value);
    // Không format khi đang gõ dở dang như '0.'
    if (!isNaN(value) && input.value !== '' && !input.value.endsWith('.')) {
      const formatted = this.formatDecimalToFirstNonZero(value);
      if (formatted !== input.value) {
        input.value = formatted;
        this.dispatchInputEvent(input);
      }
    }
  }

  // keypress: chỉ cho nhập 0-9 và '.'
  @HostListener('keypress', ['$event'])
  onKeypress(e: KeyboardEvent): void {
    const ch = e.key;
    if (!/[0-9.]/.test(ch)) {
      e.preventDefault();
      return;
    }
    if (ch === '.') {
      const input = this.el.nativeElement;
      if (input.value.includes('.')) {
        e.preventDefault();
      }
    }
  }

  // Chặn ký tự không hợp lệ khi nhập (chỉ cho số, dấu chấm thập phân, điều hướng)
  @HostListener('keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'Home', 'End'
    ];
    if (allowedKeys.includes(e.key)) return;

    const isCtrlA = e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey);
    const isCtrlC = e.key.toLowerCase() === 'c' && (e.ctrlKey || e.metaKey);
    const isCtrlV = e.key.toLowerCase() === 'v' && (e.ctrlKey || e.metaKey);
    const isCtrlX = e.key.toLowerCase() === 'x' && (e.ctrlKey || e.metaKey);
    if (isCtrlA || isCtrlC || isCtrlV || isCtrlX) return;

    // Cho phép số và dấu chấm (chỉ một dấu chấm)
    const input = this.el.nativeElement;
    const { selectionStart, value } = input;
    const isDigit = /\d/.test(e.key);
    const isDot = e.key === '.';

    if (isDigit) return;

    if (isDot) {
      if (value.includes('.')) { e.preventDefault(); }
      return;
    }

    // Các ký tự khác: chặn
    e.preventDefault();
  }

  // Chặn paste nội dung không hợp lệ
  @HostListener('paste', ['$event'])
  onPaste(e: ClipboardEvent): void {
    const text = e.clipboardData?.getData('text') ?? '';
    if (!/^\d*(\.\d*)?$/.test(text.trim())) {
      e.preventDefault();
    }
  }

  private applyInitialFormatting(): void {
    const input = this.el.nativeElement;
    const raw = input.value;
    const num = parseFloat(raw);
    if (!isNaN(num) && raw !== '' && !raw.endsWith('.')) {
      const formatted = this.formatDecimalToFirstNonZero(num);
      if (formatted !== raw) {
        input.value = formatted;
        this.dispatchInputEvent(input);
      }
    }
  }

  private formatDecimalToFirstNonZero(value: number): string {
    if (value === 0) return '0';
    const abs = Math.abs(value);

    // Quy tắc:
    // >= 0.01  -> 2 chữ số thập phân
    // >= 0.001 -> 3 chữ số thập phân
    // >  0     -> 4 chữ số thập phân (tối đa xử lý tới 0.000x)
    let places = 2;
    if (abs < 0.01 && abs >= 0.001) {
      places = 3;
    } else if (abs < 0.001 && abs > 0) {
      places = 4;
    }

    return value.toFixed(places);
  }

  private dispatchInputEvent(input: HTMLInputElement): void {
    // Đồng bộ lại giá trị với FormControl/NgModel
    const evt = new Event('input', { bubbles: true });
    input.dispatchEvent(evt);
  }
}
