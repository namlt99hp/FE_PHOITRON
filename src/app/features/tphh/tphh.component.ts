import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { TableCommonComponent } from '../../shared/components/table-common/table-common.component';
import { ThanhPhanHoaHocService } from '../../core/services/tphh.service';
import {
  TableColumn,
  TableQuery,
  TableResult,
} from '../../shared/components/table-common/table-types';
import {
  map,
  Observable,
  tap,
} from 'rxjs';
import { TPHHTableModel } from '../../core/models/tphh.model';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormDialogComponent } from './form-dialog/form-dialog.component';
import { VnTimePipe } from '../../shared/pipes/datetime.pipe';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-tphh',
  standalone: true,
  imports: [
    CommonModule,
    TableCommonComponent,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './tphh.component.html',
  styleUrl: './tphh.component.scss',
})
export class TphhComponent {
  private tphhService = inject(ThanhPhanHoaHocService);
  readonly dialog = inject(MatDialog);
  vnTime = inject(VnTimePipe);
  private snack = inject(MatSnackBar);

  public tableTitle: string = 'Thành phần hóa học';
  @ViewChild(TableCommonComponent) table!: TableCommonComponent<TPHHTableModel>;

  // Cấu hình cột
  readonly columns: TableColumn<TPHHTableModel>[] = [
    { key: 'id', header: 'ID', width: '90px', sortable: true, align: 'start' },
    { key: 'ma_TPHH', header: 'Mã hóa học', sortable: true, align: 'start' },
    { key: 'ten_TPHH', header: 'Tên hóa học', sortable: true },
    { key: 'ghiChu', header: 'Ghi chú', sortable: false, align: 'start' },
    {
      key: 'ngayTao',
      header: 'Tạo lúc',
      sortable: true,
      cell: (r) => this.vnTime.transform(r.ngayTao, 'dd/MM/yyyy HH:mm:ss'),
    },
  ];

  constructor(private confirmDialogService: ConfirmDialogService) {}

  fetcher = (q: TableQuery): Observable<TableResult<TPHHTableModel>> =>
    this.tphhService.search(q);

  confirmDelete = (row: TPHHTableModel) =>
    this.confirmDialogService.open({
      title: 'Xác nhận xoá',
      message: `Bạn có chắc muốn xoá <b>${row.ten_TPHH}</b>?`,
      confirmText: 'Xoá',
      cancelText: 'Huỷ',
      confirmColor: 'warn',
      icon: 'delete',
    });

  // Hoặc lắng nghe sự kiện để tự xử lý ở đây
  onCreate() {
    this.openDialog();
  }

  onEdit(row: TPHHTableModel) {
    // ví dụ: bật form edit bên cạnh
    this.openDialog(row);
  }

  deleteHandler = (row: TPHHTableModel): Observable<void> => 
    this.tphhService.delete(row.id).pipe(
      tap((res) =>{
        this.snack.open('Đã xoá thành công', 'OK', { duration: 1500, panelClass: ['snack-error'] })
      }
      ),
      map(() => void 0)
    );

  openDialog(item?: TPHHTableModel): void {
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: item,
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
