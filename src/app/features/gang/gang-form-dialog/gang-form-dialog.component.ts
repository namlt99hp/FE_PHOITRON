import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuangUpsertWithThanhPhanDto, LoaiQuang, QuangThanhPhanHoaHocDto, QuangKetQuaUpsertDto } from '../../../core/models/quang.model';
import { QuangService } from '../../../core/services/quang.service';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectTphhDialogComponent } from '../../mix-quang-dialog/select-tphh-dialog/select-tphh-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { FormulaCalculatorComponent } from '../../locao-process-param/formula-calculator/formula-calculator.component';
import { FormulaCalculatorData, FormulaCalculatorResult, FormulaParam, FormulaCalculatorContext, GangComposition } from '../../../core/models/formula-calculator.model';
import { ThanhPhanHoaHocService } from '../../../core/services/tphh.service';

@Component({
  selector: 'app-gang-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatTableModule, MatIconModule, MatTooltipModule],
  templateUrl: './gang-form-dialog.component.html',
  styleUrl: './gang-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GangFormDialogComponent {
  private fb = inject(FormBuilder);
  private quangService = inject(QuangService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private tphhService = inject(ThanhPhanHoaHocService);
  
  form = this.fb.group({
    maGang: ['', [Validators.required, Validators.maxLength(50)]],
    tenGang: ['', [Validators.required, Validators.maxLength(200)]],
    ghiChu: ['' as string | null],
  });

  // Selected chemicals (render as columns like quang-mua) - signals to match HTML copied from quang-mua
  selectedChems = signal<{ id: number; ma_TPHH: string; ten_TPHH?: string }[]>([]);
  tp_HoaHocs = signal(new Map<number, { 
    phanTram: FormControl<number | null>; 
    calcFormula?: string; 
    displayFormula?: string;
    isCalculated?: boolean;
    khoiLuong?: number | null;
  }>());

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number | null; loaiQuang?: number | null; idQuangGang?: number | null; planId?: number | null },
    private ref: MatDialogRef<GangFormDialogComponent, any>
  ) {}

  ngOnInit(): void {
    if (this.data && this.data.id) {
      this.quangService.getById(this.data.id).subscribe((res) => {
        if (res?.quang) {
          this.form.patchValue({
            maGang: res.quang.ma_Quang,
            tenGang: res.quang.ten_Quang,
            ghiChu: res.quang.ghi_Chu ?? null,
          });
          // Map TP_HoaHocs -> selectedChems + tp_HoaHocs controls (seed values)
          const chems = (res.tP_HoaHocs || []).map(c => ({ id: c.id, ma_TPHH: c.ma_TPHH, ten_TPHH: c.ten_TPHH || undefined }));
          this.selectedChems.set(chems);
          const map = new Map<number, { 
            phanTram: FormControl<number | null>; 
            calcFormula?: string; 
            displayFormula?: string;
            isCalculated?: boolean; 
          }>();
          for (const c of res.tP_HoaHocs || []) {
            map.set(c.id, { 
              phanTram: new FormControl<number | null>(c.phanTram ?? 0),
              calcFormula: c.calcFormula || undefined,
              isCalculated: c.isCalculated || false
            });
          }
          this.tp_HoaHocs.set(map);
        }
      });
    }
  }

  onSave() {
    const thanhPhanHoaHoc: QuangThanhPhanHoaHocDto[] = this.selectedChems().map((c, idx) => ({
      ID_TPHH: c.id,
      Gia_Tri_PhanTram: this.tp_HoaHocs().get(c.id)?.phanTram.value ?? 0,
      ThuTuTPHH: idx + 1,
      KhoiLuong: this.tp_HoaHocs().get(c.id)?.khoiLuong ?? null,
      CalcFormula: this.tp_HoaHocs().get(c.id)?.calcFormula ?? null,
      IsCalculated: this.tp_HoaHocs().get(c.id)?.isCalculated ?? false
    }));

    // Nếu có planId, sử dụng API mới cho Gang/Xỉ kết quả
    if (this.data?.planId) {
      const ketQuaDto: QuangKetQuaUpsertDto = {
        id: this.data?.id ?? null,
        ma_Quang: this.form.controls.maGang.value!,
        ten_Quang: this.form.controls.tenGang.value!,
        loai_Quang: this.data?.loaiQuang === 4 ? 4 : 2, // 2=Gang, 4=Xỉ
        thanhPhanHoaHoc: thanhPhanHoaHoc,
        id_PhuongAn: this.data.planId,
        dang_Hoat_Dong: true,
        ghi_Chu: this.form.controls.ghiChu.value ?? null,
        id_Quang_Gang: this.data?.idQuangGang ?? null
      };
      
      this.quangService.upsertKetQuaWithThanhPhan(ketQuaDto).subscribe((res) => {
        if (res?.success && res.data?.id) {
          const message = this.data?.loaiQuang === 4 
            ? (this.data?.id ? 'Cập nhật xỉ kết quả thành công' : 'Thêm xỉ kết quả thành công')
            : (this.data?.id ? 'Cập nhật gang kết quả thành công' : 'Thêm gang kết quả thành công');
          this.snack.open(message, 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
          this.ref.close(res.data.id);
        } else {
          this.snack.open('Lưu kết quả thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
        }
      }, () => {
        this.snack.open('Lưu kết quả thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      });
      return;
    }

    // Fallback: sử dụng API cũ cho Gang/Xỉ đích (không có planId)
    if (this.data?.loaiQuang === 4) {
      const slagDto: QuangUpsertWithThanhPhanDto = {
        id: this.data?.id ?? null,
        ma_Quang: this.form.controls.maGang.value!,
        ten_Quang: this.form.controls.tenGang.value!,
        loai_Quang: 4,
        dang_Hoat_Dong: true,
        ghi_Chu: this.form.controls.ghiChu.value ?? null,
        thanhPhanHoaHoc: thanhPhanHoaHoc,
        gia: null,
        id_Quang_Gang: this.data?.idQuangGang ?? null
      };
      this.quangService.upsertWithThanhPhan(slagDto).subscribe((res) => {
        if (res?.success && res.data?.id) {
          this.snack.open(this.data?.id ? 'Cập nhật xỉ thành công' : 'Thêm xỉ thành công', 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
          this.ref.close(res.data.id);
        } else {
          this.snack.open('Lưu xỉ thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
        }
      }, () => {
        this.snack.open('Lưu xỉ thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      });
      return;
    }

    // Mặc định: tạo/cập nhật quặng gang đích
    const gangDto: QuangUpsertWithThanhPhanDto = {
      id: this.data?.id ?? null,
      ma_Quang: this.form.controls.maGang.value!,
      ten_Quang: this.form.controls.tenGang.value!,
      loai_Quang: LoaiQuang.Gang,
      dang_Hoat_Dong: true,
      ghi_Chu: this.form.controls.ghiChu.value ?? null,
      thanhPhanHoaHoc: thanhPhanHoaHoc,
      gia: null,
      id_Quang_Gang: null
    };
    this.quangService.upsertWithThanhPhan(gangDto).subscribe((res) => {
      if (res?.success && res.data?.id) {
        this.snack.open(this.data?.id ? 'Cập nhật quặng gang thành công' : 'Thêm quặng gang thành công', 'Đóng', {
          duration: 1500,
          panelClass: ['snack-success'],
        });
        this.ref.close(res.data.id);
      } else {
        this.snack.open('Lưu quặng gang thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      }
    }, () => {
      this.snack.open('Lưu quặng gang thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
    });
  }

  openSelectChems() {
    const dlg = this.dialog.open(SelectTphhDialogComponent, {
      width: '750px',
      data: { preselectedIds: this.selectedChems().map(x => x.id) }
    });
    dlg.afterClosed().subscribe((list: { id: number; ma_TPHH: string; ten_TPHH?: string }[] | undefined) => {
      if (!list) return;
      this.selectedChems.set(list);
      // sync controls for each selected chem
      const next = new Map(this.tp_HoaHocs());
      const selectedIds = new Set(this.selectedChems().map(c => c.id));
      for (const c of this.selectedChems()) {
        if (!next.has(c.id)) {
          next.set(c.id, { 
            phanTram: new FormControl<number | null>(0),
            calcFormula: undefined,
            displayFormula: undefined,
            isCalculated: false
          });
        }
      }
      // remove unselected
      for (const id of Array.from(next.keys())) {
        if (!selectedIds.has(id)) next.delete(id);
      }
      this.tp_HoaHocs.set(next);
    });
  }

  removeChem(id: number) {
    const list = this.selectedChems().filter(c => c.id !== id);
    this.selectedChems.set(list);
    const next = new Map(this.tp_HoaHocs());
    next.delete(id);
    this.tp_HoaHocs.set(next);
  }

  trackByChem = (_: number, c: { id: number }) => c.id;

  onCancel() {
    this.ref.close(null);
  }

  onDeleteSlag() {
    if (!this.data?.id) return;
    // Soft delete slag ore by id
    this.quangService.softDelete(this.data.id).subscribe({
      next: () => {
        this.snack.open('Xoá xỉ thành công', 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
        this.ref.close('deleted');
      },
      error: () => this.snack.open('Xoá xỉ thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] })
    });
  }

  openFormulaCalculator(chem: { id: number; ma_TPHH: string; ten_TPHH?: string }) {
    // Create available params from selected chemicals
    const availableParams: FormulaParam[] = this.selectedChems().map(c => ({
      id: c.id,
      code: c.ma_TPHH,
      ten: c.ma_TPHH || c.ma_TPHH
    }));

    const dialogData: FormulaCalculatorData = {
      context: FormulaCalculatorContext.OreChemistry,
      title: `Thiết lập công thức cho ${chem.ma_TPHH}`,
      currentIdFormula: this.tp_HoaHocs().get(chem.id)?.calcFormula || '',
      currentIsCalculated: this.tp_HoaHocs().get(chem.id)?.isCalculated || false,
      currentComponentId: chem.id, // Pass the current component ID
      availableParams: availableParams,
      searchApi: async (searchTerm: string) => {
        return new Promise((resolve) => {
          this.tphhService.search({
            pageIndex: 0,
            pageSize: 50,
            search: searchTerm,
            sortBy: 'code',
            sortDir: 'asc'
          }).subscribe(result => {
            const searchParams: FormulaParam[] = result.data
              .map(p => ({
                id: p.id,
                code: p.ma_TPHH,
                ten: p.ma_TPHH || p.ma_TPHH
              }));
            resolve(searchParams);
          });
        });
      },
      searchPlaceholder: 'Tìm kiếm thành phần hóa học...',
      // Mock data for now - will be replaced with real data later
      gangData: this.selectedChems().map(c => ({
        tphhId: c.id,
        element: c.ten_TPHH || c.ma_TPHH,
        mass: 0,
        percentage: 0,
        isCalculated: false,
        calcFormula: undefined
      })),
      arrayData: [] // Will be populated with external data later
    };

    const dialogRef = this.dialog.open(FormulaCalculatorComponent, {
      width: '1000px',
      height: 'auto',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: FormulaCalculatorResult | null) => {
      if (result) {
        console.log('Formula calculator result:', result);
        // Update the formula for this chemical
        const currentMap = new Map(this.tp_HoaHocs());
        const currentCtrl = currentMap.get(chem.id);
        if (currentCtrl) {
          // Always set formula (tick is just a value, not a decision factor)
          currentCtrl.calcFormula = result.idFormula || undefined;
          currentCtrl.displayFormula = result.displayFormula || undefined;
          currentCtrl.isCalculated = result.isCalculated ?? false; // Just send the tick value
          console.log('Set formula:', currentCtrl.calcFormula);
          console.log('Set displayFormula:', currentCtrl.displayFormula);
          console.log('Set isCalculated:', currentCtrl.isCalculated);
          currentMap.set(chem.id, currentCtrl);
          this.tp_HoaHocs.set(currentMap);
        }
      }
    });
  }
}


