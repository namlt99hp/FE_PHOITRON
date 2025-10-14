import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PhoiGangPlanTabComponent } from './plan-tab/phoi-gang-plan-tab.component';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';

import { NamePlanDialogComponent } from './dialogs/name-plan-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { PhuongAnPhoiService } from '../../core/services/phuong-an-phoi.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GangFormDialogComponent } from '../gang/gang-form-dialog/gang-form-dialog.component';
import { QuangService } from '../../core/services/quang.service';

@Component({
  selector: 'app-phoi-gang-page',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatButtonModule, MatDialogModule, MatIconModule, MatMenuModule, MatTooltipModule, PhoiGangPlanTabComponent],
  templateUrl: './phoi-gang.component.html',
  styleUrl: './phoi-gang.component.scss',
})
export class PhoiGangPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private confirmDialog = inject(ConfirmDialogService);
  private paService = inject(PhuongAnPhoiService);
  private snack = inject(MatSnackBar);
  private quangService = inject(QuangService);

  // Menu context for tab actions
  private menuCtxId: number | undefined;
  private menuCtxIndex: number | undefined;
  setMenuContext(id: number | undefined, index: number) {
    this.menuCtxId = id;
    this.menuCtxIndex = index;
  }

  readonly id = signal<number>(Number(this.route.snapshot.paramMap.get('id')));
  readonly maGang = signal<string>(this.route.snapshot.queryParamMap.get('ma') || '');

  readonly plans = signal<{ id?: number; ten: string }[]>([]);
  readonly selectedIndex = signal(0);

  ngOnInit() {
    // Load existing plans for this gang ore
    this.paService.getByQuangDich(this.id()).subscribe((res) => {
      const list = (res as any)?.data ?? [];
      const mapped = list
        .sort((a: any, b: any) => new Date(a.ngay_Tinh_Toan).getTime() - new Date(b.ngay_Tinh_Toan).getTime())
        .map((x: any) => ({ id: x.id, ten: x.ten_Phuong_An, ngay_Tinh_Toan: x.ngay_Tinh_Toan }));
      this.plans.set(mapped.length ? mapped : []);
      this.selectedIndex.set(0);
    });

  }

  onAddPlan() {
    this.dialog.open(NamePlanDialogComponent, {
      width: '420px',
      disableClose: true,
      data: { title: 'Tạo phương án phối' }
    }).afterClosed().subscribe((ten: string | null) => {
      if (!ten) return;
      const payload = {
        ID: null,
        Phuong_An_Phoi: {
          Ten_Phuong_An: ten,
          ID_Quang_Dich: this.id(),
          Ngay_Tinh_Toan: new Date().toISOString(),
          Phien_Ban: 1,
          Trang_Thai: 0,
          Muc_Tieu: null,
          Ghi_Chu: null
        }
      };
      this.paService.upsert(payload).subscribe((res) => {
        const newId = (res as any)?.data?.id as number | undefined;
        const list = [...this.plans()];
        list.push({ id: newId, ten });
        this.plans.set(list);
        this.selectedIndex.set(list.length - 1);
      });
    });
  }

  onRemovePlan(index: number, $event?: MouseEvent) {
    if ($event) $event.stopPropagation();
    const plan = this.plans()[index];
    this.confirmDialog.open({
      title: 'Xác nhận xoá',
      message: `Bạn có chắc muốn xoá phương án <b>${plan.ten}</b>?`,
      confirmText: 'Xoá',
      cancelText: 'Huỷ',
      confirmColor: 'warn',
      icon: 'delete',
    }).subscribe((ok) => {
      if (!ok) return;
      const id = plan.id;
      const doRemove = () => {
        const list = [...this.plans()];
        list.splice(index, 1);
        this.plans.set(list);
        const nextIdx = Math.max(0, Math.min(this.selectedIndex(), list.length - 1));
        this.selectedIndex.set(nextIdx);
      };
      if (id) {
        this.paService.deletePlanWithRelatedData(id).subscribe({ 
          next: () => {
            doRemove();
            this.snack.open('Xóa phương án và tất cả dữ liệu liên quan thành công', 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
          }, 
          error: (err) => {
            console.error('Error deleting plan:', err);
            this.snack.open('Có lỗi xảy ra khi xóa phương án', 'Đóng', { duration: 3000, panelClass: ['snack-error'] });
          }
        });
      } else {
        doRemove();
      }
    });
  }

  // Overloads with id for accuracy
  onRemovePlanById(id?: number, fallbackIndex?: number, $event?: MouseEvent) {
    if ($event) $event.stopPropagation();
    const idx = typeof fallbackIndex === 'number' ? fallbackIndex : (id != null ? this.plans().findIndex(p => p.id === id) : (this.menuCtxIndex ?? -1));
    const effId = id ?? this.menuCtxId;
    if (idx < 0) return;
    const plan = this.plans()[idx];
    this.confirmDialog.open({
      title: 'Xác nhận xoá',
      message: `Bạn có chắc muốn xoá phương án <b>${plan.ten}</b>?`,
      confirmText: 'Xoá',
      cancelText: 'Huỷ',
      confirmColor: 'warn',
      icon: 'delete',
    }).subscribe((ok) => {
      if (!ok) return;
      const doRemove = () => {
        const list = [...this.plans()];
        list.splice(idx, 1);
        this.plans.set(list);
        const nextIdx = Math.max(0, Math.min(this.selectedIndex(), list.length - 1));
        this.selectedIndex.set(nextIdx);
      };
      if (effId) {
        this.paService.deletePlanWithRelatedData(effId).subscribe({ 
          next: () => {
            doRemove();
            this.snack.open('Xóa phương án và tất cả dữ liệu liên quan thành công', 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
          }, 
          error: (err) => {
            console.error('Error deleting plan:', err);
            this.snack.open('Có lỗi xảy ra khi xóa phương án', 'Đóng', { duration: 3000, panelClass: ['snack-error'] });
          }
        });
      } else {
        doRemove();
      }
    });
  }

  onDeletePlanById(id?: number, fallbackIndex?: number, $event?: MouseEvent) {
    if ($event) $event.stopPropagation();
    const idx = typeof fallbackIndex === 'number' ? fallbackIndex : (id != null ? this.plans().findIndex(p => p.id === id) : (this.menuCtxIndex ?? -1));
    const effId = id ?? this.menuCtxId;
    if (idx < 0) return;
    const plan = this.plans()[idx];
    this.confirmDialog.open({
      title: 'Xác nhận xoá vĩnh viễn',
      message: `Bạn có chắc muốn xoá vĩnh viễn phương án <b>${plan.ten}</b>?<br><br><span style="color: #f44336; font-weight: bold;">Cảnh báo: Hành động này không thể hoàn tác!</span>`,
      confirmText: 'Xoá vĩnh viễn',
      cancelText: 'Huỷ',
      confirmColor: 'warn',
      icon: 'delete_forever',
    }).subscribe((ok) => {
      if (!ok) return;
      const doRemove = () => {
        const list = [...this.plans()];
        list.splice(idx, 1);
        this.plans.set(list);
        const nextIdx = Math.max(0, Math.min(this.selectedIndex(), list.length - 1));
        this.selectedIndex.set(nextIdx);
      };
      if (effId) {
        this.paService.deletePlanWithRelatedData(effId).subscribe({ 
          next: () => {
            doRemove();
            this.snack.open('Xóa vĩnh viễn phương án và tất cả dữ liệu liên quan thành công', 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
          }, 
          error: (err) => {
            console.error('Error deleting plan permanently:', err);
            this.snack.open('Có lỗi xảy ra khi xóa vĩnh viễn phương án', 'Đóng', { duration: 3000, panelClass: ['snack-error'] });
          }
        });
      } else {
        doRemove();
      }
    });
  }

  onRenamePlanById(id?: number, fallbackIndex?: number) {
    const idx = typeof fallbackIndex === 'number' ? fallbackIndex : (id != null ? this.plans().findIndex(p => p.id === id) : (this.menuCtxIndex ?? -1));
    const effId = id ?? this.menuCtxId;
    if (idx < 0) return;
    const current = this.plans()[idx];
    this.dialog.open(NamePlanDialogComponent, {
      width: '420px',
      disableClose: true,
      data: { title: 'Đổi tên phương án', initialName: current.ten }
    }).afterClosed().subscribe((ten: string | null) => {
      if (!ten || ten === current.ten) return;
      const payload = {
        ID: (effId ?? current.id) ?? null,
        Phuong_An_Phoi: {
          Ten_Phuong_An: ten,
          ID_Quang_Dich: this.id(),
          Ngay_Tinh_Toan: new Date().toISOString(),
        }
      };
      this.paService.upsert(payload).subscribe(() => {
        const list = [...this.plans()];
        list[idx] = { ...list[idx], ten };
        this.plans.set(list);
      });
    });
  }

  onRenamePlan(index: number) {
    const current = this.plans()[index];
    this.dialog.open(NamePlanDialogComponent, {
      width: '420px',
      disableClose: true,
      data: { title: 'Đổi tên phương án', initialName: current.ten }
    }).afterClosed().subscribe((ten: string | null) => {
      if (!ten || ten === current.ten) return;
      const payload = {
        ID: current.id ?? null,
        Phuong_An_Phoi: {
          Ten_Phuong_An: ten,
          ID_Quang_Dich: this.id(),
          Ngay_Tinh_Toan: new Date().toISOString(),
        }
      };
      this.paService.upsert(payload).subscribe(() => {
        const list = [...this.plans()];
        list[index] = { ...list[index], ten };
        this.plans.set(list);
      });
    });
  }

  // ===== Navigation methods =====
  onCompare() {
    // Redirect to comparison page for this gang ore
    this.router.navigate(['/phoi-gang', this.id(), 'compare'], {
      queryParams: { ma: this.maGang() }
    });
  }

  onSummary() {
    // Redirect to summary page for this gang ore
    this.router.navigate(['/phoi-gang', this.id(), 'summary'], {
      queryParams: { ma: this.maGang() }
    });
  }


  // ===== Clone Plan =====
  onClonePlan(id?: number, fallbackIndex?: number) {
    const idx = typeof fallbackIndex === 'number' ? fallbackIndex : (id != null ? this.plans().findIndex(p => p.id === id) : (this.menuCtxIndex ?? -1));
    const effId = id ?? this.menuCtxId;
    if (idx < 0) return;
    const current = this.plans()[idx];
    this.dialog.open(NamePlanDialogComponent, {
      width: '420px',
      disableClose: true,
      data: { title: 'Đặt tên cho bản sao', initialName: `${current.ten} - Copy` }
    }).afterClosed().subscribe((newName: string | null) => {
      if (!newName) return;
      const dto = {
        sourcePlanId: current.id!,
        newPlanName: newName,
        resetRatiosToZero: false,
        copySnapshots: false,
        copyDates: false,
        copyStatuses: false,
        cloneDate: new Date().toISOString(),
      };
      this.paService.clonePlan(dto).subscribe({
        next: (res) => {
          const newId = (res as any)?.data?.id as number | undefined;
          this.paService.getByQuangDich(this.id()).subscribe((r) => {
            const list = (r as any)?.data ?? [];
            const mapped = list
              .sort((a: any, b: any) => new Date(a.ngay_Tinh_Toan).getTime() - new Date(b.ngay_Tinh_Toan).getTime())
              .map((x: any) => ({ id: x.id, ten: x.ten_Phuong_An, ngay_Tinh_Toan: x.ngay_Tinh_Toan }));
            this.plans.set(mapped);
            const idx = mapped.findIndex((x: any) => x.id === newId);
            this.selectedIndex.set(idx >= 0 ? idx : this.selectedIndex());
            this.snack.open('Nhân bản phương án thành công', 'OK', { duration: 2000 });
          });
        },
        error: () => this.snack.open('Nhân bản thất bại', 'OK', { duration: 2000 })
      });
    });
  }
}
