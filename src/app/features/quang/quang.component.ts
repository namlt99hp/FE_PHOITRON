import { CommonModule } from '@angular/common';
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
import { Observable, of } from 'rxjs';
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
import { MilestoneEnum } from '../../core/enums/milestone.enum';
import { LoaiQuangEnum } from '../../core/enums/loaiquang.enum';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { tap, map, switchMap, catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CongThucPhoiService } from '../../core/services/congthucphoi.service';

@Component({
  selector: 'app-quang',
  standalone: true,
  imports: [CommonModule, TableCommonComponent, MatButtonModule, MatIconModule],
  templateUrl: './quang.component.html',
  styleUrl: './quang.component.scss',
})
export class QuangComponent {
  private quangService = inject(QuangService);
  private dialog = inject(MatDialog);
  private confirmDialogService = inject(ConfirmDialogService);
  private snack = inject(MatSnackBar);
  private congThucPhoiService = inject(CongThucPhoiService);
  vnTime = inject(VnTimePipe);
  @ViewChild(TableCommonComponent)
  table!: TableCommonComponent<QuangTableModel>;
  public tableTitle: string = 'Quặng mua về';

  // Cấu hình cột
  readonly columns: TableColumn<QuangTableModel>[] = [
    { key: 'id', header: 'ID', width: '90px', sortable: true, align: 'start' },
    { key: 'tenQuang', header: 'Tên quặng', sortable: true },
    { key: 'maQuang', header: 'Mã quặng', sortable: true },
    {
      key: 'gia', header: 'Giá', sortable: true, align: 'start',
      cell: (r) => r.gia ? r.gia + ' ' + r.tien_Te : '',
    },
    {
      key: 'tenLoaiQuang',
      header: 'Loại quặng',
      sortable: true,
      align: 'start'
    },
    { key: 'ghiChu', header: 'Ghi chú', sortable: false, align: 'start' },
    {
      key: 'ngayTao',
      header: 'Tạo lúc',
      sortable: true,
      cell: (r) => this.vnTime.transform(r.ngayTao, 'dd/MM/yyyy HH:mm:ss'),
    },
  ];

  fetcher = (q: TableQuery): Observable<TableResult<QuangTableModel>> =>
    this.quangService.search({
      ...q,
      idLoaiQuang: [
        LoaiQuangEnum.Mua,
        LoaiQuangEnum.Tron,
        LoaiQuangEnum.NhienLieu,
        LoaiQuangEnum.QuangCo,
        LoaiQuangEnum.QuangVeVien
      ], // Quặng mua về, phối, nhiên liệu, cỡ, vê viên
    }) as unknown as Observable<TableResult<QuangTableModel>>;

  // Xoá quặng
  deleteHandler = (row: QuangTableModel): Observable<void> =>
    this.quangService.delete(row.id).pipe(
      tap((res) => {
        if (res && res.success) {
          this.snack.open('Xóa quặng thành công', 'Đóng', {
            duration: 2000,
            panelClass: ['snack-success'],
          });
        } else {
          this.snack.open(res?.message || 'Không thể xóa quặng', 'Đóng', {
            duration: 3000,
            panelClass: ['snack-error'],
          });
        }
      }),
      catchError((error) => {
        const errorMessage = error.error?.message || error.message || 'Có lỗi xảy ra khi xóa quặng';
        this.snack.open(errorMessage, 'Đóng', {
          duration: 3000,
          panelClass: ['snack-error'],
        });
        return of(void 0);
      }),
      map(() => void 0)
    );

  onEdit(row: QuangTableModel) {
    // Nếu là quặng trộn hoặc quặng vê viên thì mở mix-quang-dialog để chỉnh sửa
    const loai = (row as any).loaiQuang ?? (row as any).loai_Quang ?? row.iD_LoaiQuang ?? (row as any).iD_LoaiQuang;
    if (loai === LoaiQuangEnum.Tron || loai === LoaiQuangEnum.QuangVeVien) {
      // Lấy ID công thức phối từ ID_Quang_DauRa
      this.congThucPhoiService
        .getByQuangDauRa(row.id)
        .pipe(
          map((formula) => {
            // API giờ trả về một object duy nhất thay vì array
            if (!formula) {
              return null;
            }
            // Lấy ID từ object (có thể là id hoặc ID)
            return formula.id ?? formula.ID ?? null;
          }),
          catchError((err) => {
            console.error('Error getting formula by quang dau ra:', err);
            this.snack.open('Không thể tải thông tin công thức phối', 'Đóng', {
              duration: 3000,
              panelClass: ['snack-error'],
            });
            return of(null);
          })
        )
        .subscribe((congThucPhoiId) => {
          if (congThucPhoiId === null) {
            this.snack.open('Không tìm thấy công thức phối cho quặng này', 'Đóng', {
              duration: 3000,
              panelClass: ['snack-warning'],
            });
            return;
          }

          // Cùng layout như khi bấm "Trộn quặng" (width, maxWidth) và truyền outputLoaiQuang để fill select loại quặng
          this.dialog
            .open(MixQuangDialogComponent, {
              width: '1850px',
              maxWidth: '99vw',
              disableClose: true,
              data: {
                existingOreId: row.id,
                outputLoaiQuang: loai ?? LoaiQuangEnum.Tron,
                congThucPhoiId: congThucPhoiId,
              },
            })
            .afterClosed()
            .subscribe((res) => {
              if (res) {
                this.table?.refresh();
              }
            });
        });
      return;
    }

    // Ngược lại: mở form quặng mua về
    this.dialog
      .open(QuangMuaFormDialogComponent, {
        width: '1500px',
        disableClose: true,
        data: { mode: 'EDIT', quang: row },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res && res.success) {
          this.table?.refresh();
        }
      });
  }

  openMixDialog(neoOreId?: number, existingOreId?: number) {
    this.dialog
      .open(MixQuangDialogComponent, {
        width: '1850px',
        maxWidth: '99vw',
        disableClose: true,
        data: {
          neoOreId,
          existingOreId,
          outputLoaiQuang: LoaiQuangEnum.Tron,
        },
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
        width: '1500px',
        disableClose: true,
        data: { mode: 'MUA' },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res && res.success) {
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
