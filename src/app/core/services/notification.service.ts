import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snack = inject(MatSnackBar);

  success(message: string, duration = 1500) {
    this.snack.open(message, 'OK', { duration, panelClass: ['snack-success'] });
  }

  info(message: string, duration = 1500) {
    this.snack.open(message, 'OK', { duration, panelClass: ['snack-info'] });
  }

  error(message: string, duration = 2500) {
    this.snack.open(message, 'Đóng', { duration, panelClass: ['snack-error'] });
  }
}


