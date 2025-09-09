import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type ConfirmColor = 'primary' | 'accent' | 'warn';
export interface ConfirmDialogData {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: ConfirmColor;
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  title!: string;
  message!: string;
  confirmText!: string;
  cancelText!: string;
  color!: ConfirmColor;
  icon!: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
    private ref: MatDialogRef<ConfirmDialogComponent, boolean>
  ) {
    this.title       = data.title ?? 'Xác nhận xoá';
    this.message     = data.message ?? 'Bạn có chắc muốn xoá bản ghi này? Hành động này không thể hoàn tác.';
    this.confirmText = data.confirmText ?? 'Xoá';
    this.cancelText  = data.cancelText ?? 'Huỷ';
    this.color       = data.confirmColor ?? 'warn';
    this.icon        = data.icon ?? 'warning';
  }

  onCancel(){ this.ref.close(false); }
  onConfirm(){ this.ref.close(true); }
}
