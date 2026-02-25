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
import { LoQuangService } from '../../core/services/loai-quang.service';
import { LoQuangTableModel } from '../../core/models/loai-quang.model';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, Observable, tap } from 'rxjs';
import { HttpResponseModel } from '../../core/models/http-response.model';
import { LoQuangFormDialogComponent } from './lo-quang-form-dialog/lo-quang-form-dialog.component';

@Component({
  selector: 'app-lo-quang',
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
  templateUrl: './lo-quang.component.html',
  styleUrl: './lo-quang.component.scss',
})
export class LoQuangComponent {
  private service = inject(LoQuangService);
  private confirmDialogService = inject(ConfirmDialogService);
  private snack = inject(MatSnackBar);
  readonly dialog = inject(MatDialog);

  @ViewChild(TableCommonComponent) table!: TableCommonComponent<LoQuangTableModel>;

  readonly columns: TableColumn<LoQuangTableModel>[] = [
    { key: 'id', header: 'ID', width: '80px', sortable: true, align: 'start' },
    { key: 'maLoQuang', header: 'Mã lô quặng', sortable: true },
    { key: 'moTa', header: 'Mô tả', sortable: false, align: 'start' },
  ];

  fetcher = (q: TableQuery): Observable<TableResult<LoQuangTableModel>> =>
    this.service.search(q);

  confirmDelete = (row: LoQuangTableModel) =>
    this.confirmDialogService.open({
      title: 'Xác nhận xoá',
      message: `Bạn có chắc muốn xoá lô quặng <b>${row.maLoQuang}</b>?`,
      confirmText: 'Xoá',
      cancelText: 'Huỷ',
      confirmColor: 'warn',
      icon: 'delete',
    });

  deleteHandler = (row: LoQuangTableModel): Observable<void> =>
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

  onEdit(row: LoQuangTableModel): void {
    this.openDialog(row);
  }

  openDialog(item?: LoQuangTableModel): void {
    const dialogRef = this.dialog.open(LoQuangFormDialogComponent, {
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

