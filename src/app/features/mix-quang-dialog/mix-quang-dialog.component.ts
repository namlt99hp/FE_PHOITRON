import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  OnInit,
  Signal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  CongThucPhoiUpsertDto,
  OreChemItemDto,
  QuangTron,
  UpsertAndConfirmDto,
} from '../../core/models/congthucphoi.model';
import { MixOreService } from '../../core/services/mix-quang.service';
import {
  ChemVm,
  SelectTphhDialogComponent,
} from './select-tphh-dialog/select-tphh-dialog.component';
import {
  OreVm,
  SelectQuangDialogComponent,
} from './select-quang-dialog/select-quang-dialog.component';
import { CongThucPhoiService } from '../../core/services/congthucphoi.service';
import { QuangService } from '../../core/services/quang.service';
import { firstValueFrom, startWith } from 'rxjs';
import { QuangDetailResponse } from '../../core/models/quang.model';
import { MatSnackBar } from '@angular/material/snack-bar';

type RatioRow = {
  idQuang: number;
  maQuang: string;
  tenQuang: string;
  gia?: number | null;
  matKhiNung?: number | null; // mất khi nung
  ratioCtrl: FormControl<number>; // tỉ lệ phối
  ratio$?: Signal<number>;
  // thành phần hoá học có thể SỬA TAY tại ô của từng quặng
  chems: Map<number, FormControl<number>>; // key: chemId, value: %
  chem$?: Map<number, Signal<number>>;
  // mất khi nung có thể SỬA TAY
  matKhiNungCtrl: FormControl<number>; // mất khi nung
  matKhiNung$?: Signal<number>;
};

@Component({
  selector: 'app-mix-quang-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatCheckboxModule,
    MatTooltipModule,
    AsyncPipe,
  ],
  templateUrl: './mix-quang-dialog.component.html',
  styleUrl: './mix-quang-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MixQuangDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dlgRef = inject(MatDialogRef<MixQuangDialogComponent>);
  private dialog = inject(MatDialog);
  private svc = inject(MixOreService);
  private quangService = inject(QuangService);
  private congThucPhoiService = inject(CongThucPhoiService);
  private destroyRef = inject(DestroyRef);
  private snack = inject(MatSnackBar);
  
  data = inject<{ neoOreId?: number; existingOreId?: number } | null>(
    MAT_DIALOG_DATA,
    { optional: true }
  );
  private readonly injector = inject(Injector);
  // ==== Header forms ====
  oreForm = this.fb.group({
    MaQuang: ['', Validators.required],
    TenQuang: ['', Validators.required],
    Gia: this.fb.control<number | null>(null),
    GhiChu: [''],
  });

  // ==== Ràng buộc cho matKhiNung ====
  matKhiNungConstraints = signal({
    minCtrl: new FormControl<number | null>(null),
    maxCtrl: new FormControl<number | null>(null),
  });

  formulaForm = this.fb.group({
    ID: this.fb.control<number | null>(null),
    ID_QuangNeo: this.fb.control<number | null>(null),
    MaCongThuc: ['', Validators.required],
    TenCongThuc: ['', Validators.required],
    GhiChu: [''],
  });

  // ==== Chọn TPHH (cột động) + ràng buộc min/max ====
  selectedChems = signal<ChemVm[]>([]); // [{id, code, name}]
  // form ràng buộc: Map<chemId, {min,max}>
  constraints = signal<
    Map<
      number,
      {
        minCtrl: FormControl<number | null>;
        maxCtrl: FormControl<number | null>;
      }
    >
  >(new Map());

  // ==== Chọn quặng (hàng động) + tỉ lệ + thành phần ====
  rows = signal<RatioRow[]>([]);
  // ---- thêm:
  selectedOres = signal<OreVm[]>([]);
  oreChemMap = signal(new Map<number, Map<number, number>>()); // oreId -> (chemId -> %)
  // ==== Bảng động: cột = ['__ore','__ratio','__matKhiNung', ...chemIds...,'__actionsRow'] ====
  displayedColumns = computed(() => {
    // ore info + ratio + matKhiNung + each chem + actions
    const chemCols = this.selectedChems().map((c) => `chem_${c.id}`);
    return ['__ore', '__ratio', '__matKhiNung', ...chemCols, '__rowActions'];
  });
  // ==== Hàng kết quả (tính theo weights) ====
  resultRow = computed(() => {
    const chems = this.selectedChems();
    const rows = this.rows();

    // Đọc từ signal -> computed sẽ re-run khi control đổi
    const vals = rows.map((r) => r.ratio$?.() ?? r.ratioCtrl.value ?? 0);
    const sum = vals.reduce((a, b) => a + b, 0);

    const result: Record<number, number> = {};
    for (const c of chems) {
      let total = 0;
      rows.forEach((r, i) => {
        const pct = r.chem$?.get(c.id)?.() ?? r.chems.get(c.id)?.value ?? 0;
        const w = sum > 0 ? (vals[i] ?? 0) / sum : 0;
        total += w * pct;
      });
      result[c.id] = Math.round(total * 100) / 100;
    }
    return result;
  });

  // ==== Kết quả mất khi nung (tính theo weights) ====
  resultMatKhiNung = computed(() => {
    const rows = this.rows();

    // Đọc từ signal -> computed sẽ re-run khi control đổi
    const vals = rows.map((r) => r.ratio$?.() ?? r.ratioCtrl.value ?? 0);
    const sum = vals.reduce((a, b) => a + b, 0);

    let total = 0;
    rows.forEach((r, i) => {
      const matKhiNung = r.matKhiNung$?.() ?? r.matKhiNungCtrl.value ?? 0;
      const w = sum > 0 ? (vals[i] ?? 0) / sum : 0;
      total += w * matKhiNung;
    });
    
    return Math.round(total * 100) / 100;
  });

  // kiểm tra out-of-range để highlight cho ô kết quả
  isOutOfRange(chemId: number): boolean {
    const res = this.resultRow()[chemId] ?? 0;
    const rb = this.constraints().get(chemId);
    const min = rb?.minCtrl.value ?? null;
    const max = rb?.maxCtrl.value ?? null;
    if (min != null && res < min) return true;
    if (max != null && res > max) return true;
    return false;
  }

  // kiểm tra out-of-range cho matKhiNung
  isMatKhiNungOutOfRange(): boolean {
    const res = this.resultMatKhiNung();
    const constraints = this.matKhiNungConstraints();
    const min = constraints.minCtrl.value ?? null;
    const max = constraints.maxCtrl.value ?? null;
    if (min != null && res < min) return true;
    if (max != null && res > max) return true;
    return false;
  }

  // ==== VALIDATION ====
  
  // Kiểm tra validation tổng thể
  isFormValid(): boolean {
    // 1. Kiểm tra form cơ bản
    if (this.oreForm.invalid || this.formulaForm.invalid) {
      return false;
    }

    // 2. Kiểm tra có chọn thành phần hóa học
    if (this.selectedChems().length === 0) {
      return false;
    }

    // 3. Kiểm tra có chọn quặng
    if (this.rows().length === 0) {
      return false;
    }

    // 4. Kiểm tra tỉ lệ phối hợp lệ
    const totalRatio = this.totalRatio();
    if (totalRatio <= 0) {
      return false;
    }

    // 5. Kiểm tra có giá trị âm trong tỉ lệ phối
    const hasNegativeRatio = this.rows().some(r => (r.ratioCtrl.value ?? 0) < 0);
    if (hasNegativeRatio) {
      return false;
    }

    // 6. Kiểm tra có giá trị âm trong thành phần hóa học
    const hasNegativeChem = this.rows().some(r => {
      return Array.from(r.chems.values()).some(ctrl => (ctrl.value ?? 0) < 0);
    });
    if (hasNegativeChem) {
      return false;
    }

    // 7. Kiểm tra có giá trị âm trong mất khi nung
    const hasNegativeMatKhiNung = this.rows().some(r => (r.matKhiNungCtrl.value ?? 0) < 0);
    if (hasNegativeMatKhiNung) {
      return false;
    }

    return true;
  }

  // Kiểm tra có lỗi validation để hiển thị warning
  getValidationErrors(): string[] {
    const errors: string[] = [];

    // Form validation errors
    if (this.oreForm.invalid) {
      if (this.oreForm.controls.MaQuang.invalid) errors.push('Mã quặng là bắt buộc');
      if (this.oreForm.controls.TenQuang.invalid) errors.push('Tên quặng là bắt buộc');
    }

    if (this.formulaForm.invalid) {
      if (this.formulaForm.controls.MaCongThuc.invalid) errors.push('Mã công thức là bắt buộc');
      if (this.formulaForm.controls.TenCongThuc.invalid) errors.push('Tên công thức là bắt buộc');
    }

    // Business logic errors
    if (this.selectedChems().length === 0) {
      errors.push('Vui lòng chọn ít nhất một thành phần hóa học');
    }

    if (this.rows().length === 0) {
      errors.push('Vui lòng chọn ít nhất một quặng nguồn');
    }

    const totalRatio = this.totalRatio();
    if (totalRatio <= 0) {
      errors.push('Tổng tỉ lệ phối phải lớn hơn 0');
    }

    // Check for negative values
    const hasNegativeRatio = this.rows().some(r => (r.ratioCtrl.value ?? 0) < 0);
    if (hasNegativeRatio) {
      errors.push('Tỉ lệ phối không được âm');
    }

    const hasNegativeChem = this.rows().some(r => {
      return Array.from(r.chems.values()).some(ctrl => (ctrl.value ?? 0) < 0);
    });
    if (hasNegativeChem) {
      errors.push('Thành phần hóa học không được âm');
    }

    const hasNegativeMatKhiNung = this.rows().some(r => (r.matKhiNungCtrl.value ?? 0) < 0);
    if (hasNegativeMatKhiNung) {
      errors.push('Mất khi nung không được âm');
    }

    return errors;
  }

  // Computed signal để disable button submit
  isSubmitDisabled = computed(() => !this.isFormValid());

  ngOnInit(): void {
    // Nếu truyền neoOreId vào để set mặc định công thức neo
    const neoId = this.data?.neoOreId ?? null;
    if (neoId) this.formulaForm.controls.ID_QuangNeo.setValue(neoId);

    // Nếu edit công thức hoặc load ore có sẵn cho header, bạn có thể gọi API ở đây.
    // Ví dụ: nếu MAT_DIALOG_DATA có existingOreId => fill oreForm.
    if (this.data?.existingOreId) {
      this.svc
        .getOreHeader(this.data.existingOreId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((ore) => {
          if (!ore) return;
          this.oreForm.patchValue({
            MaQuang: ore.MaQuang,
            TenQuang: ore.TenQuang,
            Gia: ore.Gia ?? null,
            GhiChu: ore.GhiChu ?? '',
          });
        });
    }
  }
  // ====== Chọn thành phần hoá học (mở dialog phụ) ======

  openSelectChems() {
    const dlg = this.dialog.open(SelectTphhDialogComponent, {
      width: '840px',
      disableClose: true,
      data: { preselectedIds: this.selectedChems().map((x) => x.id) },
    });

    dlg.afterClosed().subscribe(async (list: ChemVm[] | undefined) => {
      if (!list) return;
      // đổi TPHH: chỉ cần sync lại rows theo oreChemMap hiện có.
      // Nếu bạn lo oreChemMap chưa đủ field, có thể gọi refetch luôn:
      // await this.syncSelections({ chems: list, refetch: true });
      await this.syncSelections({ chems: list });
    });
  }
  openSelectOres() {
    const dlg = this.dialog.open(SelectQuangDialogComponent, {
      width: '960px',
      disableClose: true,
      data: { preselectedIds: this.rows().map((r) => r.idQuang) },
    });

    dlg.afterClosed().subscribe(async (list: OreVm[] | undefined) => {
      if (!list?.length) return;
      await this.syncSelections({ ores: list, refetch: true }); // đổi quặng => refetch
    });
  }

  totalRatio(): number {
    return this.rows().reduce((s, r) => s + (r.ratioCtrl.value ?? 0), 0);
  }
  getChemCtrl(row: RatioRow, chemId: number): FormControl<number> {
    let ctrl = row.chems.get(chemId);
    if (!ctrl) {
      ctrl = new FormControl<number>(0, { nonNullable: true });
      row.chems.set(chemId, ctrl);
    }
    return ctrl;
  }

  private attachSignals(row: RatioRow) {
    if (!row.ratio$) {
      row.ratio$ = toSignal(
        row.ratioCtrl.valueChanges.pipe(startWith(row.ratioCtrl.value)),
        { initialValue: row.ratioCtrl.value, injector: this.injector }
      );
    }
    
    // Attach signal cho matKhiNung
    if (!row.matKhiNung$) {
      row.matKhiNung$ = toSignal(
        row.matKhiNungCtrl.valueChanges.pipe(startWith(row.matKhiNungCtrl.value)),
        { initialValue: row.matKhiNungCtrl.value, injector: this.injector }
      );
    }
    
    const newChem$ = new Map<number, Signal<number>>();
    const prevChem$ = row.chem$ ?? new Map<number, Signal<number>>();
    for (const [chemId, ctrl] of row.chems) {
      const reuse = prevChem$.get(chemId);
      newChem$.set(
        chemId,
        reuse ??
          toSignal(ctrl.valueChanges.pipe(startWith(ctrl.value)), {
            initialValue: ctrl.value,
            injector: this.injector,
          })
      );
    }
    row.chem$ = newChem$;
  }

  // remove 1 row (quặng)
  removeRow(row: RatioRow) {
    this.rows.set(this.rows().filter((r) => r !== row));
  }

  // remove 1 chem (cột)
  removeChem(chemId: number) {
    const chems = this.selectedChems().filter((c) => c.id !== chemId);
    this.selectedChems.set(chems);

    const map = new Map(this.constraints());
    map.delete(chemId);
    this.constraints.set(map);

    this.rows.set(
      this.rows().map((r) => {
        const m = new Map(r.chems);
        m.delete(chemId);
        return { ...r, chems: m };
      })
    );
  }

  // ====== Submit: build payload UpsertAndConfirmDto và gọi API 1 phát ======
  submit() {
    // Kiểm tra validation trước khi submit
    if (!this.isFormValid()) {
      this.oreForm.markAllAsTouched();
      this.formulaForm.markAllAsTouched();
      console.warn('Form validation failed:', this.getValidationErrors());
      return;
    }

    const chems = this.selectedChems();
    const rows = this.rows();

    // Build blocks
    const Formula: CongThucPhoiUpsertDto = {
      ID: this.formulaForm.value.ID ?? null,
      ID_QuangNeo: this.formulaForm.value.ID_QuangNeo ?? null,
      MaCongThuc: this.formulaForm.value.MaCongThuc!,
      TenCongThuc: this.formulaForm.value.TenCongThuc!,
      GhiChu: this.formulaForm.value.GhiChu ?? null,
      TongPhanTram: this.totalRatio(),
      QuangInputs: rows.map((r) => ({
        ID_Quang: r.idQuang,
        TiLePhoi: r.ratioCtrl.value ?? 0,
      })),
      RangBuocTPHHs: chems.map((c) => {
        const rb = this.constraints().get(c.id)!;
        return {
          ID_TPHH: c.id,
          Min_PhanTram: rb.minCtrl.value ?? null,
          Max_PhanTram: rb.maxCtrl.value ?? null,
        };
      }),
    };

    const OutputOre: QuangTron = {
      MaQuang: this.oreForm.value.MaQuang!,
      TenQuang: this.oreForm.value.TenQuang!,
      Gia: this.oreForm.value.Gia ?? null,
      GhiChu: this.oreForm.value.GhiChu ?? null,
      MatKhiNung: this.resultMatKhiNung(), // mất khi nung đã tính toán
    };

    const FinalComponents: OreChemItemDto[] = this.selectedChems().map((c) => ({
      ID_TPHH: c.id,
      PhanTram: this.resultRow()[c.id] ?? 0,
    }));

    const payload: UpsertAndConfirmDto = {
      CongThucPhoi: Formula,
      Quang: OutputOre,
      KetQuaTPHHtItems: FinalComponents,
    };

    this.congThucPhoiService
      .upsertAndConfirm(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.dlgRef.close(res);
          this.snack.open('Thêm công thức phối thành công', 'Đóng', { duration: 1500, panelClass: ['snack-success']  });
        },
        error: (e) => console.error(e),
      });
  }

  cancel() {
    this.dlgRef.close();
  }
  trackChem = (_: number, c: { id: number }) => c.id;

  private buildOreChemMap(
    batch: QuangDetailResponse[]
  ): Map<number, Map<number, number>> {
    const map = new Map<number, Map<number, number>>();
    for (const item of batch) {
      const inner = new Map<number, number>();
      // LƯU Ý: tên field phải đúng JSON bạn trả (tp_HoaHocs / TP_HoaHocs)
      const list = (item as any).tP_HoaHocs ?? (item as any).tP_HoaHocs ?? [];
      for (const t of list)
        inner.set(t.id ?? t.ID, Number(t.phanTram ?? t.PhanTram ?? 0));
      map.set(item.quang.id ?? item.quang.id, inner);
    }
    return map;
  }

  private syncConstraints(chems: ChemVm[]) {
    const map = new Map(this.constraints()); // constraints(): Map<number, {minCtrl,maxCtrl}>
    for (const c of chems) {
      if (!map.has(c.id)) {
        map.set(c.id, {
          minCtrl: new FormControl<number | null>(null),
          maxCtrl: new FormControl<number | null>(null),
        });
      }
    }
    for (const id of Array.from(map.keys())) {
      if (!chems.some((x) => x.id === id)) map.delete(id);
    }
    this.constraints.set(map);
  }

  async syncSelections(
    opts: {
      ores?: OreVm[];
      chems?: ChemVm[];
      refetch?: boolean; // true nếu vừa đổi danh sách quặng (cần refetch)
    } = {}
  ) {
    if (opts.chems) {
      this.selectedChems.set(opts.chems);
      this.syncConstraints(opts.chems);
    }
    if (opts.ores) this.selectedOres.set(opts.ores);

    const chems = this.selectedChems();
    const ores = this.selectedOres();

    if (!ores.length) {
      this.rows.set([]);
      return;
    }

    // cần dữ liệu hóa học cho các quặng đang chọn
    if (opts.refetch || this.oreChemMap().size === 0) {
      const ids = ores.map((o) => o.id);
      const batch = await firstValueFrom(
        this.quangService.getOreChemistryBatch(ids)
      );
      this.oreChemMap.set(this.buildOreChemMap(batch));
    }
    const chemMap = this.oreChemMap();

    // giữ control cũ
    const prev = this.rows();
    const prevByOre = new Map(prev.map((r) => [r.idQuang, r]));

    const nextRows: RatioRow[] = ores.map((o) => {
      const prevRow = prevByOre.get(o.id);
      const ratioCtrl =
        prevRow?.ratioCtrl ??
        new FormControl<number>(prevRow?.ratioCtrl.value ?? 0, {
          nonNullable: true,
        });

      const chemsMap = new Map<number, FormControl<number>>();
      for (const c of chems) {
        const oldCtrl = prevRow?.chems.get(c.id);
        if (oldCtrl) {
          chemsMap.set(c.id, oldCtrl);
        } else {
          const defVal = chemMap.get(o.id)?.get(c.id) ?? 0;
          chemsMap.set(
            c.id,
            new FormControl<number>(defVal, { nonNullable: true })
          );
        }
      }

      // Tạo matKhiNungCtrl
      const matKhiNungCtrl = prevRow?.matKhiNungCtrl ?? 
        new FormControl<number>(o.matKhiNung ?? 0, { nonNullable: true });

      const row: RatioRow = {
        idQuang: o.id,
        maQuang: o.maQuang,
        tenQuang: o.tenQuang,
        gia: o.gia ?? null,
        matKhiNung: o.matKhiNung ?? null,
        ratioCtrl,
        chems: chemsMap,
        matKhiNungCtrl,
        ratio$: prevRow?.ratio$,
        chem$: prevRow?.chem$,
        matKhiNung$: prevRow?.matKhiNung$,
      };
      this.attachSignals(row); // gắn signal cho control mới (hoặc giữ cái cũ)
      return row;
    });

    this.rows.set(nextRows);
  }
}
