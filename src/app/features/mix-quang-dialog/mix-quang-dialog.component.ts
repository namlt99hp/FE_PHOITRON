import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  Input,
  OnInit,
  Signal,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import {
  CongThucPhoiUpsertDto,
  OreChemItemDto,
  QuangTron,
  UpsertAndConfirmDto,
} from '../../core/models/congthucphoi.model';
import {
  ChemVm,
  SelectTphhDialogComponent,
} from './select-tphh-dialog/select-tphh-dialog.component';
import {
  OreVm,
  SelectQuangDialogComponent,
} from './select-quang-dialog/select-quang-dialog.component';
import { CongThucPhoiService } from '../../core/services/congthucphoi.service';
import { PhuongAnPhoiService } from '../../core/services/phuong-an-phoi.service';
import { QuangService } from '../../core/services/quang.service';
import { firstValueFrom, startWith } from 'rxjs';
import { QuangDetailResponse } from '../../core/models/quang.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MilestoneEnum } from '../../core/enums/milestone.enum';
import { RateService } from '../../core/services/rate.service';
import { MixQuangLoCaoSectionComponent } from './locao-section/locao-section.component';
import { LoCaoProcessParamService } from '../../core/services/locao-process-param.service';
import { LocaoResultComponent, GangComposition, XaComposition, LocaoStatistics } from './locao-result/locao-result.component';
import { FormulaService } from '../../core/services/formula.service';
import { HideZeroInputDirective } from '../../core/directives/hide-zero-input.directive';
import { ThongKeFunctionService } from '../../core/services/thongke-function.service';
import { ORE_TYPE_CODES } from '../../core/constants/ore-type-codes.constant';
import { MixRowData, ProcessParamData } from '../../core/models/mix-row-data.model';
import { LINE_TYPE_CHIPHI } from '../../core/constants/line-type-chiphi.constant';

type RatioRow = {
  idQuang: number;
  maQuang: string;
  tenQuang: string;
  loaiQuang?: number; // Loại quặng: 1=Mua, 2=Tron, 3=Khac
  gia?: number | null;
  giaUSD?: number | null;
  tyGia?: number | null;
  giaVND?: number | null;
  ngayTyGia?: string | null;
  ratioCtrl: FormControl<number>; // tỉ lệ phối
  ratio$?: Signal<number>;
  // thành phần hoá học có thể SỬA TAY tại ô của từng quặng
  chems: Map<number, FormControl<number>>; // key: chemId, value: %
  chem$?: Map<number, Signal<number>>;

  // ==== Milestone-specific FormControls ====
  // Lò Cao milestone
  klVaoLoCtrl: FormControl<number | null>; // KL vào lò
  klVaoLo$?: Signal<number | null>; // Signal for KL vào lò
  tyLeHoiQuangCtrl: FormControl<number | null>; // Tỷ lệ hồi quặng
  tyLeHoiQuang$?: Signal<number | null>; // Signal for Tỷ lệ hồi quặng
  klNhanCtrl: FormControl<number | null>; // KL nhận
  klNhan$?: Signal<number | null>; // Signal for KL nhận

  // Thiêu Kết milestone  
  khauHaoCtrl: FormControl<number | null>; // Khấu hao
  khauHao$?: Signal<number | null>; // Signal for Khấu hao
  percentageCtrl: FormControl<number | null>; // Phần trăm
  percentage$?: Signal<number | null>; // Signal for Phần trăm
};

// Product totals model for LocaoResult input
export interface ProductTotal {
  id: number;
  code: string;
  mass: number;
  percentage?: number | null;
}

@Component({
  selector: 'app-mix-quang-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MixQuangLoCaoSectionComponent,
    LocaoResultComponent,
    HideZeroInputDirective
  ],
  templateUrl: './mix-quang-dialog.component.html',
  styleUrl: './mix-quang-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideNativeDateAdapter()],
})
export class MixQuangDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dlgRef = inject(MatDialogRef<MixQuangDialogComponent>);
  private dialog = inject(MatDialog);
  private quangService = inject(QuangService);
  private congThucPhoiService = inject(CongThucPhoiService);
  private paService = inject(PhuongAnPhoiService);
  private destroyRef = inject(DestroyRef);
  private snack = inject(MatSnackBar);
  private locaoParamService = inject(LoCaoProcessParamService);
  private cdr = inject(ChangeDetectorRef);
  private formulaService = inject(FormulaService);
  private thongKeService = inject(ThongKeFunctionService);


  data = inject<{ neoOreId?: number; existingOreId?: number; formulaId?: number; gangId?: number; maGang?: string; milestone?: MilestoneEnum; planId?: number; planName?: string; planNgayTao?: string; congThucPhoiId?: number; outputLoaiQuang?: number; defaultChems?: ChemVm[] } | null>(
    MAT_DIALOG_DATA,
    { optional: true }
  );
  private readonly injector = inject(Injector);

  @ViewChild(MixQuangLoCaoSectionComponent) locaoSection!: MixQuangLoCaoSectionComponent;
  @ViewChild(LocaoResultComponent) locaoResult!: LocaoResultComponent;

  // Hiển thị tên gang đích và phương án
  gangName = signal<string>('');
  planName = signal<string>('');
  today = signal<Date>(new Date());
  milestone = signal<MilestoneEnum>(MilestoneEnum.Standard);

  // Label for output ore type (e.g., Vê viên)
  get outputLoaiQuangLabel(): string {
    const t = this.data?.outputLoaiQuang ?? 1;
    if (t === 6) return 'Quặng vê viên';
    if (t === 1) return 'Quặng phối';
    if (t === 2) return 'Gang';
    if (t === 3) return 'Quặng phụ liệu (Coke, than phun...)';
    if (t === 4) return 'Xỉ';
    if (t === 5) return 'Quặng cỡ';
    return `Loại quặng phối`;
  }

  // Expose enum to template
  readonly MilestoneEnum = MilestoneEnum;
  // ==== Header forms ====
  oreForm = this.fb.group({
    MaQuang: ['', Validators.required],
    TenQuang: ['', Validators.required],
    NgayTao: [new Date().toISOString().split('T')[0], Validators.required],
    GhiChu: [''],
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
  
  // Filter MKN khi milestone là Lò Cao
  displayedChems = computed(() => {
    const chems = this.selectedChems();
    if (this.milestone() === MilestoneEnum.LoCao) {
      return chems.filter(c => (c.ma_TPHH ?? '').toUpperCase() !== 'MKN');
    }
    return chems;
  });
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

  // ==== Lò cao specific controls ====
  // Map<oreId, {klVaoLo: FormControl, tyLeHoiQuang: FormControl}>
  locaoControls = signal(new Map<number, { klVaoLo: FormControl<number | null>, tyLeHoiQuang: FormControl<number | null> }>());
  updateTrigger = signal(0);


  // ==== Bảng động: cột = ['__ore','__ratio', ...chemIds...,'__actionsRow'] ==== (ẩn cột MKN)
  displayedColumns = computed(() => {
    // ore info + ratio + each chem + actions (không render cột MKN riêng)
    const chemCols = this.selectedChems().map((c) => `chem_${c.id}`);
    return ['__ore', '__ratio', ...chemCols, '__rowActions'];
  });
  // ==== Hàng kết quả (tính theo weights) ====
  resultRow = computed(() => {
    const chems = this.selectedChems();
    const rows = this.rows();

    // chỗ val này tôi 
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

  // kiểm tra out-of-range để highlight cho ô kết quả
  isOutOfRange(chemId: number): boolean {
    const rb = this.constraints().get(chemId);
    const min = rb?.minCtrl.value ?? null;
    const max = rb?.maxCtrl.value ?? null;

    // Không có constraints thì không highlight
    if (min == null && max == null) return false;

    let res: number;

    switch (this.milestone()) {
      case MilestoneEnum.LoCao:
        // Lò Cao: sử dụng SUMPRODUCT calculation
        res = this.getChemTotalBySumProduct(chemId);
        break;

      case MilestoneEnum.ThieuKet:
        // Thiêu kết: sử dụng Row2 value (final result)
        res = this.getThieuKetRow2Value(chemId);
        break;

      default:
        // Standard: sử dụng weighted average
        res = this.resultRow()[chemId] ?? 0;
        break;
    }

    if (min != null && res < min) return true;
    if (max != null && res > max) return true;
    return false;
  }


  // ==== VALIDATION ====

  // Kiểm tra validation tổng thể
  isFormValid(): boolean {
    // 1. Kiểm tra form cơ bản (chỉ oreForm)
    if (this.oreForm.invalid) {
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
    const hasNegativeRatio = this.rows().some(
      (r) => (r.ratioCtrl.value ?? 0) < 0
    );
    if (hasNegativeRatio) {
      return false;
    }


    return true;
  }

  // Kiểm tra có lỗi validation để hiển thị warning
  getValidationErrors(): string[] {
    const errors: string[] = [];

    // Form validation errors
    if (this.oreForm.invalid) {
      if (this.oreForm.controls.MaQuang.invalid)
        errors.push('Mã quặng là bắt buộc');
      if (this.oreForm.controls.TenQuang.invalid)
        errors.push('Tên quặng là bắt buộc');
      if (this.oreForm.controls.NgayTao.invalid)
        errors.push('Ngày tạo quặng là bắt buộc');
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
    const hasNegativeRatio = this.rows().some(
      (r) => (r.ratioCtrl.value ?? 0) < 0
    );
    if (hasNegativeRatio) {
      errors.push('Tỉ lệ phối không được âm');
    }


    return errors;
  }

  // FormControls cho mã và tên công thức tự động
  maCongThucCtrl = new FormControl<string>('');
  tenCongThucCtrl = new FormControl<string>('');

  // Computed signal để disable button submit
  get isSubmitDisabled(): boolean {
    return !this.isFormValid();
  }

  // Map để lưu BangChiPhi từ backend cho quặng loại 7: key = ID_Quang (quặng loại 7), value = Array<BangChiPhiItem>
  private _bangChiPhiByLoai7: Map<number, Array<{ iD_CongThucPhoi: number; iD_Quang: number | null; lineType: string; tieuhao: number | null; donGiaVND: number | null; donGiaUSD: number; }>> = new Map();

  ngOnInit(): void {
    // Khởi tạo _formulaByOutputOre để tránh undefined
    (this as any)._formulaByOutputOre = new Map<number, any[]>();

    // Lấy tên phương án (nếu được truyền qua) và mã gang
    this.planName.set(this.data?.planName ?? (`PA-${this.data?.planId ?? ''}`));
    this.gangName.set(this.data?.maGang ?? '');
    // Nếu truyền neoOreId vào để set mặc định công thức neo

    this.milestone.set(this.data?.milestone ?? MilestoneEnum.Standard);
    this.applyDefaultChemsFromData();
    const neoId = this.data?.neoOreId ?? null;
    if (neoId) this.formulaForm.controls.ID_QuangNeo.setValue(neoId);
    // Nếu có congThucPhoiId -> load chi tiết công thức phối để edit
    if (this.data?.congThucPhoiId) {
      this.paService.getDetailMinimal(this.data.congThucPhoiId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res) => {
        if (res?.success && res.data) {
          const d = res.data;

          // Fill formula header (for generated codes + ghi chú)
          this.formulaForm.patchValue({
            ID: d.congThuc?.id ?? null,
            MaCongThuc: d.congThuc?.ma ?? '',
            TenCongThuc: d.congThuc?.ten ?? '',
            GhiChu: d.congThuc?.ghiChu ?? '',
          });

          // Fill oreForm với thông tin quặng đầu ra
          this.oreForm.patchValue({
            MaQuang: d.quangDauRa?.ma_Quang ?? '',
            TenQuang: d.quangDauRa?.ten_Quang ?? '',
            NgayTao: new Date().toISOString().split('T')[0],
            GhiChu: d.congThuc?.ghiChu ?? '',
          });

          // Ràng buộc TPHH dùng cho header cột
          const rbHeaders = (d.rangBuocTPHH ?? []).map((r: any) => ({ id: r.iD_TPHH ?? r.id_TPHH ?? r.id, ma_TPHH: r.ma_TPHH, ten_TPHH: r.ten_TPHH }));
          this.selectedChems.set(rbHeaders);
          // Sync constraints từ ràng buộc
          const consMap = new Map<number, { minCtrl: FormControl<number | null>; maxCtrl: FormControl<number | null> }>();
          for (const r of (d.rangBuocTPHH ?? [])) {
            const id = (r as any).iD_TPHH ?? r.id_TPHH; // Fallback cho cả hai field
            consMap.set(id, {
              minCtrl: new FormControl<number | null>(r.min_PhanTram ?? null),
              maxCtrl: new FormControl<number | null>(r.max_PhanTram ?? null),
            });
          }
          this.constraints.set(consMap);
          // Build ores (input) từ chi tiết
          const ores = (d.chiTietQuang ?? []).map((x: any) => ({
            id: x.iD_Quang ?? x.id_Quang, // Fallback cho cả hai field
            maQuang: x.ten_Quang ?? '', // Dùng ten_Quang làm maQuang vì không có ma_Quang
            tenQuang: x.ten_Quang ?? '',
            tiLePhoi: x.ti_Le_Phan_Tram ?? 0, // Response có field này
            loaiQuang: x.loai_Quang ?? 0,
            giaUSD: x.gia_USD_1Tan ?? null,
            tyGia: x.ty_Gia_USD_VND ?? null,
            giaVND: x.gia_VND_1Tan ?? null,
            // milestone-specific fields
            khauHao: x.khau_Hao ?? null,
            tiLeKhaoHao: x.ti_Le_KhaoHao ?? null,
            klVaoLo: x.kL_VaoLo ?? null,
            tyLeHoiQuang: x.ti_Le_HoiQuang ?? null,
            klNhan: x.kL_Nhan ?? null,
          }));

          // Build oreChemMap từ dữ liệu đã lưu (không refetch)
          const oreChemMap = new Map<number, Map<number, number>>();

          // Tạo map từ oreId trong ores để đảm bảo consistency
          const oreIdMap = new Map(ores.map(o => [o.id, o]));

          for (const ctq of d.chiTietQuang ?? []) {
            // Fallback cho cả hai field
            const oreId = (ctq as any).iD_Quang ?? ctq.id_Quang;

            // Chỉ process nếu oreId tồn tại trong ores array
            if (!oreIdMap.has(oreId)) {
              continue;
            }

            const chemMap = new Map<number, number>();

            // Lấy thành phần hóa học từ dữ liệu đã lưu
            for (const tphh of ctq.tP_HoaHocs ?? []) {
              const chemId = tphh.id;
              const phanTram = Number(tphh.phanTram);
              chemMap.set(chemId, phanTram);
            }
            oreChemMap.set(oreId, chemMap);
          }
          this.oreChemMap.set(oreChemMap);

          // Dùng syncSelections để dựng cột/row/controls với dữ liệu đã lưu (không refetch)
          this.syncSelections({ ores, chems: rbHeaders, refetch: false });

          // Set milestone from backend data if available
          if (d.milestone !== undefined && d.milestone !== null) {
            this.milestone.set(d.milestone);
          }

          // Load BangChiPhi data
          if (d.bangChiPhi?.length) {
            // Reset map cho quặng loại 7
            this._bangChiPhiByLoai7.clear();
            
            // Tìm tất cả quặng loại 7 trong chiTietQuang
            const loai7OreIds = new Set<number>();
            for (const ctq of (d.chiTietQuang ?? [])) {
              const loaiQuang = (ctq as any).loai_Quang ?? ctq.loai_Quang;
              if (loaiQuang === 7) {
                const id = (ctq as any).iD_Quang ?? ctq.id_Quang;
                if (id) {
                  loai7OreIds.add(id);
                }
              }
            }
            
            for (const item of d.bangChiPhi) {
              // Load các dòng không có iD_Quang (chi phí khác)
              if (item.iD_Quang === null) {
                if (item.lineType === LINE_TYPE_CHIPHI.CHI_PHI_KHAC && d.milestone === MilestoneEnum.ThieuKet) {
                  this.otherCost = item.donGiaVND || 0;
                } else if (item.lineType === LINE_TYPE_CHIPHI.CHI_PHI_SX_GANG_LONG && d.milestone === MilestoneEnum.LoCao) {
                  this.otherCostLoCao = item.donGiaVND || 0;
                } else if (item.lineType === LINE_TYPE_CHIPHI.QUANG_HOI && d.milestone === MilestoneEnum.LoCao) {
                  this.recycleCostVnd = item.donGiaVND || 0;
                }
              } else if (d.milestone === MilestoneEnum.ThieuKet && item.iD_Quang) {
                // Nếu milestone = Thiêu kết và có iD_Quang
                // Nếu quặng này không phải là quặng loại 7, thì nó là quặng thành phần của một quặng loại 7 nào đó
                // Sử dụng iD_Quang_DauRa từ backend để map vào quặng loại 7
                if (!loai7OreIds.has(item.iD_Quang) && item.iD_Quang_DauRa) {
                  // Đây là quặng thành phần, map vào quặng loại 7 từ iD_Quang_DauRa
                  const loai7Id = item.iD_Quang_DauRa;
                  if (loai7OreIds.has(loai7Id)) {
                    if (!this._bangChiPhiByLoai7.has(loai7Id)) {
                      this._bangChiPhiByLoai7.set(loai7Id, []);
                    }
                    this._bangChiPhiByLoai7.get(loai7Id)!.push(item);
                  }
                }
              }
            }
          }

          // Trigger change detection to update cost table with loaded BangChiPhi data
          this.cdr.markForCheck();

          // Apply milestone-specific values into row controls
          queueMicrotask(() => {
            const currentRows = this.rows();
            const mapById = new Map(ores.map(o => [o.id, o]));
            for (const row of currentRows) {
              const src = mapById.get(row.idQuang);
              if (!src) continue;
              if (this.milestone() === MilestoneEnum.ThieuKet) {
                // Set null nếu giá trị là null, undefined, hoặc 0 (không nhập gì)
                row.khauHaoCtrl?.setValue((src.khauHao != null && src.khauHao > 0) ? src.khauHao : null, { emitEvent: false });
                row.percentageCtrl?.setValue((src.tiLeKhaoHao != null && src.tiLeKhaoHao > 0) ? src.tiLeKhaoHao : null, { emitEvent: false });
              } else if (this.milestone() === MilestoneEnum.LoCao) {
                // Set null nếu giá trị là null, undefined, hoặc 0 (không nhập gì)
                row.klVaoLoCtrl?.setValue((src.klVaoLo != null && src.klVaoLo > 0) ? src.klVaoLo : null, { emitEvent: false });
                // Khi edit: giữ nguyên giá trị từ backend (kể cả 0), chỉ set null nếu thực sự là null/undefined
                // Giá trị sẽ được set default trong initializeLocaoControls() nếu là null
                row.tyLeHoiQuangCtrl?.setValue(src.tyLeHoiQuang != null ? src.tyLeHoiQuang : null, { emitEvent: false });
                row.klNhanCtrl?.setValue((src.klNhan != null && src.klNhan > 0) ? src.klNhan : null, { emitEvent: false });
              }
            }
            this.rows.set([...currentRows]);

            // Update loai7 ratio after loading data
            queueMicrotask(() => {
              this.setupAutoRatioForLoai7();
            });

            // Trigger change detection to update cost table with loaded BangChiPhi data
            this.cdr.markForCheck();
          });

          // Sau khi đồng bộ selections và dựng UI, yêu cầu locao-section phát emit lần đầu (nếu có)
          queueMicrotask(() => {
            if (this.locaoSection && (this.locaoSection as any).getCurrentEmitList) {
              const list = (this.locaoSection as any).getCurrentEmitList();
              if (Array.isArray(list) && list.length) {
                this.onProcessParamsChange(list);
              }
            }
          });

          // Nếu milestone Thiêu Kết: tải công thức của các quặng loại 1 và loại 7 (quặng phối) từ dữ liệu edit
          if (this.milestone() === MilestoneEnum.ThieuKet) {
            const outputOreIds = ores.filter((o: any) => o.loaiQuang === 1 || o.loaiQuang === 7).map((o: any) => o.id);
            if (outputOreIds.length > 0) {
              this.quangService.getFormulasByOutputOreIds(outputOreIds).subscribe((responses) => {
                // Lưu tạm vào map để bảng chi phí có thể render khi cần
                const dict = new Map<number, any[]>();
                for (const r of responses) dict.set(r.outputOreId, r.items);
                (this as any)._formulaByOutputOre = dict;
              });
            } else {
              // Không có quặng loại 1 hoặc 7, khởi tạo empty map
              (this as any)._formulaByOutputOre = new Map<number, any[]>();
            }
          }
        }
      });
    }

    // Subscribe to form changes để update mã/tên công thức real-time
    // Chỉ subscribe TenQuang vì MaQuang sẽ tự động generate từ TenQuang
    this.oreForm.controls.TenQuang.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        startWith(this.oreForm.controls.TenQuang.value) // Trigger ngay lập tức với giá trị hiện tại
      )
      .subscribe(() => {
        this.updateGeneratedFormulas();
      });
  }

  private applyDefaultChemsFromData(): void {
    if (this.data?.congThucPhoiId) {
      return; // Đang edit -> dữ liệu sẽ được load từ API
    }
    const defaultChems = this.data?.defaultChems ?? [];
    if (!defaultChems.length) {
      return;
    }
    const shouldHideMkn = this.milestone() === MilestoneEnum.LoCao;
    const filtered = defaultChems.filter(c => {
      const code = (c.ma_TPHH ?? '').toUpperCase();
      return !shouldHideMkn || code !== 'MKN';
    });
    if (!filtered.length) {
      return;
    }
    this.selectedChems.set(filtered);
    this.syncConstraints(filtered);
  }


  // Helper: Convert string to slug (lowercase, replace spaces and special chars with hyphens)
  private toSlug(input: string | null | undefined): string {
    if (!input) return '';
    
    // Remove Vietnamese accents and convert to lowercase
    const normalized = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Replace spaces and special chars with hyphens
    const slug = normalized
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug;
  }

  // Method để update generated formulas real-time
  private updateGeneratedFormulas() {
    const tenQuang = this.oreForm.controls.TenQuang.value;
    // Chỉ thêm plan-gang khi outputLoaiQuang = 7 (loại quặng phối trong phương án)
    const isLoai7 = this.data?.outputLoaiQuang === 7;
    const planName = isLoai7 ? this.planName() : '';
    const gangName = isLoai7 ? (this.gangName() || this.data?.maGang || '') : '';

    // Auto-generate MaQuang from TenQuang (chỉ khi tạo mới, không phải edit)
    // Khi edit (có congThucPhoiId), giữ nguyên MaQuang đã có
    if (!this.data?.congThucPhoiId) {
      if (tenQuang) {
        const tenQuangSlug = this.toSlug(tenQuang);
        
        // Chỉ thêm plan-gang khi outputLoaiQuang = 7
        if (isLoai7 && planName && gangName) {
          const planSlug = this.toSlug(planName);
          const gangSlug = this.toSlug(gangName);
          const maQuang = `${tenQuangSlug}-${planSlug}-${gangSlug}`;
          this.oreForm.controls.MaQuang.setValue(maQuang, { emitEvent: false });
        } else {
          // Không phải loại 7: chỉ dùng tên quặng
          this.oreForm.controls.MaQuang.setValue(tenQuangSlug, { emitEvent: false });
        }
      } else {
        // Clear khi không có tên quặng
        this.oreForm.controls.MaQuang.setValue('', { emitEvent: false });
      }
    }

    const maQuang = this.oreForm.controls.MaQuang.value;

    // Update mã công thức khi có mã quặng
    if (maQuang) {
      this.maCongThucCtrl.setValue(`CTP-${maQuang}-${this.formatDateForCode()}`);
    } else {
      this.maCongThucCtrl.setValue('');
    }

    // Update tên công thức khi có tên quặng
    if (tenQuang) {
      if (isLoai7 && planName) {
        // Loại 7 (phối trong phương án): thêm tên phương án
        this.tenCongThucCtrl.setValue(`CTP - ${planName} - ${tenQuang} - ${this.formatDateForCode()}`);
      } else {
        // Các loại khác: chỉ dùng tên quặng
        this.tenCongThucCtrl.setValue(`CTP - ${tenQuang} - ${this.formatDateForCode()}`);
      }
    } else {
      this.tenCongThucCtrl.setValue('');
    }
    // Trigger change detection để UI update
    this.cdr.detectChanges();
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

      // Map giá về rows hiện tại
      const map = new Map(list.map(o => [o.id, o] as const));
      const updated = this.rows().map(r => {
        const info = map.get(r.idQuang);
        if (!info) return r;
        return {
          ...r,
          giaUSD: info.giaUSD ?? r.giaUSD ?? null,
          tyGia: info.tyGia ?? r.tyGia ?? null,
          giaVND: info.giaVND ?? r.giaVND ?? null,
          ngayTyGia: info.ngayTyGia ?? r.ngayTyGia ?? null,
        } as RatioRow;
      });
      this.rows.set(updated);

      // Update loai7 ratio after rows update
      queueMicrotask(() => {
        this.setupAutoRatioForLoai7();
      });

      // Initialize Lò Cao controls after rows update
      if (this.milestone() === MilestoneEnum.LoCao) {
        this.initializeLocaoControls();
      }


      // Nếu milestone Thiêu Kết: tải công thức của các quặng loại 1 và loại 7 (quặng phối)
      if (this.milestone() === MilestoneEnum.ThieuKet) {
        const outputOreIds = list.filter(o => (o as any).loaiQuang === 1 || (o as any).loaiQuang === 7).map(o => o.id);
        if (outputOreIds.length > 0) {

          this.quangService.getFormulasByOutputOreIds(outputOreIds).subscribe((responses) => {
            // Lưu tạm vào map để bảng chi phí có thể render khi cần
            // key: outputOreId, value: items (quặng thành phần với giá và tỉ lệ)
            const dict = new Map<number, any[]>();
            for (const r of responses) dict.set(r.outputOreId, r.items);
            (this as any)._formulaByOutputOre = dict;
          });
        } else {
          // Không có quặng loại 1 hoặc 7, khởi tạo empty map
          (this as any)._formulaByOutputOre = new Map<number, any[]>();
        }
      }
    });
  }

  getCostTableItems(): Array<{ id: number, ten: string; consumption: number; unitVnd: number; unitUsd: number; isParent: boolean; parentId?: number; loaiQuang?: number; }> {
    const out: Array<{ id: number, ten: string; consumption: number; unitVnd: number; unitUsd: number; isParent: boolean; parentId?: number; loaiQuang?: number; }> = [];
    const formulaMap: Map<number, any[]> | undefined = (this as any)._formulaByOutputOre;

    // Add ore items
    for (const r of this.rows()) {
      // Lấy trực tiếp giá trị từ cột "Tiêu hao" ThieuKet (dùng getThieuKetKhauHaoPercentage)
      const baseCons = this.getThieuKetKhauHaoPercentage(r);

      const parts = formulaMap?.get(r.idQuang);

      // Nếu r là quặng phối (loại 1) và có công thức: liệt kê từng thành phần
      // LƯU Ý: chỉ áp dụng cho các quặng KHÔNG phải loại 7
      // Quặng loại 7 sẽ được xử lý ở nhánh riêng bên dưới
      if (parts?.length && r.loaiQuang !== 7) {
        for (const p of parts) {
          const safeTyGia = this.getSafeTyGia();
          // Đảm bảo tất cả giá trị là number
          const pGiaVND = typeof p.gia_VND_1Tan === 'number' ? p.gia_VND_1Tan : 0;
          const pGiaUSD = typeof p.gia_USD_1Tan === 'number' ? p.gia_USD_1Tan : 0;
          const pTyGia = typeof p.ty_Gia_USD_VND === 'number' ? p.ty_Gia_USD_VND : (typeof safeTyGia === 'number' ? safeTyGia : 0);
          const pUnitVnd = pGiaVND || (Number(pGiaUSD) * Number(pTyGia));
          const pUnitUsd = pGiaUSD || (Number(pGiaVND) / (Number(pTyGia) || 1));
          const pRatio = typeof p.ti_Le_PhanTram === 'number' ? p.ti_Le_PhanTram : 0;
          
          // Đảm bảo baseCons là number
          const numBaseCons = typeof baseCons === 'number' ? baseCons : 0;
          
          // Tính tiêu hao thành phần = tiêu hao quặng phối * (tỷ lệ thành phần / 100)
          const cons = Number(numBaseCons) * (Number(pRatio) / 100);
          // Đơn giá thành phần = giá thành của quặng thành phần (không nhân với tỷ lệ)
          const unitPriceVnd = Number(pUnitVnd || 0);
          const unitPriceUsd = Number(pUnitUsd || 0);
          out.push({
            id: p.id,
            ten: p.ten_Quang,
            consumption: Number(cons.toFixed(3)),
            unitVnd: Number(unitPriceVnd.toFixed(2)),
            unitUsd: Number(unitPriceUsd.toFixed(2)),
            isParent: false,
            parentId: r.idQuang,
            // Loại quặng của thành phần: lấy từ chính phần tử p (nếu có), không dùng loại của quặng phối
            loaiQuang: (p as any).loai_Quang ?? undefined
          });
        }
        // Thêm chính quặng phối để highlight
        out.push({
          id: r.idQuang,
          ten: r.tenQuang,
          consumption: Number(baseCons.toFixed(3)),
          unitVnd: this.getUnitPriceVND(r),
          unitUsd: this.getUnitPriceUSD(r),
          isParent: true,
          parentId: r.idQuang,
          loaiQuang: r.loaiQuang
        });
      } else if (r.loaiQuang === 7 && this.milestone() === MilestoneEnum.ThieuKet) {
        // Quặng loại 7 trong milestone Thiêu kết: tính tiêu hao từ tỷ lệ phối
        const componentItems = this._bangChiPhiByLoai7.get(r.idQuang) || [];
        const formulaParts = formulaMap?.get(r.idQuang) || [];
        
        // Tiêu hao của quặng loại 7 = getThieuKetKhauHaoPercentage (từ tỷ lệ phối trong công thức hiện tại)
        const loai7Consumption = baseCons;
        
        if (componentItems.length > 0 && formulaParts.length > 0) {
          // Tính tiêu hao và SUMPRODUCT cho các quặng thành phần
          let totalConsumption = 0;
          let sumProduct = 0;
          
          // Thêm các quặng thành phần từ BangChiPhi và công thức phối
          for (const item of componentItems) {
            if (item.iD_Quang && item.donGiaVND !== null) {
              // Tìm tỷ lệ thành phần từ công thức phối
              const part = formulaParts.find((p: any) => p.id === item.iD_Quang);
              const partRatio = part ? (typeof part.ti_Le_PhanTram === 'number' ? part.ti_Le_PhanTram : 0) : 0;
              
              // Tính tiêu hao thành phần = tiêu hao quặng loại 7 * (tỷ lệ thành phần / 100)
              const partConsumption = Number(loai7Consumption) * (Number(partRatio) / 100);
              totalConsumption += partConsumption;
              
              // Tính SUMPRODUCT
              sumProduct += partConsumption * Number(item.donGiaVND || 0);
              
              // Sử dụng tên quặng từ backend, nếu không có thì tìm từ rows()
              let tenQuang = (item as any).ten_Quang || '';
              if (!tenQuang && part) {
                tenQuang = part.ten_Quang || '';
              }
              if (!tenQuang) {
                const foundRow = this.rows().find(row => row.idQuang === item.iD_Quang);
                if (foundRow) {
                  tenQuang = foundRow.tenQuang;
                }
              }
              
              out.push({
                id: item.iD_Quang,
                ten: tenQuang,
                consumption: Number(partConsumption.toFixed(3)),
                unitVnd: Number(item.donGiaVND),
                unitUsd: Number(item.donGiaUSD),
                isParent: false,
                parentId: r.idQuang,
                loaiQuang: (item as any).loai_Quang ?? undefined
              });
            }
          }
          
          // Đơn giá quặng loại 7 = SUMPRODUCT / tổng tiêu hao
          const unitPriceVnd = totalConsumption > 0 ? sumProduct / totalConsumption : 0;
          const tyGia = this.getSafeTyGia();
          const unitPriceUsd = tyGia > 0 ? unitPriceVnd / tyGia : 0;
          
          // Thêm chính quặng loại 7 (tính từ các thành phần)
          out.push({
            id: r.idQuang,
            ten: r.tenQuang,
            consumption: Number(totalConsumption.toFixed(3)),
            unitVnd: Number(unitPriceVnd.toFixed(2)),
            unitUsd: Number(unitPriceUsd.toFixed(2)),
            isParent: true,
            parentId: r.idQuang,
            loaiQuang: r.loaiQuang
          });
        } else {
          // Không có BangChiPhi từ backend, tính như bình thường
          const ratio = r.ratioCtrl.value ?? 0;
          const numRatio = typeof ratio === 'number' ? (isNaN(ratio) ? 0 : ratio) : 
                          (typeof ratio === 'string' ? (parseFloat(ratio) || 0) : 0);
          const totalRatio = this.totalRatio();
          const numTotalRatio = typeof totalRatio === 'number' ? totalRatio : 0;
          const unitPriceVnd = numTotalRatio > 0 ? Number(this.getUnitPriceVND(r)) * (Number(numRatio) / Number(numTotalRatio)) : 0;
          const unitPriceUsd = numTotalRatio > 0 ? Number(this.getUnitPriceUSD(r)) * (Number(numRatio) / Number(numTotalRatio)) : 0;

          out.push({
            id: r.idQuang,
            ten: r.tenQuang,
            consumption: Number(baseCons.toFixed(3)),
            unitVnd: Number(unitPriceVnd.toFixed(2)),
            unitUsd: Number(unitPriceUsd.toFixed(2)),
            isParent: false,
            loaiQuang: r.loaiQuang
          });
        }
      } else {
        // Không có công thức -> chính nó, đơn giá = giá thành của quặng (không nhân với tỷ lệ)
        const unitPriceVnd = this.getUnitPriceVND(r);
        const unitPriceUsd = this.getUnitPriceUSD(r);

        out.push({
          id: r.idQuang,
          ten: r.tenQuang,
          consumption: Number(baseCons.toFixed(3)),
          unitVnd: Number(unitPriceVnd.toFixed(2)),
          unitUsd: Number(unitPriceUsd.toFixed(2)),
          isParent: false,
          loaiQuang: r.loaiQuang
        });
      }
    }
    
    const sortedOut = out.sort((a, b) => {
      // Nếu cả hai đều có parentId
      if (a.parentId && b.parentId) {
        // Nếu cùng parentId
        if (a.parentId === b.parentId) {
          // Quặng thành phần (isParent = false) đứng trước quặng phối (isParent = true)
          if (!a.isParent && b.isParent) return -1;
          if (a.isParent && !b.isParent) return 1;
          return 0;
        }
        // Nếu khác parentId, sắp xếp theo parentId
        return a.parentId - b.parentId;
      }
      
      // Nếu một trong hai có parentId
      if (a.parentId && !b.parentId) return -1; // Quặng có parentId đứng trước
      if (!a.parentId && b.parentId) return 1;  // Quặng không có parentId đứng sau
      
      // Nếu cả hai đều không có parentId, giữ nguyên thứ tự
      return 0;
    });
    
    return sortedOut;
  }

  totalRatio(): number {
    return this.rows().reduce((s, r) => {
      const value = r.ratioCtrl.value ?? 0;
      // Đảm bảo giá trị là number, không phải string
      const numValue = typeof value === 'number' ? (isNaN(value) ? 0 : value) : 
                      (typeof value === 'string' ? (parseFloat(value) || 0) : 0);
      const currentSum = typeof s === 'number' ? s : 0;
      return Number(currentSum) + Number(numValue);
    }, 0);
  }

  // ===== Bảng chi phí - tính toán tổng =====
  otherCost: number = 0;
  otherCostGangLong: number = 0;
  recycleCostVnd: number = 0; // Chi phí cho dòng QUẶNG HỒI (nếu cần nhập)

  getTotalConsumption(): number {
    return this.getCostTableItems().reduce((sum, item) => sum + (item.consumption || 0), 0);
  }

  getTotalAllCosts(): number {
    // Tổng chi phí = SUMPRODUCT(tiêu hao, đơn giá) + chi phí khác
    const sumProduct = this.getCostTableItems().reduce((sum, item) => {
      return sum + (Number(item.consumption || 0) * Number(item.unitVnd || 0));
    }, 0);
    return Number((sumProduct + (this.otherCost || 0)).toFixed(2));
  }

  getTotalAllCostsUSD(): number {
    // Tổng chi phí USD = SUMPRODUCT(tiêu hao, đơn giá USD) + chi phí khác USD
    const sumProduct = this.getCostTableItems().reduce((sum, item) => {
      return sum + (Number(item.consumption || 0) * Number(item.unitUsd || 0));
    }, 0);
    const tyGia = this.getSafeTyGia();
    const otherCostUSD = tyGia > 0 ? (this.otherCost || 0) / tyGia : 0;
    return Number((sumProduct + otherCostUSD).toFixed(2));
  }

  private getSafeTyGia(): number {
    // Ưu tiên tyGia từ bất kỳ dòng nào có giá trị hợp lệ
    for (const r of this.rows()) {
      const tg = r.tyGia;
      if (tg && tg > 0 && Number.isFinite(tg)) return tg;
    }
    // Fallback: 1 để tránh NaN/Infinity khi tạo mới
    return 1;
  }

  onOtherCostChange(): void {
    // Trigger change detection để cập nhật tổng
  }

  getConstraintCtrl(chemId: number, type: 'min' | 'max'): FormControl<number | null> {
    const constraint = this.constraints().get(chemId);
    if (!constraint) {
      // Tạo constraint mới nếu chưa có
      const newConstraint = {
        minCtrl: new FormControl<number | null>(null),
        maxCtrl: new FormControl<number | null>(null),
      };
      const map = new Map(this.constraints());
      map.set(chemId, newConstraint);
      this.constraints.set(map);
      return type === 'min' ? newConstraint.minCtrl : newConstraint.maxCtrl;
    }
    return type === 'min' ? constraint.minCtrl : constraint.maxCtrl;
  }

  getChemCtrl(row: RatioRow, chemId: number): FormControl<number> {
    let ctrl = row.chems.get(chemId);
    if (!ctrl) {
      // Fallback: lấy giá trị từ oreChemMap nếu có
      const defVal = this.oreChemMap().get(row.idQuang)?.get(chemId) ?? 0;
      ctrl = new FormControl<number>(defVal, { nonNullable: true });
      row.chems.set(chemId, ctrl);
    }
    return ctrl;
  }

  // ==== Lò cao specific methods ====
  getLocaoKlVaoLoCtrl(row: RatioRow): FormControl<number | null> {
    // FormControl is now always initialized in RatioRow creation
    return row.klVaoLoCtrl;
  }

  getLocaoTyLeHoiQuangCtrl(row: RatioRow): FormControl<number | null> {
    // FormControl is now always initialized in RatioRow creation
    return row.tyLeHoiQuangCtrl;
  }



  getLocaoKlNhan(row: RatioRow): number {
    // Nếu tỉ lệ phối = 0 hoặc không nhập, không tính KL nhận
    const ratio = row.ratioCtrl.value ?? 0;
    if (ratio <= 0) {
      return 0;
    }

    // Use the calculated KL vào lò for all ore types
    const klVaoLo = this.getLocaoKlVaoLoValue(row);

    const controls = this.locaoControls().get(row.idQuang);
    if (!controls) return klVaoLo;

    const tyLeHoiQuang = controls.tyLeHoiQuang.value || 0;

    return klVaoLo * (1 + tyLeHoiQuang / 100);
  }

  // Lò cao: Tiêu hao (tấn/tsp) = (KL nhận của dòng / Tổng khối lượng Gang (locao-result)) * 100
  getLoCaoConsumption(row: RatioRow): number {
    const totalGangMass = this.locaoResult?.getGangTotalMass() ?? 0;
    if (totalGangMass === 0) return 0;
    // Quặng loại 3: dùng KL vào lò; các loại khác: dùng KL nhận
    const numerator = row.loaiQuang === 3
      ? (this.getLocaoKlVaoLoCtrl(row).value ?? 0)
      : this.getLocaoKlNhan(row);
    return (numerator / totalGangMass) * 100;
  }

  // Lò cao: Tổng tiêu hao
  getTotalLoCaoConsumption(): number {
    return this.rows().reduce((sum, r) => sum + this.getLoCaoConsumption(r), 0);
  }

  getTotalLoCaoCost(): number {
    const oreCost = this.rows().reduce((sum, r) => {
      const consumption = this.getLoCaoConsumption(r);
      const unitPrice = this.getUnitPriceVND(r);
      return sum + (consumption * unitPrice);
    }, 0);

    // Đảm bảo tất cả các giá trị đều là số
    const otherCost = Number(this.otherCostLoCao) || 0;
    const recycleCost = Number(this.recycleCostVnd) || 0;
    const total = Number(oreCost) + otherCost + recycleCost;

    // Tổng bao gồm chi phí SX gang lỏng và có thể cộng chi phí quặng hồi nếu dùng nhập tay
    return Number(total.toFixed(2));
  }

  getTotalLoCaoCostUSD(): number {
    const oreCost = this.rows().reduce((sum, r) => {
      const consumption = this.getLoCaoConsumption(r);
      const unitPrice = this.getUnitPriceUSD(r);
      return sum + (consumption * (unitPrice || 0));
    }, 0);
    const tyGia = this.getSafeTyGia();
    
    // Đảm bảo tất cả các giá trị đều là số
    const otherCost = Number(this.otherCostLoCao) || 0;
    const recycleCost = Number(this.recycleCostVnd) || 0;
    const otherCostUSD = tyGia > 0 ? otherCost / tyGia : 0;
    const recycleUSD = tyGia > 0 ? recycleCost / tyGia : 0;
    
    const total = Number(oreCost) + otherCostUSD + recycleUSD;
    return Number(total.toFixed(2));
  }

  // Lò cao: Chi phí sản xuất khác (nhập tay)
  otherCostLoCao: number = 0;
  onOtherCostLocaoChange(): void {
    // placeholder for future hooks (recalc totals, validations...)
  }

  // Lò cao: Quặng hồi - tiêu hao = 100 * (SUM(KL nhận non-type-3) - SUM(KL vào lò non-type-3)) / Tổng khối lượng Gang
  getLoCaoRecycleConsumption(): number {
    const sumKlNhan = this.rows().reduce((s, r) => {
      // Chỉ tính các quặng khác loại 3
      if (r.loaiQuang === 3) return s;
      return s + (r.klNhanCtrl?.value ?? 0);
    }, 0);

    const sumKlVaoLo = this.rows().reduce((s, r) => {
      // Chỉ tính các quặng khác loại 3
      if (r.loaiQuang === 3) return s;
      return s + (r.klVaoLoCtrl?.value ?? 0);
    }, 0);

    const denominator = this.locaoResult?.getGangTotalMass() ?? 0;
    if (denominator === 0) return 0;

    const result = 100 * (sumKlNhan - sumKlVaoLo) / denominator;
    return Number(result.toFixed(3));
  }

  // Internal state to store calculated values
  private calculatedValues = new Map<string, number>();
  private inputValues = new Map<string, number>();
  private processParamsInfo = new Map<string, { id: number, code: string, iD_Quang_LienKet?: number, scope?: number, calcFormula?: string }>();
  private lastAllNonLoai3ParamValue: number | null = null; // lưu giá trị param scope=1 gần nhất


  // Calculate klNhan using the same formula as getLocaoKlNhan
  private calculateKlNhan(row: RatioRow): number {
    const klVaoLo = row.klVaoLoCtrl.value || 0;
    const tyLeHoiQuang = row.tyLeHoiQuangCtrl.value || 0;
    const result = klVaoLo * (1 + tyLeHoiQuang / 100);
    return Number(result.toFixed(2));
  }

  // Get output ore price data for payload
  private getOutputOrePriceData(): any {
    const tyGia = this.rows()[0]?.tyGia ?? 1;
    const ngayChonTyGia = new Date().toISOString();

    if (this.milestone() === MilestoneEnum.LoCao) {
      // Lò cao: Tổng chi phí Gang
      return {
        Gia_USD_1Tan: this.getTotalLoCaoCostUSD(),
        Ty_Gia_USD_VND: tyGia,
        Gia_VND_1Tan: this.getTotalLoCaoCost(),
        Ngay_Chon_TyGia: ngayChonTyGia
      };
    } else if (this.milestone() === MilestoneEnum.ThieuKet) {
      // Thiêu kết: Tổng chi phí quặng phối
      return {
        Gia_USD_1Tan: this.getTotalAllCostsUSD(),
        Ty_Gia_USD_VND: tyGia,
        Gia_VND_1Tan: this.getTotalAllCosts(),
        Ngay_Chon_TyGia: ngayChonTyGia
      };
    } else {
      // Milestone khác: Tính theo tỷ lệ
      return {
        Gia_USD_1Tan: this.getTotalCostByRatioVND() / tyGia,
        Ty_Gia_USD_VND: tyGia,
        Gia_VND_1Tan: this.getTotalCostByRatioVND(),
        Ngay_Chon_TyGia: ngayChonTyGia
      };
    }
  }


  // Getters for locao-result component
  getProcessParamsForStatistics(): ProcessParamData[] {
    const params: ProcessParamData[] = [];
    this.processParamsInfo.forEach((paramInfo, code) => {
      const value = this.inputValues.get(code) || 0;
      params.push({
        id: paramInfo.id,
        code: paramInfo.code,
        value: value,
        id_Quang_LienKet: paramInfo.iD_Quang_LienKet,
        scope: paramInfo.scope,
        calcFormula: paramInfo.calcFormula
      });
    });
    return params;
  }

  getMixRowsForStatistics(): MixRowData[] {
    const mixRows: MixRowData[] = [];

    this.rows().forEach(row => {
      const chems: Record<string, number> = {};

      // Convert chems Map to Record<string, number>
      row.chems.forEach((chemCtrl, chemId) => {
        // Find chem name by ID from selectedChems
        const chem = this.selectedChems().find(c => c.id === chemId);
        if (chem) {
          chems[chem.ma_TPHH] = chemCtrl.value || 0;
        }
      });

      // Create base row data
      const baseRow = {
        code: row.maQuang, // Use maQuang as initial code
        tenQuang: row.tenQuang,
        loaiQuang: row.loaiQuang || 0,
        ratio: row.ratioCtrl.value || 0,
        klVaoLo: row.klVaoLoCtrl?.value || 0, // Direct access from RatioRow
        tyLeHoiQuang: row.tyLeHoiQuangCtrl?.value || 0, // Direct access from RatioRow
        klNhan: row.klNhanCtrl?.value || 0, // Direct access from RatioRow
        chems: chems
      };
      // Apply regex-based code normalization
      const normalizedRow = this.attachOreCodeByRegex(baseRow);
      mixRows.push(normalizedRow);
    });

    return mixRows;
  }

  private attachOreCodeByRegex(row: MixRowData): MixRowData {
    // If already has code, check if it matches any ORE_TYPE_CODES
    if (row.code && row.code.trim().length > 0) {
      const normalizedCode = row.code?.toLowerCase() || '';
      // Check if the existing code matches any of our standard codes
      if (Object.values(ORE_TYPE_CODES).includes(normalizedCode as any)) {
        return { ...row, code: normalizedCode };
      }
    }

    // Use regex to determine code based on tenQuang
    const name = row.tenQuang?.toLowerCase() || '';
    if (/(thiêu|thieu|sinter|qtk)/i.test(name)) return { ...row, code: ORE_TYPE_CODES.thieuKet };
    if (/(vê\s*viên|ve\s*vien|pellet|qvv|quặng\s*cỡ|quang\s*co)/i.test(name)) return { ...row, code: ORE_TYPE_CODES.veVien };
    if (/(25\s*[-_]\s*80|25\s*80|coke\s*25\s*[-_]\s*80|coke\s*2580)/i.test(name)) return { ...row, code: ORE_TYPE_CODES.mecoke2580 };
    if (/(10\s*[-_]\s*25|10\s*25|coke\s*10\s*[-_]\s*25|coke\s*1025)/i.test(name)) return { ...row, code: ORE_TYPE_CODES.mecoke1025 };
    if (/(than\s*phun|pulverized|pci)/i.test(name)) return { ...row, code: ORE_TYPE_CODES.thanphun };

    // If no match, return without code (will be treated as generic ore)
    return { ...row, code: undefined };
  }

  // Handle process params change from locao-section
  onProcessParamsChange(inputDataList: Array<{ id: number, code: string, value: number, iD_Quang_LienKet?: number, scope?: number, calcFormula?: string }>): void {
    // Update input values and process params info
    inputDataList.forEach(data => {
      this.inputValues.set(data.code, data.value);
      this.processParamsInfo.set(data.code, {
        id: data.id,
        code: data.code,
        iD_Quang_LienKet: data.iD_Quang_LienKet,
        scope: data.scope,
        calcFormula: data.calcFormula
      });
    });

    // Recalculate all formulas
    this.recalculateAllFormulas();

    // Apply results to UI
    this.applyCalculatedResults();

  }

  // Recalculate all formulas based on current input values
  private recalculateAllFormulas(): void {
    // Clear previous calculations
    this.calculatedValues.clear();

    // First pass: calculate all formulas
    this.processParamsInfo.forEach((paramInfo, code) => {
      if (paramInfo.calcFormula) {
        // This param has a formula - calculate it
        const calculatedValue = this.calculateFormula(paramInfo.calcFormula);
        this.calculatedValues.set(code, calculatedValue);
      } else {
        // This param has no formula - use input value
        const inputValue = this.inputValues.get(code) || 0;
        this.calculatedValues.set(code, inputValue);
      }
    });
  }

  // Calculate formula using current input and calculated values
  private calculateFormula(formula: string): number {
    // Build param values map for FormulaService
    const paramValues = new Map<number, number>();

    this.processParamsInfo.forEach((paramInfo, code) => {
      let value: number;

      if (paramInfo.calcFormula) {
        // Check if this is self-referencing
        const isSelfReferencing = this.isSelfReferencingFormula(paramInfo.calcFormula, paramInfo.id);

        if (isSelfReferencing) {
          // Self-referencing formula: use input value for itself
          value = this.inputValues.get(code) || 0;
        } else {
          // Non-self-referencing formula: use calculated value
          value = this.calculatedValues.get(code) || 0;
        }
      } else {
        // If this param has no formula, use input value
        value = this.inputValues.get(code) || 0;
      }

      paramValues.set(paramInfo.id, value);
    });

    // Use FormulaService to evaluate
    return this.formulaService.evaluateFormula(formula, paramValues);
  }

  // Apply calculated results to UI
  private applyCalculatedResults(): void {
    this.calculatedValues.forEach((value, code) => {
      const paramInfo = this.processParamsInfo.get(code);
      if (!paramInfo) return;

      // Check if this is a self-referencing formula
      const isSelfReferencing = this.isSelfReferencingFormula(paramInfo.calcFormula, paramInfo.id);

      // Apply to linked ore (if exists)
      if (paramInfo.scope === 0 && paramInfo.iD_Quang_LienKet) {
        // Scope 0: LinkedOre - map to specific ore
        this.updateLinkedOre(paramInfo.iD_Quang_LienKet, value);
      } else if (paramInfo.scope === 1) {
        // Scope 1: AllNonLoai3 - apply to all non-type-3 ores
        this.lastAllNonLoai3ParamValue = value;
        this.updateAllNonLoai3Ores(value);
      }

      // Apply to param itself (only for non-self-referencing formulas)
      if (!isSelfReferencing && paramInfo.calcFormula) {
        // Trường hợp 1: Non-self-referencing formula
        // Gán kết quả tính toán cho cả chính nó VÀ quặng liên kết
        this.updateParamValue(code, value);
      }
      // Trường hợp 2: Self-referencing formula
      // Chỉ gán cho quặng liên kết, KHÔNG gán cho chính nó
      // Input của user được giữ nguyên
    });
  }

  // Check if formula is self-referencing
  private isSelfReferencingFormula(formula: string | undefined, paramId: number): boolean {
    if (!formula) return false;
    return (this.formulaService as any).isSelfReferencing(formula, paramId);
  }

  // Update param value in locao-section (for non-self-referencing formulas)
  private updateParamValue(code: string, value: number): void {
    // Emit calculated value back to locao-section for display
    // This doesn't interfere with user input, just provides calculated value for display
    this.locaoSection?.updateCalculatedValue(code, value);
  }

  // Update specific linked ore
  private updateLinkedOre(oreId: number, value: number): void {
    const rows = this.rows();
    const targetRow = rows.find(r => r.idQuang === oreId);
    if (targetRow && targetRow.klVaoLoCtrl) {
      targetRow.klVaoLoCtrl.setValue(value, { emitEvent: true });
    }
  }

  // Update all non-type-3 ores using ratio formula
  private updateAllNonLoai3Ores(paramValue: number): void {
    const rows = this.rows();

    for (const row of rows) {
      if (row.loaiQuang !== 3) { // Only apply to non-type-3 ores
        const tyLe = row.ratioCtrl.value || 0; // Get ratio from FormControl

        // Formula: KL vào lò = (Tỷ lệ × Giá trị param) / 100
        const newKlVaoLo = (tyLe * paramValue) / 100;

        // Check if FormControl exists before using it
        if (row.klVaoLoCtrl) {
          row.klVaoLoCtrl.setValue(newKlVaoLo, { emitEvent: true });
        }
      }
    }
  }

  // Kiểm tra xem KL vào lò có được tính toán từ locao-section hay không
  isLocaoKlVaoLoCalculated(row: RatioRow): boolean {
    // TODO: Implement logic kiểm tra xem quặng này có param nào được link từ locao-section không
    // Tạm thời return false để hiển thị input field
    return false;
  }

  // Lấy giá trị KL vào lò (từ calculation hoặc từ input)
  getLocaoKlVaoLoValue(row: RatioRow): number {
    // Nếu tỉ lệ phối = 0 hoặc không nhập, không tính KL vào lò
    const ratio = row.ratioCtrl.value ?? 0;
    if (ratio <= 0) {
      return 0;
    }

    if (this.isLocaoKlVaoLoCalculated(row)) {
      // TODO: Lấy giá trị từ calculation
      return 0;
    } else {
      // Lấy giá trị từ input field
      const ctrl = this.getLocaoKlVaoLoCtrl(row);
      return ctrl.value ?? 0;
    }
  }

  // Initialize controls when rows change
  private initializeLocaoControls(): void {
    const controlsMap = new Map<number, { klVaoLo: FormControl<number | null>, tyLeHoiQuang: FormControl<number | null>, klNhan: FormControl<number | null> }>();

    for (const row of this.rows()) {
      // FormControls are now always initialized in RatioRow creation
      // Just add subscriptions and store in controlsMap
      const klVaoLoControl = row.klVaoLoCtrl;
      const tyLeHoiQuangControl = row.tyLeHoiQuangCtrl;
      const klNhanControl = row.klNhanCtrl;

      // Set default tyLeHoiQuang based on loaiQuang if not already set
      // Chỉ set default khi tạo mới (không có giá trị từ backend)
      // Khi edit, giá trị từ backend đã được set ở dòng 510, không cần set default nữa
      if (tyLeHoiQuangControl.value === null || tyLeHoiQuangControl.value === undefined) {
        if (row.loaiQuang === 3) {
          tyLeHoiQuangControl.setValue(0, { emitEvent: false });
        } else if (row.loaiQuang === 7) {
          tyLeHoiQuangControl.setValue(9, { emitEvent: false });
        } else if (row.loaiQuang !== undefined) {
          // Chỉ set default cho các loại quặng khác (không phải loại 3 và 7)
          tyLeHoiQuangControl.setValue(1, { emitEvent: false });
        }
      } else if (row.loaiQuang === 3) {
        // Always set to 0 for loaiQuang = 3 (disabled input)
        tyLeHoiQuangControl.setValue(0, { emitEvent: false });
      }

      // Calculate initial klNhan value before render
      const initialKlNhan = this.calculateKlNhan(row);
      klNhanControl.setValue(initialKlNhan, { emitEvent: false });

        // Add value changes watchers for KL vào lò
        klVaoLoControl.valueChanges.subscribe(value => {
          // Recalculate klNhan when klVaoLo changes
          const newKlNhan = this.calculateKlNhan(row);
          klNhanControl.setValue(newKlNhan, { emitEvent: true });
        });

        // Add value changes watchers for Tỷ lệ hồi quặng
        tyLeHoiQuangControl.valueChanges.subscribe(value => {
          // Recalculate klNhan when tyLeHoiQuang changes
          const newKlNhan = this.calculateKlNhan(row);
          klNhanControl.setValue(newKlNhan, { emitEvent: true });
        });

        // Add value changes watchers for KL nhận
        klNhanControl.valueChanges.subscribe(value => {
          // Trigger change detection to update mixRows
          this.cdr.detectChanges();
        });

      // Recalculate KL vào lò khi tỷ lệ thay đổi (milestone Lò cao + có param scope=1)
      row.ratioCtrl.valueChanges.subscribe(ratio => {
        if (this.milestone() === MilestoneEnum.LoCao && this.lastAllNonLoai3ParamValue !== null && row.loaiQuang !== 3) {
          const newKlVaoLo = ((ratio ?? 0) * this.lastAllNonLoai3ParamValue) / 100;
          klVaoLoControl.setValue(newKlVaoLo, { emitEvent: true });
        }
      });


      controlsMap.set(row.idQuang, {
        klVaoLo: klVaoLoControl,
        tyLeHoiQuang: tyLeHoiQuangControl,
        klNhan: klNhanControl
      });
    }

    this.locaoControls.set(controlsMap);

    // Attach signals for all rows to ensure subscriptions are created
    for (const row of this.rows()) {
      this.attachSignals(row);
    }
  }



  private attachSignals(row: RatioRow) {
    if (!row.ratio$) {
      row.ratio$ = toSignal(
        row.ratioCtrl.valueChanges.pipe(startWith(row.ratioCtrl.value)),
        { initialValue: row.ratioCtrl.value, injector: this.injector }
      );
    }

    // Create signals for milestone-specific FormControls
    if (!row.klVaoLo$) {
      row.klVaoLo$ = toSignal(
        row.klVaoLoCtrl.valueChanges.pipe(startWith(row.klVaoLoCtrl.value)),
        { initialValue: row.klVaoLoCtrl.value, injector: this.injector }
      );
    }

    if (!row.tyLeHoiQuang$) {
      row.tyLeHoiQuang$ = toSignal(
        row.tyLeHoiQuangCtrl.valueChanges.pipe(startWith(row.tyLeHoiQuangCtrl.value)),
        { initialValue: row.tyLeHoiQuangCtrl.value, injector: this.injector }
      );
    }

    if (!row.klNhan$) {
      row.klNhan$ = toSignal(
        row.klNhanCtrl.valueChanges.pipe(startWith(row.klNhanCtrl.value)),
        { initialValue: row.klNhanCtrl.value, injector: this.injector }
      );
    }


    if (!row.khauHao$) {
      row.khauHao$ = toSignal(
        row.khauHaoCtrl.valueChanges.pipe(startWith(row.khauHaoCtrl.value)),
        { initialValue: row.khauHaoCtrl.value, injector: this.injector }
      );
    }

    if (!row.percentage$) {
      row.percentage$ = toSignal(
        row.percentageCtrl.valueChanges.pipe(startWith(row.percentageCtrl.value)),
        { initialValue: row.percentageCtrl.value, injector: this.injector }
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
    // Update loai7 ratio after removing a row
    queueMicrotask(() => {
      this.setupAutoRatioForLoai7();
    });
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
    // Update loai7 ratio after removing a chem (though it shouldn't affect ratio)
    queueMicrotask(() => {
      this.setupAutoRatioForLoai7();
    });
  }

  // Format ngày cho mã công thức (ddMMyy)
  private formatDateForCode(): string {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear().toString().slice(-2);
    return `${day}${month}${year}`;
  }

  // (Removed) loadOreAndChemData was unused and its logic is already covered by current flow

  // ====== Submit: build payload UpsertAndConfirmDto và gọi API 1 phát ======
  submit() {
    // Kiểm tra validation trước khi submit
    if (!this.isFormValid()) {
      this.oreForm.markAllAsTouched();
      return;
    }

    const chems = this.selectedChems();
    const rows = this.rows();

    // Debug: log dữ liệu trước khi build payload
    try {
      const debugRows = rows.map((r) => ({
        idQuang: r.idQuang,
        tiLe: r.ratioCtrl.value,
        chems: chems.map((c) => ({ id: c.id, val: this.getChemCtrl(r, c.id).value }))
      }));
    } catch (e) {
      // Handle error silently
    }

    // Build blocks
    // Build Mix DTO theo yêu cầu mới
    const payload = {
      CongThucPhoi: {
        ID: this.data?.congThucPhoiId ?? null, // null nếu tạo mới, có ID nếu edit
        ID_Phuong_An: this.data?.planId!,
        Ma_Cong_Thuc: this.maCongThucCtrl.value ?? '',
        Ten_Cong_Thuc: this.tenCongThucCtrl.value ?? '',
        Ghi_Chu: this.oreForm.value.GhiChu ?? null,
        Ngay_Tao: this.oreForm.value.NgayTao ? new Date(this.oreForm.value.NgayTao).toISOString() : new Date().toISOString(),
      },
      Milestone: this.data?.planId ? this.milestone() : null, // Chỉ gửi milestone khi mix trong plan
      ChiTietQuang: rows.map((r) => ({
        ID_Quang: r.idQuang,
        Ti_Le_PhanTram: r.ratioCtrl.value ?? 0,
        // Milestone-specific mapping - gửi null thay vì 0 để tránh hiển thị số 0 không cần thiết
        ...(this.milestone() === MilestoneEnum.ThieuKet ? {
          Khau_Hao: (() => {
            const val = this.getThieuKetKhauHaoValue(r);
            return val && val > 0 ? val : null;
          })(),
          Ti_Le_KhaoHao: (() => {
            const val = this.getThieuKetKhauHaoPercentage(r);
            return val && val > 0 ? val : null;
          })(),
        } : {}),
        ...(this.milestone() === MilestoneEnum.LoCao ? {
          KL_VaoLo: (() => {
            const val = r.klVaoLoCtrl?.value;
            return val != null && val > 0 ? val : null;
          })(),
          Ti_Le_HoiQuang: (() => {
            const val = r.tyLeHoiQuangCtrl?.value;
            return val != null && val > 0 ? val : null;
          })(),
          KL_Nhan: (() => {
            const val = r.klNhanCtrl?.value;
            return val != null && val > 0 ? val : null;
          })(),
        } : {}),
        TP_HoaHocs: [
          ...this.selectedChems().map((c, idx) => ({
            Id: c.id,
            PhanTram: this.getChemCtrl(r, c.id).value != null && this.getChemCtrl(r, c.id).value > 0 ? this.getChemCtrl(r, c.id).value : null,
            ThuTuTPHH: idx + 1
          }))
        ]
      })),
      RangBuocTPHH: chems.map((c) => {
        const rb = this.constraints().get(c.id)!;
        return { ID_TPHH: c.id, Min_PhanTram: rb.minCtrl.value ?? null, Max_PhanTram: rb.maxCtrl.value ?? null };
      }),
      QuangThanhPham: {
        Ma_Quang: this.oreForm.value.MaQuang!,
        Ten_Quang: this.oreForm.value.TenQuang!,
        Loai_Quang: this.data?.outputLoaiQuang ?? 1,
        Mat_Khi_Nung: null, // Không còn sử dụng MKN từ quặng
        ThanhPhanHoaHoc: this.selectedChems().map((c, idx) => ({
          ID_TPHH: c.id,
          Gia_Tri_PhanTram: this.milestone() === MilestoneEnum.LoCao
            ? this.getChemTotalBySumProduct(c.id)
            : (this.milestone() === MilestoneEnum.ThieuKet
              ? this.getThieuKetRow2Value(c.id)
              : this.resultRow()[c.id]),
          ThuTuTPHH: idx + 1
        })),
        Gia: this.getOutputOrePriceData()
      },
      // Gửi kèm bảng chi phí trong cùng payload để BE lưu trong MixAsync (1 API)
      BangChiPhi: this.buildBangChiPhiPayload(this.data?.congThucPhoiId ?? 0)
    };
    // eslint-disable-next-line no-console

    const call$ = this.data?.planId ? this.paService.mixWithCompleteData(this.buildCompletePayload()) : this.paService.mixStandalone(payload);
    call$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.dlgRef.close(res?.data);
          const msg = this.data?.planId ? 'Tạo quặng phối theo phương án thành công' : 'Tạo quặng phối độc lập thành công';
          this.snack.open(msg, 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
        },
        error: (e) => {
          // Handle error silently
        },
      });
  }

  // ===== Build complete payload với tất cả dữ liệu liên quan =====
  private buildCompletePayload() {
    const chems = this.selectedChems();
    const rows = this.rows();

    // Base payload như cũ
    const basePayload = {
      CongThucPhoi: {
        ID: this.data?.congThucPhoiId ?? null,
        ID_Phuong_An: this.data?.planId!,
        Ma_Cong_Thuc: this.maCongThucCtrl.value ?? '',
        Ten_Cong_Thuc: this.tenCongThucCtrl.value ?? '',
        Ghi_Chu: this.oreForm.value.GhiChu ?? null,
        Ngay_Tao: this.oreForm.value.NgayTao ? new Date(this.oreForm.value.NgayTao).toISOString() : new Date().toISOString(),
      },
      Milestone: this.data?.planId ? this.milestone() : null,
      ChiTietQuang: rows.map((r) => ({
        ID_Quang: r.idQuang,
        Ti_Le_PhanTram: r.ratioCtrl.value ?? 0,
        // Milestone-specific mapping - gửi null thay vì 0 để tránh hiển thị số 0 không cần thiết
        ...(this.milestone() === MilestoneEnum.ThieuKet ? {
          Khau_Hao: (() => {
            const val = this.getThieuKetKhauHaoValue(r);
            return val && val > 0 ? val : null;
          })(),
          Ti_Le_KhaoHao: (() => {
            const val = this.getThieuKetKhauHaoPercentage(r);
            return val && val > 0 ? val : null;
          })(),
        } : {}),
        ...(this.milestone() === MilestoneEnum.LoCao ? {
          KL_VaoLo: (() => {
            const val = r.klVaoLoCtrl?.value;
            return val != null && val > 0 ? val : null;
          })(),
          Ti_Le_HoiQuang: (() => {
            const val = r.tyLeHoiQuangCtrl?.value;
            return val != null && val > 0 ? val : null;
          })(),
          KL_Nhan: (() => {
            const val = r.klNhanCtrl?.value;
            return val != null && val > 0 ? val : null;
          })(),
        } : {}),
        TP_HoaHocs: [
          ...this.selectedChems().map((c, idx) => ({
            Id: c.id,
            PhanTram: this.getChemCtrl(r, c.id).value ?? 0,
            ThuTuTPHH: idx + 1
          }))
        ]
      })),
      RangBuocTPHH: chems.map((c) => {
        const rb = this.constraints().get(c.id)!;
        return { ID_TPHH: c.id, Min_PhanTram: rb.minCtrl.value ?? null, Max_PhanTram: rb.maxCtrl.value ?? null };
      }),
      QuangThanhPham: {
        Ma_Quang: this.oreForm.value.MaQuang!,
        Ten_Quang: this.oreForm.value.TenQuang!,
        Loai_Quang: this.data?.outputLoaiQuang ?? 1,
        Mat_Khi_Nung: null,
        ThanhPhanHoaHoc: this.selectedChems().map((c, idx) => ({
          ID_TPHH: c.id,
          Gia_Tri_PhanTram: this.milestone() === MilestoneEnum.LoCao
            ? this.getChemTotalBySumProduct(c.id)
            : (this.milestone() === MilestoneEnum.ThieuKet
              ? this.getThieuKetRow2Value(c.id)
              : this.resultRow()[c.id]),
          ThuTuTPHH: idx + 1
        })),
        Gia: this.getOutputOrePriceData()
      },
      BangChiPhi: this.buildBangChiPhiPayload(this.data?.congThucPhoiId ?? 0)
    };

    // Thêm dữ liệu liên quan nếu có planId
    if (this.data?.planId) {
      return {
        ...basePayload,
        // Process Param Values
        ProcessParamValues: this.locaoSection?.getCurrentParamInputs()?.map(item => ({
          IdProcessParam: item.idProcessParam,
          GiaTri: item.giaTri,
          ThuTuParam: item.thuTuParam
        })) || [],

        // Gang/Slag Data
        GangSlagData: this.milestone() === MilestoneEnum.LoCao ? {
          GangData: this.locaoResult?.gangData?.map(item => ({
            TphhId: item.tphhId || 0,
            Percentage: item.percentage || 0,
            Mass: item.mass || 0,
            CalcFormula: item.calcFormula || null,
            IsCalculated: item.isCalculated || false
          })) || [],
          SlagData: this.locaoResult?.xiData?.map(item => ({
            TphhId: item.tphhId || 0,
            Percentage: item.percentage || 0,
            Mass: item.mass || 0,
            CalcFormula: item.calcFormula || null,
            IsCalculated: item.isCalculated || false
          })) || []
        } : null,

        // Thống kê Results
        ThongKeResults: this.locaoResult?.getUpsertPlanResults()?.map((item, idx) => ({
          ID_ThongKe_Function: item.Id_ThongKe_Function,
          GiaTri: item.GiaTri,
          ThuTu: idx + 1
        })) || []
      };
    }

    return basePayload;
  }

  // ===== Build payload upsert for CTP_BangChiPhi =====
  private buildBangChiPhiPayload(idCongThucPhoi: number) {
    const tyGia = this.getSafeTyGia();
    const items: Array<{ ID_CongThucPhoi: number; ID_Quang: number | null; LineType: string; Tieuhao: number | null; DonGiaVND: number | null; DonGiaUSD: number; }> = [];

    if (this.milestone() === MilestoneEnum.ThieuKet) {
      // ThieuKet: Lấy từ getCostTableItems() - đúng như HTML đang hiển thị
      const costItems = this.getCostTableItems();
      for (const item of costItems) {
        if (item.isParent) {
          // Quặng phối chính - tìm row theo parentId
          const row = this.rows().find(r => r.idQuang === item.parentId);
          if (row) {
            items.push({
              ID_CongThucPhoi: idCongThucPhoi,
              ID_Quang: row.idQuang,
              LineType: LINE_TYPE_CHIPHI.QUANG,
              Tieuhao: Number(item.consumption.toFixed(6)),
              DonGiaVND: Number(item.unitVnd.toFixed(6)),
              DonGiaUSD: Number(item.unitUsd.toFixed(6)),
            });
          }
        } else {
          // Quặng thành phần - sử dụng id đã có sẵn từ getCostTableItems()
          if (item.id) {
            items.push({
              ID_CongThucPhoi: idCongThucPhoi,
              ID_Quang: item.id,
              LineType: LINE_TYPE_CHIPHI.QUANG,
              Tieuhao: Number(item.consumption.toFixed(6)),
              DonGiaVND: Number(item.unitVnd.toFixed(6)),
              DonGiaUSD: Number(item.unitUsd.toFixed(6)),
            });
          }
        }
      }

      // Chi phí khác - từ input trong HTML
      const vnd = this.otherCost || 0;
      const usd = tyGia > 0 ? vnd / tyGia : 0;
      items.push({
        ID_CongThucPhoi: idCongThucPhoi,
        ID_Quang: null,
        LineType: LINE_TYPE_CHIPHI.CHI_PHI_KHAC,
        Tieuhao: 1,
        DonGiaVND: Number(vnd.toFixed(6)),
        DonGiaUSD: Number(usd.toFixed(6)),
      });

      // console.log('items', items);

    } else if (this.milestone() === MilestoneEnum.LoCao) {
      // LoCao: Lấy từ rows() - đúng như HTML đang hiển thị
      for (const r of this.rows()) {
        const consumption = this.getLoCaoConsumption(r);
        const unitVnd = this.getUnitPriceVND(r);
        const unitUsd = this.getUnitPriceUSD(r);

        items.push({
          ID_CongThucPhoi: idCongThucPhoi,
          ID_Quang: r.idQuang,
          LineType: LINE_TYPE_CHIPHI.QUANG,
          Tieuhao: Number(consumption.toFixed(6)),
          DonGiaVND: Number(unitVnd.toFixed(6)),
          DonGiaUSD: Number(unitUsd.toFixed(6)),
        });
      }

      // Chi phí sản xuất gang lỏng - từ input trong HTML
      const vnd = this.otherCostLoCao || 0;
      const usd = tyGia > 0 ? vnd / tyGia : 0;
      items.push({
        ID_CongThucPhoi: idCongThucPhoi,
        ID_Quang: null,
        LineType: LINE_TYPE_CHIPHI.CHI_PHI_SX_GANG_LONG,
        Tieuhao: 1,
        DonGiaVND: Number(vnd.toFixed(6)),
        DonGiaUSD: Number(usd.toFixed(6)),
      });

      // Quặng hồi - từ input trong HTML
      const recycle = this.getLoCaoRecycleConsumption();
      const recycleVnd = this.recycleCostVnd || 0;
      const recycleUsd = tyGia > 0 ? recycleVnd / tyGia : 0;
      items.push({
        ID_CongThucPhoi: idCongThucPhoi,
        ID_Quang: null,
        LineType: LINE_TYPE_CHIPHI.QUANG_HOI,
        Tieuhao: Number.isFinite(recycle) ? Number(recycle.toFixed(6)) : 0,
        DonGiaVND: Number(recycleVnd.toFixed(6)),
        DonGiaUSD: Number(recycleUsd.toFixed(6)),
      });
    }

    return items;
  }

  cancel() {
    this.dlgRef.close();
  }
  trackChem = (_: number, c: { id: number }) => c.id;

  private buildOreChemMap(
    batch: any[]
  ): Map<number, Map<number, number>> {
    const map = new Map<number, Map<number, number>>();
    for (const item of batch) {
      const inner = new Map<number, number>();
      const list = (item as any).tP_HoaHocs ?? [];
      for (const t of list)
        inner.set(Number(t.id), Number(t.phanTram ?? 0));
      map.set(Number((item as any).quang?.id), inner);
    }
    return map;
  }

  private syncConstraints(chems: ChemVm[]) {
    const map = new Map(this.constraints()); // constraints(): Map<number, {minCtrl,maxCtrl}>
    for (const c of chems) {
      if (!map.has(c.id)) {
        map.set(c.id, {
          minCtrl: new FormControl<number | null>(0),
          maxCtrl: new FormControl<number | null>(5),
        });
      }
    }
    for (const id of Array.from(map.keys())) {
      if (!chems.some((x) => x.id === id)) map.delete(id);
    }
    this.constraints.set(map);
  }

  // ===== Bảng chi phí (client-side preview) =====
  getUnitPriceVND(row: RatioRow): number {
    if (row.giaVND != null) {
      return Number((row.giaVND || 0).toFixed(2));
    }
    const tyGia = (row.tyGia ?? this.getSafeTyGia());
    if (!tyGia || tyGia <= 0) return 0;
    const unitVnd = (row.giaUSD ?? 0) * tyGia;
    return Number((Number.isFinite(unitVnd) ? unitVnd : 0).toFixed(2));
  }


  getUnitPriceUSD(row: RatioRow): number {
    if (row.giaUSD != null) {
      return Number((row.giaUSD || 0).toFixed(2));
    }
    const tyGia = (row.tyGia ?? this.getSafeTyGia());
    if (!tyGia || tyGia <= 0) return 0;
    const unitUsd = (row.giaVND ?? 0) / tyGia;
    return Number((Number.isFinite(unitUsd) ? unitUsd : 0).toFixed(2));
  }

  getCostByRatioVND(row: RatioRow): number {
    const ratio = row.ratioCtrl.value ?? 0;
    const unitVnd = this.getUnitPriceVND(row);
    const cost = unitVnd * (ratio / 100);
    return Number(cost.toFixed(2));
  }

  getTotalCostByRatioVND(): number {
    const total = this.rows().reduce((s, r) => s + this.getCostByRatioVND(r), 0);
    return Number(total.toFixed(2));
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
    if (opts.ores) {
      this.selectedOres.set(opts.ores);
    }

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

    // Use selected ores
    const selectedOres = this.selectedOres();

    // giữ control cũ
    const prev = this.rows();
    const prevByOre = new Map(prev.map((r) => [r.idQuang, r]));

    const nextRows: RatioRow[] = selectedOres.map((o) => {
      const prevRow = prevByOre.get(o.id);
      const ratioCtrl =
        prevRow?.ratioCtrl ??
        new FormControl<number>(o.tiLePhoi ?? 0, {
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

      // Initialize milestone-specific FormControls (null thay vì 0 để tránh hiển thị số 0 không cần thiết)
      const klVaoLoCtrl = prevRow?.klVaoLoCtrl || new FormControl<number | null>(null);
      // Set default tyLeHoiQuang: loaiQuang = 7 → 9%, loaiQuang = 3 → 0%, các loại khác → 1%
      let defaultTyLeHoiQuang: number | null = null;
      if (o.loaiQuang === 3) {
        defaultTyLeHoiQuang = 0;
      } else if (o.loaiQuang === 7) {
        defaultTyLeHoiQuang = 9;
      } else {
        defaultTyLeHoiQuang = 1;
      }
      const tyLeHoiQuangCtrl = prevRow?.tyLeHoiQuangCtrl || new FormControl<number | null>(defaultTyLeHoiQuang);
      const klNhanCtrl = prevRow?.klNhanCtrl || new FormControl<number | null>(null);
      const khauHaoCtrl = prevRow?.khauHaoCtrl || new FormControl<number | null>(null);
      const percentageCtrl = prevRow?.percentageCtrl || new FormControl<number | null>(null);

      const row: RatioRow = {
        idQuang: o.id,
        maQuang: o.maQuang,
        tenQuang: o.tenQuang,
        loaiQuang: o.loaiQuang,
        gia: o.gia ?? null,
        giaUSD: o.giaUSD ?? null,
        tyGia: o.tyGia ?? null,
        giaVND: o.giaVND ?? null,
        ngayTyGia: o.ngayTyGia ?? null,
        ratioCtrl,
        chems: chemsMap,
        ratio$: prevRow?.ratio$,
        chem$: prevRow?.chem$,
        // Milestone-specific FormControls
        klVaoLoCtrl: klVaoLoCtrl,
        klVaoLo$: prevRow?.klVaoLo$,
        tyLeHoiQuangCtrl: tyLeHoiQuangCtrl,
        tyLeHoiQuang$: prevRow?.tyLeHoiQuang$,
        klNhanCtrl: klNhanCtrl,
        klNhan$: prevRow?.klNhan$,
        khauHaoCtrl: khauHaoCtrl,
        khauHao$: prevRow?.khauHao$,
        percentageCtrl: percentageCtrl,
        percentage$: prevRow?.percentage$
      };
      this.attachSignals(row); // gắn signal cho control mới (hoặc giữ cái cũ)
      return row;
    });

    this.rows.set(nextRows);

    // Setup auto-calculation for loaiQuang = 7 (tỉ lệ phối = 100 - tổng các hàng khác)
    this.setupAutoRatioForLoai7();

    // Initialize Lò Cao controls if needed
    if (this.milestone() === MilestoneEnum.LoCao) {
      this.initializeLocaoControls();
    }
  }

  // Method to calculate thieuKetKhauHao column for a specific row
  getThieuKetKhauHaoValue(row: RatioRow): number {
    const ratio = row.ratioCtrl.value ?? 0;
    // Đảm bảo giá trị là number
    const numRatio = typeof ratio === 'number' ? (isNaN(ratio) ? 0 : ratio) : 
                    (typeof ratio === 'string' ? (parseFloat(ratio) || 0) : 0);

    // Tìm MKN value từ các thành phần hóa học
    let mknValue = 0;
    const mknChem = this.selectedChems().find(c => c.ma_TPHH === 'MKN');
    if (mknChem) {
      const mknCtrl = row.chems.get(mknChem.id);
      const mknVal = mknCtrl?.value ?? 0;
      mknValue = typeof mknVal === 'number' ? (isNaN(mknVal) ? 0 : mknVal) : 
                (typeof mknVal === 'string' ? (parseFloat(mknVal) || 0) : 0);
    }

    // Công thức: tỷ lệ * (1 - MKN / 100)
    const result = Number(numRatio) * (1 - Number(mknValue) / 100);
    return isNaN(result) || !isFinite(result) ? 0 : Number(result);
  }

  // Method to get total thieuKetKhauHao value
  getTotalThieuKetKhauHao(): number {
    return this.rows().reduce((sum, row) => {
      const value = this.getThieuKetKhauHaoValue(row);
      const numValue = typeof value === 'number' ? value : 0;
      const currentSum = typeof sum === 'number' ? sum : 0;
      return Number(currentSum) + Number(numValue);
    }, 0);
  }

  // Method to calculate percentage for each ore
  // Yêu cầu: lấy tỷ lệ nhập vào / tổng tỷ lệ (không dùng giá trị khấu hao)
  getThieuKetKhauHaoPercentage(row: RatioRow): number {
    const total = this.getTotalThieuKetKhauHao();
    if (total === 0) return 0;

    const ratio = row.ratioCtrl.value ?? 0;
    // Đảm bảo giá trị là number
    const numRatio = typeof ratio === 'number' ? (isNaN(ratio) ? 0 : ratio) : 
                    (typeof ratio === 'string' ? (parseFloat(ratio) || 0) : 0);
    const numTotal = typeof total === 'number' ? total : 0;
    const result = numTotal > 0 ? numRatio / numTotal : 0;
    return isNaN(result) || !isFinite(result) ? 0 : Number(result);
  }

  // Method to get total percentage (should always be 100%)
  getTotalThieuKetKhauHaoPercentage(): number {
    return this.rows().reduce((sum, row) => sum + this.getThieuKetKhauHaoPercentage(row), 0);
  }

  // ===== Methods for Lò Cao milestone totals =====
  // Tổng KL vào lò
  getTotalLocaoKlVaoLo(): number {
    return this.rows().reduce((sum, row) => {
      const ctrl = this.getLocaoKlVaoLoCtrl(row);
      return sum + (ctrl.value ?? 0);
    }, 0);
  }

  // Tổng tỷ lệ hồi quặng (trung bình có trọng số)
  getTotalLocaoTyLeHoiQuang(): number {
    const totalKlVaoLo = this.getTotalLocaoKlVaoLo();
    if (totalKlVaoLo === 0) return 0;

    const weightedSum = this.rows().reduce((sum, row) => {
      const klVaoLo = this.getLocaoKlVaoLoCtrl(row).value ?? 0;
      const tyLeHoiQuang = this.getLocaoTyLeHoiQuangCtrl(row).value ?? 0;
      return sum + (klVaoLo * tyLeHoiQuang);
    }, 0);

    return weightedSum / totalKlVaoLo;
  }

  // Tổng KL nhận
  getTotalLocaoKlNhan(): number {
    return this.rows().reduce((sum, row) => {
      return sum + this.getLocaoKlNhan(row);
    }, 0);
  }

  // Method to calculate row 1: ratio * chemical content for each TPHH
  getThieuKetRow1Value(chemId: number): number {
    return this.rows().reduce((sum, row) => {
      const ratio = row.ratioCtrl.value ?? 0;
      const chemValue = row.chems.get(chemId)?.value ?? 0;
      return sum + (ratio * chemValue);
    }, 0);
  }

  // Method to calculate row 2: row1 result / total khau hao
  getThieuKetRow2Value(chemId: number): number {
    const row1Value = this.getThieuKetRow1Value(chemId);
    const totalKhauHao = this.getTotalThieuKetKhauHao();
    if (totalKhauHao === 0) return 0;
    return row1Value / totalKhauHao;
  }

  // Method to calculate CaO/SiO2 ratio for Result 2
  getThieuKetCaOSiO2Ratio(): number {
    const caoChem = this.selectedChems().find(c => c.ma_TPHH === 'CaO');
    const sio2Chem = this.selectedChems().find(c => c.ma_TPHH === 'SiO2');

    if (!caoChem || !sio2Chem) return 0;

    const caoValue = this.getThieuKetRow1Value(caoChem.id);
    const sio2Value = this.getThieuKetRow1Value(sio2Chem.id);

    if (sio2Value === 0) return 0;
    return caoValue / sio2Value;
  }

  // Method to check if chemical should be hidden in Result 1 (MKN)
  shouldHideInResult1(chemId: number): boolean {
    const chem = this.selectedChems().find(c => c.id === chemId);
    return chem?.ma_TPHH === 'MKN';
  }

  getLocaoStatistics(): LocaoStatistics {
    // Calculate statistics based on current mixing data
    const totalOreInput = this.rows().reduce((sum, row) => {
      const klVaoLo = this.locaoControls()?.get(row.idQuang)?.klVaoLo?.value ?? 0;
      return sum + klVaoLo;
    }, 0);

    const totalCokeInput = this.rows()
      .filter(row => row.loaiQuang === 3) // Coke type
      .reduce((sum, row) => {
        const klVaoLo = this.locaoControls()?.get(row.idQuang)?.klVaoLo?.value ?? 0;
        return sum + klVaoLo;
      }, 0);

    const totalPulverizedCoalInput = this.rows()
      .filter(row => row.tenQuang?.toLowerCase()?.includes('than phun'))
      .reduce((sum, row) => {
        const klVaoLo = this.locaoControls()?.get(row.idQuang)?.klVaoLo?.value ?? 0;
        return sum + klVaoLo;
      }, 0);

    // Use real data from locao-result component instead of hard coded data
    const gangOutput = this.locaoResult?.getGangTotalMass() ?? 0;
    const xaOutput = this.locaoResult?.getXaTotalMass() ?? 0;
    const ironOutput = this.locaoResult?.gangData?.find(item => item.element === 'Fe')?.mass ?? 0;

    return {
      totalOreInput,
      totalCokeInput,
      totalPulverizedCoalInput,
      gangOutput,
      xaOutput,
      ironOutput,
      cokeConsumption: totalCokeInput,
      pulverizedCoalConsumption: totalPulverizedCoalInput,
      efficiency: totalOreInput > 0 ? (ironOutput / totalOreInput) * 100 : 0
    };
  }

  // Calculate SUMPRODUCT totals per chemical (LoCao): Σ(KL_vao_lo_i × chemPercent_i)
  // chemPercent can be entered as percent (0–100) or decimal (0–1); we normalize.
  computeChemTotalsBySumProduct(): Map<number, number> {
    const totals = new Map<number, number>();
    const rows = this.rows();
    const chems = this.selectedChems();


    for (const chem of chems) {
      const sum = rows.reduce((acc, row) => {
        const klVaoLo = this.locaoControls()?.get(row.idQuang)?.klVaoLo?.value ?? 0;
        const raw = row.chems.get(chem.id)?.value ?? 0; // dùng trực tiếp, không chia 100
        const contribution = klVaoLo * raw;
        return acc + contribution;
      }, 0);
      totals.set(chem.id, parseFloat(sum.toFixed(2)));
    }

    return totals;
  }

  // Convenience: get total for one chemical id
  getChemTotalBySumProduct(chemId: number): number {
    const totals = this.computeChemTotalsBySumProduct();
    return totals.get(chemId) ?? 0;
  }

  // Realtime computed productTotals for LocaoResult
  get productTotals(): ProductTotal[] {
    const chems = this.selectedChems();
    return chems.map((c: any) => ({
      id: c.id,
      code: c.ma_TPHH ?? c.code ?? '',
      mass: this.getChemTotalBySumProduct(c.id) ?? 0,
      percentage: null
    }));
  }

  // Tính tỉ lệ phối cho loại 7: 100 - tổng các hàng khác (không phải loại 7)
  getRatioForLoai7(): number {
    const rows = this.rows();
    let totalOtherRows: number = 0; // Đảm bảo khởi tạo là number
    
    for (const r of rows) {
      if (r.loaiQuang !== 7) {
        const value: number | null = r.ratioCtrl.value;
        // Đảm bảo giá trị là number hợp lệ
        let numValue: number = 0;
        if (value === null || value === undefined) {
          numValue = 0;
        } else if (typeof value === 'number') {
          numValue = isNaN(value) || !isFinite(value) ? 0 : Number(value);
        } else {
          // Nếu là string (trường hợp đặc biệt), parse
          const strValue = String(value);
          const trimmed = strValue.trim();
          if (trimmed === '' || trimmed === '.' || trimmed === '-') {
            numValue = 0;
          } else {
            // Xử lý trường hợp "7." -> parse thành 7
            const toParse = trimmed.endsWith('.') && trimmed.split('.').length === 2 
              ? trimmed.slice(0, -1) 
              : trimmed;
            const parsed = parseFloat(toParse);
            numValue = isNaN(parsed) || !isFinite(parsed) ? 0 : Number(parsed);
          }
        }
        // Đảm bảo cộng số, không nối chuỗi
        totalOtherRows = Number(totalOtherRows) + Number(numValue);
      }
    }
    
    const ratioLoai7 = 100 - Number(totalOtherRows);
    const result = Math.max(0, Math.round(ratioLoai7 * 100) / 100);
    // Đảm bảo luôn trả về number hợp lệ
    const finalResult = isNaN(result) || !isFinite(result) ? 0 : Number(result);
    return finalResult;
  }

  // Setup auto-calculation for loaiQuang = 7
  private setupAutoRatioForLoai7(): void {
    const rows = this.rows();
    const loai7Row = rows.find(r => r.loaiQuang === 7);
    
    if (!loai7Row) return;

    // Unsubscribe all previous subscriptions first
    rows.forEach(row => {
      if (row.loaiQuang !== 7 && (row as any)._ratioSubscription) {
        (row as any)._ratioSubscription.unsubscribe();
        (row as any)._ratioSubscription = null;
      }
    });

    // Subscribe to valueChanges of all non-loai7 rows
    rows.forEach(row => {
      if (row.loaiQuang !== 7) {
        // Subscribe to ratio changes
        (row as any)._ratioSubscription = row.ratioCtrl.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((newValue) => {
            // Helper function để parse giá trị an toàn và kiểm tra hợp lệ
            const parseValue = (val: any): number => {
              if (val === null || val === undefined || val === '') return 0;
              
              // Nếu là number, kiểm tra hợp lệ
              if (typeof val === 'number') {
                return isNaN(val) || !isFinite(val) ? 0 : val;
              }
              
              // Nếu là string
              if (typeof val === 'string') {
                // Loại bỏ khoảng trắng
                const trimmed = val.trim();
                // Nếu rỗng hoặc chỉ có dấu chấm/các ký tự không hợp lệ, return 0
                if (trimmed === '' || trimmed === '.' || trimmed === '-') return 0;
                
                  // Kiểm tra nếu string kết thúc bằng dấu chấm (đang nhập dở) - không tính
                  // Ví dụ: "7." hoặc "7.6." - không hợp lệ, dùng giá trị cũ
                  if (trimmed.endsWith('.') && trimmed.split('.').length > 2) {
                    return 0;
                  }
                
                // Parse số
                const parsed = parseFloat(trimmed);
                return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
              }
              
              return 0;
            };
            
            // Kiểm tra nếu giá trị mới nhập chưa hợp lệ (đang nhập dở như "7.")
            const isValidValue = (val: any): boolean => {
              if (val === null || val === undefined || val === '') return true; // Cho phép xóa
              if (typeof val === 'number') return !isNaN(val) && isFinite(val);
              if (typeof val === 'string') {
                const trimmed = val.trim();
                // Nếu kết thúc bằng dấu chấm và chỉ có 1 dấu chấm, có thể đang nhập dở
                // Nhưng vẫn tính để hiển thị tạm thời
                if (trimmed === '.' || trimmed === '-') return false;
                const parsed = parseFloat(trimmed);
                return !isNaN(parsed) && isFinite(parsed);
              }
              return false;
            };
            
            // Parse giá trị mới nhập (xử lý trường hợp "7." -> 7)
            const parsedNewValue = parseValue(newValue);
            
            // Tính lại tỷ lệ cho loại 7: 100 - tổng tỷ lệ các hàng khác
            const currentRows = this.rows();
            const currentLoai7Row = currentRows.find(r => r.loaiQuang === 7);
            
            if (currentLoai7Row) {
              // Tính tổng: dùng giá trị parsed cho hàng vừa thay đổi, value cho các hàng khác
              const totalOtherRows = currentRows
                .filter(r => r.loaiQuang !== 7)
                .reduce((sum, r) => {
                  // Nếu là hàng vừa thay đổi, dùng giá trị parsed (để xử lý trường hợp "7." -> 7)
                  // Nếu không, dùng value hiện tại và parse
                  const value = r === row ? parsedNewValue : r.ratioCtrl.value;
                  const numValue = parseValue(value);
                  // Đảm bảo numValue là number, không phải string
                  const finalValue = typeof numValue === 'number' ? numValue : 0;
                  // Đảm bảo sum là number trước khi cộng
                  const currentSum = typeof sum === 'number' ? sum : 0;
                  return currentSum + finalValue;
                }, 0);
              
              // Đảm bảo totalOtherRows là number
              const totalOtherRowsNum = typeof totalOtherRows === 'number' ? totalOtherRows : 0;
              
              const newRatio = Math.max(0, 100 - totalOtherRowsNum);
              // Đảm bảo giá trị là number và làm tròn để tránh floating point issues
              const roundedRatio = typeof newRatio === 'number' ? Math.round(newRatio * 100) / 100 : 0;
              
              // Đảm bảo giá trị là number hợp lệ trước khi set
              if (typeof roundedRatio === 'number' && !isNaN(roundedRatio) && isFinite(roundedRatio)) {
                // Chỉ set nếu giá trị khác với giá trị hiện tại (tránh trigger không cần thiết)
                const currentValue = currentLoai7Row.ratioCtrl.value;
                const currentValueNum = typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue)) || 0;
                
                if (Math.abs(currentValueNum - roundedRatio) > 0.001) {
                  // Đảm bảo setValue với number, không phải string
                  currentLoai7Row.ratioCtrl.setValue(Number(roundedRatio), { emitEvent: false });
                }
              }
            }
          });
      }
    });

    // Set initial value for loai7
    const totalOtherRows = rows
      .filter(r => r.loaiQuang !== 7)
      .reduce((sum, r) => sum + (r.ratioCtrl.value ?? 0), 0);
    const initialRatio = Math.max(0, 100 - totalOtherRows);
    loai7Row.ratioCtrl.setValue(initialRatio, { emitEvent: false });
  }

}
