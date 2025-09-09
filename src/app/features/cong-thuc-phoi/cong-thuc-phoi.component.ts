import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, inject, ViewChild } from '@angular/core';
import { TableCommonComponent } from '../../shared/components/table-common/table-common.component';
import {
  TableColumn,
  TableQuery,
  TableResult,
} from '../../shared/components/table-common/table-types';
import { Observable } from 'rxjs';
import {
  CongThucPhoiDetailRespone,
  CongThucPhoiTableModel,
} from '../../core/models/congthucphoi.model';
import { CongThucPhoiService } from '../../core/services/congthucphoi.service';
import { VnTimePipe } from '../../shared/pipes/datetime.pipe';
import { MatIconModule } from '@angular/material/icon';
import { MixQuangDialogComponent } from '../mix-quang-dialog/mix-quang-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-cong-thuc-phoi',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    TableCommonComponent,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './cong-thuc-phoi.component.html',
  styleUrl: './cong-thuc-phoi.component.scss',
})
export class CongThucPhoiComponent {
  private http = inject(HttpClient);
  private congThucPhoiService = inject(CongThucPhoiService);
  vnTime = inject(VnTimePipe);
  @ViewChild(TableCommonComponent)
  table!: TableCommonComponent<CongThucPhoiTableModel>;
  public tableTitle: string = 'Công thức phối trộn';

  // Cấu hình cột
  readonly columns: TableColumn<CongThucPhoiTableModel>[] = [
    { key: 'id', header: 'ID', width: '90px', sortable: true, align: 'start' },
    { key: 'maCongThuc', header: 'Mã công thức', sortable: true },
    { key: 'tenCongThuc', header: 'Tên công thức', sortable: true },
    {
      key: 'tongPhanTram',
      header: 'Tổng phần trăm',
      sortable: true,
      align: 'start',
    },
    { key: 'ghiChu', header: 'Ghi chú', sortable: true, align: 'start' },
    {
      key: 'ngayTao',
      header: 'Tạo lúc',
      sortable: true,
      cell: (r) => this.vnTime.transform(r.ngayTao, 'dd/MM/yyyy HH:mm:ss'),
    },
  ];

  constructor(private dialog: MatDialog) {}

  fetcher = (q: TableQuery): Observable<TableResult<CongThucPhoiTableModel>> =>
    this.congThucPhoiService.search(q);

  // Xoá (tuỳ ý: truyền vào deleteHandler để component tự xoá & refresh)
  deleteHandler = (row: CongThucPhoiTableModel) =>
    this.http.delete<void>(`/api/users/${row.id}`);

  // Hoặc lắng nghe sự kiện để tự xử lý ở đây
  onView(row: CongThucPhoiTableModel) {
    // ví dụ: điều hướng hoặc mở dialog
    this.congThucPhoiService
      .getDetail(row.id)
      .subscribe((res: CongThucPhoiDetailRespone) => {
        console.log(res);
      });
  }

  onEdit(row: CongThucPhoiTableModel) {
    // ví dụ: bật form edit bên cạnh
    console.log('EDIT', row);
  }

  onDelete(row: CongThucPhoiTableModel) {
    // Chỉ dùng khi KHÔNG truyền deleteHandler, lúc đó component sẽ emit sự kiện này
    console.log('DELETE CLICKED', row);
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
}
