import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, inject, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TableCommonComponent } from '../../shared/components/table-common/table-common.component';
import { QuangService } from '../../core/services/quang.service';
import {
  TableColumn,
  TableQuery,
  TableResult,
} from '../../shared/components/table-common/table-types';
import { Observable } from 'rxjs';
import {
  QuangDetailResponse,
  QuangTableModel,
} from '../../core/models/quang.model';
import { VnTimePipe } from '../../shared/pipes/datetime.pipe';
import {
  OreDialogData,
  OreUpsertDto,
} from '../../core/models/ore-dialog.model';
import { MatDialog } from '@angular/material/dialog';
import { MixQuangDialogComponent } from '../mix-quang-dialog/mix-quang-dialog.component';
import { QuangMuaFormDialogComponent } from './quang-mua-form-dialog/quang-mua-form-dialog.component';

@Component({
  selector: 'app-quang',
  standalone: true,
  imports: [CommonModule, HttpClientModule, TableCommonComponent, MatButtonModule, MatIconModule],
  templateUrl: './quang.component.html',
  styleUrl: './quang.component.scss',
})
export class QuangComponent {
  private http = inject(HttpClient);
  private quangService = inject(QuangService);
  vnTime = inject(VnTimePipe);
  @ViewChild(TableCommonComponent)
  table!: TableCommonComponent<QuangTableModel>;
  public tableTitle: string = 'Quặng';

  // Cấu hình cột
  readonly columns: TableColumn<QuangTableModel>[] = [
    { key: 'id', header: 'ID', width: '90px', sortable: true, align: 'start' },
    { key: 'maQuang', header: 'Mã quặng', sortable: true },
    { key: 'tenQuang', header: 'Tên quặng', sortable: true },
    { key: 'gia', header: 'Giá', sortable: true, align: 'start' },
    { key: 'ghiChu', header: 'Ghi chú', sortable: false, align: 'start' },
    {
      key: 'ngayTao',
      header: 'Tạo lúc',
      sortable: true,
      cell: (r) => this.vnTime.transform(r.ngayTao, 'dd/MM/yyyy HH:mm:ss'),
    },
  ];
  confirmDialogService: any;

  constructor(private dialog: MatDialog) {}

  fetcher = (q: TableQuery): Observable<TableResult<QuangTableModel>> =>
    this.quangService.search(q);

  // Xoá (tuỳ ý: truyền vào deleteHandler để component tự xoá & refresh)
  deleteHandler = (row: QuangTableModel) =>
    this.http.delete<void>(`/api/users/${row.id}`);

  onEdit(row: QuangTableModel) {
    this.dialog
      .open(QuangMuaFormDialogComponent, {
        width: '1200px',
        disableClose: true,
        data: { mode: 'EDIT', quang: row },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res) {
          this.table?.refresh();
        }
      });
  }

  openMixDialog(neoOreId?: number, existingOreId?: number) {
    this.dialog
      .open(MixQuangDialogComponent, {
        width: '1700px',
        disableClose: true,
        data: { neoOreId, existingOreId },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res) {
          this.table?.refresh();
        }
      });
  }

  onCreate() {
    this.dialog
      .open(QuangMuaFormDialogComponent, {
        width: '1200px',
        disableClose: true,
        data: { mode: 'MUA' },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res) {
          this.table?.refresh();
        }
      });
  }

  confirmDelete = (row: QuangTableModel) =>
    this.confirmDialogService.open({
      title: 'Xác nhận xoá',
      message: `Bạn có chắc muốn xoá <b>${row.tenQuang}</b>?`,
      confirmText: 'Xoá',
      cancelText: 'Huỷ',
      confirmColor: 'warn',
      icon: 'delete',
    });
}
