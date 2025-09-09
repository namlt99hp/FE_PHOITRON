import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private dialog = inject(MatDialog);

  open(data: ConfirmDialogData, opts?: { width?: string; disableClose?: boolean }): Observable<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data,
      width: opts?.width ?? '420px',
      disableClose: opts?.disableClose ?? true
    });
    return ref.afterClosed(); // emits true/false (hoặc undefined nếu đóng ngoài) => bạn handle !!value
  }
}
