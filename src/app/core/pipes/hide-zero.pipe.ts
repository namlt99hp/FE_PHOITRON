import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hideZero',
  standalone: true
})
export class HideZeroPipe implements PipeTransform {
  transform(value: number | null | undefined, defaultValue: string = ''): string {
    if (value === null || value === undefined || value === 0) {
      return defaultValue;
    }
    return value.toString();
  }
}


