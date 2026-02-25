import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { TableCommonComponent } from '../../shared/components/table-common/table-common.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TableColumn, TableQuery, TableResult } from '../../shared/components/table-common/table-types';
import { VnTimePipe } from '../../shared/pipes/datetime.pipe';
import { GangTableModel } from '../../core/models/gang.model';
import { QuangService } from '../../core/services/quang.service';
import { LoaiQuangEnum } from '../../core/enums/loaiquang.enum';
import { Observable } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GangFormDialogComponent } from './gang-form-dialog/gang-form-dialog.component';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { tap, map } from 'rxjs/operators';

@Component({
  selector: 'app-gang',
  standalone: true,
  imports: [CommonModule, TableCommonComponent, MatButtonModule, MatIconModule, MatDialogModule, GangFormDialogComponent],
  templateUrl: './gang.component.html',
  styleUrl: './gang.component.scss'
})
export class GangComponent {
  private dialog = inject(MatDialog);
  private quangService = inject(QuangService);
  private confirmDialogService = inject(ConfirmDialogService);
  private snack = inject(MatSnackBar);
  vnTime = inject(VnTimePipe);
  @ViewChild(TableCommonComponent)
  table!: TableCommonComponent<GangTableModel>;
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
      idLoaiQuang: [LoaiQuangEnum.Gang], // Loại quặng Gang
      isGangTarget: true, // Chỉ hiển thị gang đích (ID_Quang_Gang = null), không hiển thị gang kết quả
    }) as unknown as Observable<TableResult<GangTableModel>>;

  deleteHandler = (row: GangTableModel): Observable<void> =>
    this.quangService.deleteGangDich(row.id).pipe(
      tap((res) => {
        if (res && res.success) {
          this.snack.open('Xóa gang đích và tất cả dữ liệu liên quan thành công', 'Đóng', {
            duration: 3000,
            panelClass: ['snack-success']
          });
        } else {
          this.snack.open(res?.message || 'Xóa gang đích thất bại', 'Đóng', {
            duration: 2000,
            panelClass: ['snack-error']
          });
        }
      }),
      map(() => void 0)
    );

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

  onClone(row: GangTableModel) {
    this.dialog
      .open(GangFormDialogComponent, {
        width: '1200px',
        disableClose: true,
        data: { id: null, cloneFromId: row.id, cloneWithPlans: true }, // Thêm flag để clone tất cả phương án
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
      title: 'Xác nhận xoá gang đích',
      message: `Bạn có chắc muốn xoá gang đích <b>${(row as any).tenQuang}</b>?<br><br><small class="text-warn">Lưu ý: Hành động này sẽ xóa tất cả phương án, template config, xỉ liên quan và gang đích này. Không thể hoàn tác!</small>`,
      confirmText: 'Xoá',
      cancelText: 'Huỷ',
      confirmColor: 'warn',
      icon: 'delete',
    });
}
