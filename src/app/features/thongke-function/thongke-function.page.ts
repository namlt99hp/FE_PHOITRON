import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ThongKeFunctionService } from '../../core/services/thongke-function.service';
import { ThongKeFunctionModel } from '../../core/models/thongke-function.model';
import { ThongKeFunctionUpsertDialog } from './upsert-dialog/thongke-function-upsert.dialog';
import { TableCommonComponent } from '../../shared/components/table-common/table-common.component';
import { TableColumn, TableQuery, TableResult } from '../../shared/components/table-common/table-types';
import { Observable, of } from 'rxjs';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { tap, map } from 'rxjs/operators';

@Component({
  selector: 'app-thongke-function-page',
  standalone: true,
  imports: [CommonModule, TableCommonComponent, MatButtonModule, MatIconModule],
  templateUrl: './thongke-function.page.html',
  styleUrls: ['./thongke-function.page.scss']
})
export class ThongKeFunctionPage implements OnInit {
  private svc = inject(ThongKeFunctionService);
  private dialog = inject(MatDialog);
  private confirmDialogService = inject(ConfirmDialogService);
  private snack = inject(MatSnackBar);
  @ViewChild(TableCommonComponent)
  table!: TableCommonComponent<ThongKeFunctionModel>;

  columns: TableColumn<ThongKeFunctionModel>[] = [
    { key: 'ten', header: 'Tên', sortable: true, width: '300px' },
    { key: 'moTa', header: 'Mô tả', sortable: false, width: '400px' },    
    { key: 'code', header: 'Mã', sortable: true, width: '150px' },
    { key: 'donVi', header: 'Đơn vị', sortable: true, width: '100px' },
    { 
      key: 'isActive', 
      header: 'Trạng thái', 
      sortable: true, 
      width: '100px',
      cell: (row) => row.isActive ? 'Hoạt động' : 'Tạm dừng'
    }
  ];

  fetcher = (query: TableQuery): Observable<TableResult<ThongKeFunctionModel>> => {
    return new Observable(observer => {
      this.svc.searchFunctions(
        query.pageIndex + 1, // Convert 0-based to 1-based
        query.pageSize,
        query.search || undefined,
        query.sortBy || undefined,
        query.sortDir || undefined
      ).subscribe({
        next: (response) => {
          // Response structure: { success: boolean, message: string, statusCode: number, data: PagedResult }
          // PagedResult structure: { total: number, page: number, pageSize: number, data: ThongKeFunctionDto[] }
          if (response && response.success && response.data) {
            observer.next({
              data: response.data.data || [],
              total: response.data.total || 0
            });
          } else {
            console.warn('Invalid response structure:', response);
            observer.next({
              data: [],
              total: 0
            });
          }
          observer.complete();
        },
        error: (error) => {
          console.error('Error fetching thongke functions:', error);
          observer.next({
            data: [],
            total: 0
          });
          observer.complete();
        }
      });
    });
  };

  ngOnInit(): void {
    // Component initialization
  }

  onCreate(): void {
    const dlg = this.dialog.open(ThongKeFunctionUpsertDialog, {
      width: '600px',
      data: { model: null }
    });
    dlg.afterClosed().subscribe((ok) => ok && (this.table?.refresh()));
  }

  onEdit(model: ThongKeFunctionModel): void {
    const dlg = this.dialog.open(ThongKeFunctionUpsertDialog, {
      width: '600px',
      data: { model }
    });
    dlg.afterClosed().subscribe((ok) => ok && (this.table?.refresh()));
  }

  confirmDelete = (row: ThongKeFunctionModel) =>
    this.confirmDialogService.open({
      title: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa <b>${row.ten}</b>?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      confirmColor: 'warn',
      icon: 'delete',
    });

  deleteHandler = (row: ThongKeFunctionModel): Observable<void> =>
    this.svc.deleteFunction(row.id).pipe(
      tap((res) => {
        if (res && res.success) {
          this.snack.open('Xóa hàm thống kê thành công', 'Đóng', { 
            duration: 2000, 
            panelClass: ['snack-success'] 
          });
        }
      }),
      map(() => void 0)
    );
}
