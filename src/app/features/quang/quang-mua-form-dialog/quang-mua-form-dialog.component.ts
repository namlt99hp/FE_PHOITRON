import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Inject,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ChemicalOption,
  OreDialogData,
  OreMode,
  OreOption,
  OreUpsertDto,
  QuangMuaData,
} from '../../../core/models/ore-dialog.model';
import {
  ChemVm,
  SelectTphhDialogComponent,
} from '../../mix-quang-dialog/select-tphh-dialog/select-tphh-dialog.component';
import { QuangService } from '../../../core/services/quang.service';
import {
  QuangDto,
  ThanhPhanQuangDto,
  UpsertQuangDto,
} from '../../../core/models/quang.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './quang-mua-form-dialog.component.html',
  styleUrl: './quang-mua-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuangMuaFormDialogComponent {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private quangService = inject(QuangService);
  private snack = inject(MatSnackBar);
  // lưu giá trị gần nhất theo chemId, kể cả khi bị bỏ chọn
  private lastValues = new Map<number, number | null>();

  mode: OreMode;
  chemicals: ChemicalOption[];
  sourceOres: OreOption[];
  tp_HoaHocs = signal<Map<number, { phanTram: FormControl<number | null> }>>(
    new Map()
  );

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: QuangMuaData,
    private ref: MatDialogRef<QuangMuaFormDialogComponent, OreUpsertDto | null>
  ) {
    this.mode = this.data.mode;
  }

  // ====== common header form ======

  headerForm = this.fb.group({
    maQuang: ['', [Validators.required, Validators.maxLength(50)]],
    tenQuang: ['', [Validators.required, Validators.maxLength(200)]],
    gia: [null as number | null, [Validators.min(0)]],
    matKhiNung: [null as number | null, [Validators.required]],
    ghiChu: ['' as string | null],
  });

  // ====== MUA (chemicals là CỘT) ======
  selectedChems = signal<ChemVm[]>([]);
  muaGroup: FormGroup = this.fb.group({}); // key = chem.code, value = %
  muaDisplayedColumns = computed(() => [
    '__label',
    ...this.selectedChems().map((c) => c.ma_TPHH),
  ]);

  muaChemCtrl = new FormControl<number | null>(null);
  muaPercentCtrl = new FormControl<number | null>(null, {
    validators: [Validators.min(0), Validators.max(100)],
  });

  totalMuaPercent = computed(() => {
    return this.selectedChems().reduce((sum, c) => {
      const v = Number(this.muaGroup.get(c.ma_TPHH)?.value ?? 0);
      return sum + (isFinite(v) ? v : 0);
    }, 0);
  });

  // get canSubmitMua() {
  //   return (
  //     this.headerForm.valid &&
  //     this.selectedChems().length > 0 &&
  //     this.selectedChems().every((c) => this.muaGroup.get(c.ma_TPHH)?.valid) &&
  //     this.totalMuaPercent() === 100
  //   );
  // }

  openSelectChems() {
    const dlg = this.dialog.open(SelectTphhDialogComponent, {
      width: '840px',
      disableClose: true,
      data: { preselectedIds: this.selectedChems().map((x) => x.id) },
    });

    dlg.afterClosed().subscribe(async (list: ChemVm[] | undefined) => {
      if (!list) return;
      this.selectedChems.set(list);
      this.syncThanhPhan(list);
    });
  }

  removeChem(chemId: number) {
    const chems = this.selectedChems().filter((c) => c.id !== chemId);
    this.selectedChems.set(chems);
  }

  // ====== submit -> map ra DTO ======
  buildPayload(): UpsertQuangDto {
    const idQuang = this.data.quang?.id || null;

    const header = this.headerForm.getRawValue();
    const quangPayload: QuangDto = {
      maQuang: header.maQuang!,
      tenQuang: header.tenQuang!,
      gia: header.gia ?? null,
      matKhiNung: header.matKhiNung,
      ghiChu: header.ghiChu ?? null,
    };

    const items: ThanhPhanQuangDto[] = [];

    for (const [chemId, { phanTram }] of this.tp_HoaHocs().entries()) {
      const v = phanTram.value;
      if (v === null || isNaN(v)) continue; // bỏ qua ô trống/không hợp lệ
      if (v < 0) continue; // tuỳ yêu cầu, có thể throw lỗi
      items.push({ iD_TPHH: chemId, phanTram: +v.toFixed(2) }); // làm tròn 2 số thập phân
    }

    return { id: idQuang, quang: quangPayload, thanhPhan: items };
  }

  onSave() {
    const payload = this.buildPayload();
    this.quangService.upsertQuang(payload).subscribe((res) => {
      if(res){
        if(this.data.mode === 'MUA'){
          this.snack.open('Thêm quặng mua thành công', 'Đóng', { duration: 1500, panelClass: ['snack-success']  });
        } else {
          this.snack.open('Sửa quặng thành công', 'Đóng', { duration: 1500, panelClass: ['snack-info']  });
        }
        this.ref.close(res);
      }
    });
    this.headerForm.reset();
  }

  onCancel() {
    this.ref.close(null);
  }

  // ====== patch initial (edit) ======
  ngOnInit(): void {
    if (this.data.quang) {
      this.quangService.getDetail(this.data.quang.id).subscribe((res) => {
        this.PatchFormValue(res);
      });
    }
  }

  PatchFormValue(data: any) {
    this.headerForm.patchValue({
      maQuang: (data.quang as any).maQuang ?? '',
      tenQuang: (data.quang as any).tenQuang ?? '',
      gia: (data.quang as any).gia ?? null,
      matKhiNung: (data.quang as any).matKhiNung ?? null,
      ghiChu: (data.quang as any).ghiChu ?? '',
    });

    this.selectedChems.set(data.tP_HoaHocs);
    const chems = data.tP_HoaHocs ?? [];
    this.selectedChems.set(chems);

    const seed = new Map<number, number | null>();
    for (const c of chems) {
      if (typeof c.phanTram !== 'undefined') seed.set(c.id, c.phanTram);
    }
    this.syncThanhPhan(chems, seed);
  }

  // Gọi hàm này sau khi bạn cập nhật selectedChems()
  syncThanhPhan(list: { id: number }[], seed?: Map<number, number | null>) {
    const current = this.tp_HoaHocs();
    const next = new Map(current);
    const selectedIds = new Set(list.map((x) => x.id));

    // Thêm control mới
    for (const c of list) {
      if (!next.has(c.id)) {
        const init = this.lastValues.has(c.id)
          ? this.lastValues.get(c.id)!
          : seed?.get(c.id) ?? null;

        const ctrl = new FormControl<number | null>(init);
        ctrl.valueChanges.subscribe((v) => this.lastValues.set(c.id, v));
        next.set(c.id, { phanTram: ctrl });
      }
    }

    // Xóa control thừa → lưu cache
    for (const [id, { phanTram }] of Array.from(next.entries())) {
      if (!selectedIds.has(id)) {
        this.lastValues.set(id, phanTram.value);
        next.delete(id);
      }
    }

    // Đồng bộ cache cho control đang tồn tại
    for (const [id, { phanTram }] of next) {
      if (!this.lastValues.has(id)) this.lastValues.set(id, phanTram.value);
    }

    this.tp_HoaHocs.set(next);
  }
  trackByChem = (_: number, c: { id: number }) => c.id;
}
