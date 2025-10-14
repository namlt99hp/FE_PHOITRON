import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, inject, ViewChild } from '@angular/core';
import { TableCommonComponent } from '../../shared/components/table-common/table-common.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TableColumn, TableQuery, TableResult } from '../../shared/components/table-common/table-types';
import { VnTimePipe } from '../../shared/pipes/datetime.pipe';
import { GangTableModel } from '../../core/models/gang.model';
import { QuangService } from '../../core/services/quang.service';
import { Observable } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GangFormDialogComponent } from './gang-form-dialog/gang-form-dialog.component';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-gang',
  standalone: true,
  imports: [CommonModule, HttpClientModule, TableCommonComponent, MatButtonModule, MatIconModule, MatDialogModule, GangFormDialogComponent],
  templateUrl: './gang.component.html',
  styleUrl: './gang.component.scss'
})
export class GangComponent {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private quangService = inject(QuangService);
  vnTime = inject(VnTimePipe);
  @ViewChild(TableCommonComponent)
  table!: TableCommonComponent<GangTableModel>;
  private confirmDialogService = inject(ConfirmDialogService);
  // Cấu hình cột
  readonly columns: TableColumn<GangTableModel>[] = [
    { key: 'id', header: 'ID', width: '90px', sortable: true, align: 'start' },
    { key: 'maQuang', header: 'Mã Gang', sortable: true },
    { key: 'tenQuang', header: 'Tên Gang', sortable: true },
    { key: 'ghiChu', header: 'Ghi chú', sortable: false, align: 'start' },
    {
      key: 'ngayTao',
      header: 'Tạo lúc',
      sortable: true,
      cell: (r) => this.vnTime.transform(r.ngayTao, 'dd/MM/yyyy HH:mm:ss'),
    },
  ];


  fetcher = (q: TableQuery): Observable<TableResult<GangTableModel>> =>
    this.quangService.search({
      ...q,
      loaiQuang: 2,
    }) as unknown as Observable<TableResult<GangTableModel>>;

  deleteHandler = (row: GangTableModel) =>
    this.http.delete<void>(`/api/users/${row.id}`);

  onEdit(row: GangTableModel) {
    this.dialog
      .open(GangFormDialogComponent, {
        width: '1200px',
        disableClose: true,
        data: { id: row.id },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res) {
          this.table?.refresh();
        }
      });
  }

  onMix(row: any) {
    // Navigate to new mixing page with id and code
    const id = (row as any).id;
    const ma = (row as any).maQuang;
    // Using window.location for quick route if router not injected yet
    window.location.href = `/phoi-gang/${id}?ma=${encodeURIComponent(ma)}`;
  }


  onCreate() {
    this.dialog
      .open(GangFormDialogComponent, {
        width: '1200px',
        disableClose: true,
        data: { id: null },
      })
      .afterClosed()
      .subscribe((res) => { 
        if (res) {
          this.table?.refresh();
        }
      });
  }

  confirmDelete = (row: GangTableModel) =>
    this.confirmDialogService.open({
      title: 'Xác nhận xoá',
      message: `Bạn có chắc muốn xoá <b>${(row as any).tenQuang}</b>?`,
      confirmText: 'Xoá',
      cancelText: 'Huỷ',
      confirmColor: 'warn',
      icon: 'delete',
    });
}
