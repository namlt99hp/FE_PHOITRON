import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { TableCommonComponent } from '../../shared/components/table-common/table-common.component';
import { TableColumn, TableQuery, TableResult } from '../../shared/components/table-common/table-types';
import { LoaiQuangService } from '../../core/services/loai-quang.service';
import { LoaiQuangTableModel } from '../../core/models/loai-quang.model';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, Observable, tap } from 'rxjs';
import { HttpResponseModel } from '../../core/models/http-response.model';
import { LoaiQuangFormDialogComponent } from './loai-quang-form-dialog/loai-quang-form-dialog.component';

@Component({
  selector: 'app-loai-quang',
  standalone: true,
  imports: [
    CommonModule,
    TableCommonComponent,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './loai-quang.component.html',
  styleUrl: './loai-quang.component.scss',
})
export class LoaiQuangComponent {
  private service = inject(LoaiQuangService);
  private confirmDialogService = inject(ConfirmDialogService);
  private snack = inject(MatSnackBar);
  readonly dialog = inject(MatDialog);

  @ViewChild(TableCommonComponent) table!: TableCommonComponent<LoaiQuangTableModel>;

  readonly columns: TableColumn<LoaiQuangTableModel>[] = [
    { key: 'id', header: 'ID', width: '80px', sortable: true, align: 'start' },
    { key: 'tenLoaiQuang', header: 'Tên loại quặng', sortable: true },
    { key: 'maLoaiQuang', header: 'Mã loại quặng', sortable: true },
    { key: 'moTa', header: 'Mô tả', sortable: false, align: 'start' },
  ];

  fetcher = (q: TableQuery): Observable<TableResult<LoaiQuangTableModel>> =>
    this.service.search(q);

  confirmDelete = (row: LoaiQuangTableModel) =>
    this.confirmDialogService.open({
      title: 'Xác nhận xoá',
      message: `Bạn có chắc muốn xoá <b>${row.tenLoaiQuang}</b>?`,
      confirmText: 'Xoá',
      cancelText: 'Huỷ',
      confirmColor: 'warn',
      icon: 'delete',
    });

  deleteHandler = (row: LoaiQuangTableModel): Observable<void> =>
    this.service.delete(row.id).pipe(
      tap((res: HttpResponseModel) => {
        if (res?.success) {
          this.snack.open('Đã xoá thành công', 'OK', { duration: 1500, panelClass: ['snack-error'] });
        } else {
          this.snack.open(res?.message || 'Xoá thất bại', 'OK', { duration: 2000, panelClass: ['snack-error'] });
        }
      }),
      map(() => void 0)
    );

  onCreate(): void {
    this.openDialog();
  }

  onEdit(row: LoaiQuangTableModel): void {
    this.openDialog(row);
  }

  openDialog(item?: LoaiQuangTableModel): void {
    const dialogRef = this.dialog.open(LoaiQuangFormDialogComponent, {
      data: item ?? null,
      disableClose: true,
      width: '500px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.table?.refresh();
      }
    });
  }
}

