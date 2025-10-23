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
import {MatSelectModule} from '@angular/material/select';
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
import { PhuongAnPhoiService } from '../../core/services/phuong-an-phoi.service';
import { QuangService } from '../../core/services/quang.service';
import { firstValueFrom, startWith } from 'rxjs';
import { QuangDetailResponse } from '../../core/models/quang.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MilestoneEnum } from '../../core/enums/milestone.enum';
import { RateService } from '../../core/services/rate.service';
// Interface for ore data calculation
export interface OreData {
  id: number;
  name: string;
  ratio: number;
  mkn: number;
}
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
  private svc = inject(MixOreService);
  private quangService = inject(QuangService);
  private congThucPhoiService = inject(CongThucPhoiService);
  private paService = inject(PhuongAnPhoiService);
  private destroyRef = inject(DestroyRef);
  private snack = inject(MatSnackBar);
  private locaoParamService = inject(LoCaoProcessParamService);
  private cdr = inject(ChangeDetectorRef);
  private formulaService = inject(FormulaService);
  private thongKeService = inject(ThongKeFunctionService);


  data = inject<{ neoOreId?: number; existingOreId?: number; formulaId?: number; gangId?: number; maGang?: string; milestone?: MilestoneEnum; planId?: number; planName?: string; planNgayTao?: string; congThucPhoiId?: number } | null>(
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
  locaoControls = signal(new Map<number, {klVaoLo: FormControl<number | null>, tyLeHoiQuang: FormControl<number | null>}>());
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

  ngOnInit(): void {
    // Khởi tạo _formulaByOutputOre để tránh undefined
    (this as any)._formulaByOutputOre = new Map<number, any[]>();
    
     // Lấy tên phương án (nếu được truyền qua) và mã gang
     this.planName.set(this.data?.planName ?? (`PA-${this.data?.planId ?? ''}`));
     this.gangName.set(this.data?.maGang ?? '');
    // Nếu truyền neoOreId vào để set mặc định công thức neo

    this.milestone.set(this.data?.milestone ?? MilestoneEnum.Standard);
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
            NgayTao: new Date().toISOString().split('T')[0],
            GhiChu: ore.GhiChu ?? '',
          });
        });
    }

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

          // Load BangChiPhi data for non-ore cost items (các dòng khác không có iD_Quang)
          if (d.bangChiPhi?.length) {
            for (const item of d.bangChiPhi) {
              // Chỉ load các dòng không có iD_Quang (chi phí khác)
              if (item.iD_Quang === null) {
                if (item.lineType === LINE_TYPE_CHIPHI.CHI_PHI_KHAC && d.milestone === MilestoneEnum.ThieuKet) {
                  this.otherCost = item.donGiaVND || 0;
                } else if (item.lineType === LINE_TYPE_CHIPHI.CHI_PHI_SX_GANG_LONG && d.milestone === MilestoneEnum.LoCao) {
                  this.otherCostLoCao = item.donGiaVND || 0;
                } else if (item.lineType === LINE_TYPE_CHIPHI.QUANG_HOI && d.milestone === MilestoneEnum.LoCao) {
                  this.recycleCostVnd = item.donGiaVND || 0;
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
                row.khauHaoCtrl?.setValue(src.khauHao ?? null, { emitEvent: false });
                row.percentageCtrl?.setValue(src.tiLeKhaoHao ?? null, { emitEvent: false });
              } else if (this.milestone() === MilestoneEnum.LoCao) {
                row.klVaoLoCtrl?.setValue(src.klVaoLo ?? null, { emitEvent: false });
                row.tyLeHoiQuangCtrl?.setValue(src.tyLeHoiQuang ?? null, { emitEvent: false });
                row.klNhanCtrl?.setValue(src.klNhan ?? null, { emitEvent: false });
              }
            }
            this.rows.set([...currentRows]);
            
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

          // Nếu milestone Thiêu Kết: tải công thức của các quặng loại 1 (quặng phối) từ dữ liệu edit
          if (this.milestone() === MilestoneEnum.ThieuKet) {
            const outputOreIds = ores.filter((o: any) => o.loaiQuang === 1).map((o: any) => o.id);
            if (outputOreIds.length > 0) {
              this.quangService.getFormulasByOutputOreIds(outputOreIds).subscribe((responses) => {
                // Lưu tạm vào map để bảng chi phí có thể render khi cần
                const dict = new Map<number, any[]>();
                for (const r of responses) dict.set(r.outputOreId, r.items);
                (this as any)._formulaByOutputOre = dict;
              });
            } else {
              // Không có quặng loại 1, khởi tạo empty map
              (this as any)._formulaByOutputOre = new Map<number, any[]>();
            }
          }
        }
        });
    }

    // Subscribe to form changes để update mã/tên công thức real-time
    this.oreForm.controls.MaQuang.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateGeneratedFormulas();
      });

    this.oreForm.controls.TenQuang.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateGeneratedFormulas();
      });

    // Initialize với giá trị ban đầu
    this.updateGeneratedFormulas();
  }


  // Method để update generated formulas real-time
  private updateGeneratedFormulas() {
    const maQuang = this.oreForm.controls.MaQuang.value;
    const tenQuang = this.oreForm.controls.TenQuang.value;
    const planName = this.planName();
    
    // Update mã công thức khi có mã quặng
    if (maQuang) {
      this.maCongThucCtrl.setValue(`CTP-${maQuang}-${this.formatDateForCode()}`);
    } else {
      this.maCongThucCtrl.setValue('');
    }
    
    // Update tên công thức khi có tên quặng
    if (tenQuang && planName) {
      this.tenCongThucCtrl.setValue(`CTP - ${tenQuang} - ${planName} - ${this.formatDateForCode()}`);
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
      
      // Initialize Lò Cao controls after rows update
      if (this.milestone() === MilestoneEnum.LoCao) {
        this.initializeLocaoControls();
      }


      // Nếu milestone Thiêu Kết: tải công thức của các quặng loại 1 (quặng phối)
      if (this.milestone() === MilestoneEnum.ThieuKet) {
        const outputOreIds = list.filter(o => (o as any).loaiQuang === 1).map(o => o.id);
        if (outputOreIds.length > 0) {

          this.quangService.getFormulasByOutputOreIds(outputOreIds).subscribe((responses) => {
            // Lưu tạm vào map để bảng chi phí có thể render khi cần
            // key: outputOreId, value: items (quặng thành phần với giá và tỉ lệ)
            const dict = new Map<number, any[]>();
            for (const r of responses) dict.set(r.outputOreId, r.items);
            (this as any)._formulaByOutputOre = dict;
          });
        } else {
          // Không có quặng loại 1, khởi tạo empty map
          (this as any)._formulaByOutputOre = new Map<number, any[]>();
        }
      }
    });
  }

  getCostTableItems(): Array<{ id: number, ten: string; consumption: number; unitVnd: number; unitUsd: number; isParent: boolean; parentId?: number; }> {
    const out: Array<{ id: number, ten: string; consumption: number; unitVnd: number; unitUsd: number; isParent: boolean; parentId?: number; }> = [];
    const formulaMap: Map<number, any[]> | undefined = (this as any)._formulaByOutputOre;
    
    // Add ore items
    for (const r of this.rows()) {
      // Lấy trực tiếp giá trị từ cột "Tiêu hao" ThieuKet (dùng getThieuKetKhauHaoPercentage)
      const baseCons = this.getThieuKetKhauHaoPercentage(r);

      // Nếu r là quặng phối (loại 1) và có công thức: liệt kê từng thành phần

      const parts = formulaMap?.get(r.idQuang);
      
      if (parts?.length) {
        for (const p of parts) {
          const safeTyGia = this.getSafeTyGia();
          const pUnitVnd = p.gia_VND_1Tan ?? ((p.gia_USD_1Tan || 0) * (p.ty_Gia_USD_VND || safeTyGia || 0));
          const pUnitUsd = p.gia_USD_1Tan ?? ((p.gia_VND_1Tan || 0) / ((p.ty_Gia_USD_VND || safeTyGia || 0) || 1));
          const pRatio = p.ti_Le_PhanTram ?? 0;
          // Tính tiêu hao thành phần = tiêu hao quặng phối * (tỷ lệ thành phần / 100)
          const cons = baseCons * (pRatio / 100);
          // Tính đơn giá thành phần = đơn giá quặng thành phần * (tỷ lệ thành phần / 100)
          const unitPriceVnd = (pUnitVnd || 0) * (pRatio / 100);
          const unitPriceUsd = (pUnitUsd || 0) * (pRatio / 100);
          out.push({ 
            id: p.id,
            ten: p.ten_Quang, 
            consumption: Number(cons.toFixed(3)), 
            unitVnd: Number(unitPriceVnd.toFixed(2)),
            unitUsd: Number(unitPriceUsd.toFixed(2)),
            isParent: false,
            parentId: r.idQuang
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
          parentId: r.idQuang
        });
      } else {
        // Không có công thức -> chính nó, tính đơn giá theo tỷ lệ
        const ratio = r.ratioCtrl.value ?? 0;
        const totalRatio = this.totalRatio();
        const unitPriceVnd = totalRatio > 0 ? this.getUnitPriceVND(r) * (ratio / totalRatio) : 0;
        const unitPriceUsd = totalRatio > 0 ? this.getUnitPriceUSD(r) * (ratio / totalRatio) : 0;
        
        out.push({  
          id: r.idQuang,
          ten: r.tenQuang, 
          consumption: Number(baseCons.toFixed(3)), 
          unitVnd: Number(unitPriceVnd.toFixed(2)),
          unitUsd: Number(unitPriceUsd.toFixed(2)),
          isParent: false
        });
      }
    }
    return out;
  }

  totalRatio(): number {
    return this.rows().reduce((s, r) => s + (r.ratioCtrl.value ?? 0), 0);
  }

  // ===== Bảng chi phí - tính toán tổng =====
  otherCost: number = 0;
  otherCostGangLong: number = 0;
  recycleCostVnd: number = 0; // Chi phí cho dòng QUẶNG HỒI (nếu cần nhập)

  getTotalConsumption(): number {
    return this.getCostTableItems().reduce((sum, item) => sum + (item.consumption || 0), 0);
  }

  getTotalUnitPriceSum(): number {
    return this.getCostTableItems().reduce((sum, item) => sum + (item.unitVnd || 0), 0);
  }

  getTotalAllCosts(): number {
    return this.getTotalUnitPriceSum() + (this.otherCost || 0);
  }

  getTotalAllCostsUSD(): number {
    const totalUnitPriceUSD = this.getCostTableItems().reduce((sum, item) => sum + (item.unitUsd || 0), 0);
    const tyGia = this.getSafeTyGia();
    const otherCostUSD = tyGia > 0 ? (this.otherCost || 0) / tyGia : 0;
    return Number((totalUnitPriceUSD + otherCostUSD).toFixed(2));
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

  onOtherCostGangLongChange(): void {
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
    
    // Tổng bao gồm chi phí SX gang lỏng và có thể cộng chi phí quặng hồi nếu dùng nhập tay
    return Number((oreCost + this.otherCostLoCao + (this.recycleCostVnd || 0)).toFixed(2));
  }

  getTotalLoCaoCostUSD(): number {
    const oreCost = this.rows().reduce((sum, r) => {
      const consumption = this.getLoCaoConsumption(r);
      const unitPrice = this.getUnitPriceUSD(r);
      return sum + (consumption * (unitPrice || 0));
    }, 0);
    const tyGia = this.getSafeTyGia();
    const otherCostUSD = tyGia > 0 ? this.otherCostLoCao / tyGia : 0;
    const recycleUSD = tyGia > 0 ? (this.recycleCostVnd || 0) / tyGia : 0;
    return Number((oreCost + otherCostUSD + recycleUSD).toFixed(2));
  }

  // Lò cao: Chi phí sản xuất khác (nhập tay)
  otherCostLoCao: number = 0;
  onOtherCostLocaoChange(): void {
    // placeholder for future hooks (recalc totals, validations...)
  }

  // Save output ore prices to database (for all milestones)
  // private saveOutputOrePrices(): void {
  //   if (!this.data?.planId) return;

  //   let outputOreData: any;

  //   if (this.milestone() === MilestoneEnum.LoCao) {
  //     // Lò cao: Gang và Xỉ
  //     outputOreData = {
  //       gangPrice: {
  //         giaVND: this.getTotalLoCaoCost(),
  //         giaUSD: this.getTotalLoCaoCostUSD(),
  //         tyGia: this.rows()[0]?.tyGia ?? 1
  //       },
  //       xaPrice: {
  //         giaVND: 0, // Xỉ không có giá trị thương mại
  //         giaUSD: 0,
  //         tyGia: this.rows()[0]?.tyGia ?? 1
  //       }
  //     };
  //   } else if (this.milestone() === MilestoneEnum.ThieuKet) {
  //     // Thiêu kết: Quặng phối đầu ra
  //     outputOreData = {
  //       outputOrePrice: {
  //         giaVND: this.getTotalAllCosts(),
  //         giaUSD: this.getTotalAllCostsUSD(),
  //         tyGia: this.rows()[0]?.tyGia ?? 1
  //       }
  //     };
  //   } else {
  //     // Milestone khác: Tính theo tỷ lệ
  //     outputOreData = {
  //       outputOrePrice: {
  //         giaVND: this.getTotalCostByRatioVND(),
  //         giaUSD: this.getTotalCostByRatioVND() / (this.rows()[0]?.tyGia ?? 1),
  //         tyGia: this.rows()[0]?.tyGia ?? 1
  //       }
  //     };
  //   }
  // }

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
  private processParamsInfo = new Map<string, {id: number, code: string, iD_Quang_LienKet?: number, scope?: number, calcFormula?: string}>();
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
  onProcessParamsChange(inputDataList: Array<{id: number, code: string, value: number, iD_Quang_LienKet?: number, scope?: number, calcFormula?: string}>): void {
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
    

  // Debug method để xem dữ liệu quặng hiện tại
  
  // Kiểm tra xem KL vào lò có được tính toán từ locao-section hay không
  isLocaoKlVaoLoCalculated(row: RatioRow): boolean {
    // TODO: Implement logic kiểm tra xem quặng này có param nào được link từ locao-section không
    // Tạm thời return false để hiển thị input field
    return false;
  }

  // Lấy giá trị KL vào lò (từ calculation hoặc từ input)
  getLocaoKlVaoLoValue(row: RatioRow): number {
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
    const controlsMap = new Map<number, {klVaoLo: FormControl<number | null>, tyLeHoiQuang: FormControl<number | null>, klNhan: FormControl<number | null>}>();
    
    for (const row of this.rows()) {
      // FormControls are now always initialized in RatioRow creation
      // Just add subscriptions and store in controlsMap
      const klVaoLoControl = row.klVaoLoCtrl;
      const tyLeHoiQuangControl = row.tyLeHoiQuangCtrl;
      const klNhanControl = row.klNhanCtrl;
      
      // Set tyLeHoiQuang to 0 for loaiQuang = 3 (disabled input)
      if (row.loaiQuang === 3) {
        tyLeHoiQuangControl.setValue(0, { emitEvent: false });
      }
      
      // Calculate initial klNhan value before render
      const initialKlNhan = this.calculateKlNhan(row);
      klNhanControl.setValue(initialKlNhan, { emitEvent: false });
      
      // Add value changes watchers for KL vào lò
      klVaoLoControl.valueChanges.subscribe(value => {
        this.onLocaoControlValueChange(row.idQuang, 'klVaoLo', value);
        
        // Recalculate klNhan when klVaoLo changes
        const newKlNhan = this.calculateKlNhan(row);
        klNhanControl.setValue(newKlNhan, { emitEvent: true });
      });
      
      // Add value changes watchers for Tỷ lệ hồi quặng
      tyLeHoiQuangControl.valueChanges.subscribe(value => {
        this.onLocaoControlValueChange(row.idQuang, 'tyLeHoiQuang', value);
        
        // Recalculate klNhan when tyLeHoiQuang changes
        const newKlNhan = this.calculateKlNhan(row);
        klNhanControl.setValue(newKlNhan, { emitEvent: true });
      });
      
      // Add value changes watchers for KL nhận
      klNhanControl.valueChanges.subscribe(value => {
        this.onLocaoControlValueChange(row.idQuang, 'klNhan', value);
        
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

  private onLocaoControlValueChange(quangId: number, field: string, value: number | null): void {
    // Find ore by ID to get ore code/name
    const ore = this.rows().find(r => r.idQuang === quangId);
    if (!ore || value === null) return;

    // Update corresponding process params in locao-section based on linked ore ID
    // This is now handled by the new architecture where locao-section emits data
    // and mix-quang-dialog handles all calculations internally

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
        // Milestone-specific mapping
        ...(this.milestone() === MilestoneEnum.ThieuKet ? {
          Khau_Hao: this.getThieuKetKhauHaoValue(r),
          Ti_Le_KhaoHao: this.getThieuKetKhauHaoPercentage(r),
        } : {}),
        ...(this.milestone() === MilestoneEnum.LoCao ? {
          KL_VaoLo: r.klVaoLoCtrl?.value ?? null,
          Ti_Le_HoiQuang: r.tyLeHoiQuangCtrl?.value ?? null,
          KL_Nhan: r.klNhanCtrl?.value ?? null,
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
        Loai_Quang: 1, // Tron
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
          this.snack.open(msg, 'Đóng', { duration: 1500, panelClass: ['snack-success']  });
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
        // Milestone-specific mapping
        ...(this.milestone() === MilestoneEnum.ThieuKet ? {
          Khau_Hao: this.getThieuKetKhauHaoValue(r),
          Ti_Le_KhaoHao: this.getThieuKetKhauHaoPercentage(r),
        } : {}),
        ...(this.milestone() === MilestoneEnum.LoCao ? {
          KL_VaoLo: r.klVaoLoCtrl?.value ?? null,
          Ti_Le_HoiQuang: r.tyLeHoiQuangCtrl?.value ?? null,
          KL_Nhan: r.klNhanCtrl?.value ?? null,
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
        Loai_Quang: 1, // Tron
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
        Tieuhao: null,
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
        Tieuhao: null,
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

  // KL vào lò reactive mapping removed per request

  // ===== Bảng tiêu hao thành phần theo Thiêu Kết =====
  // Tiêu hao thành phần = (Tổng tiêu hao Thiêu Kết) * (tỷ lệ quặng thành phần / tổng tỷ lệ)
  getTotalThieuKetConsumption(): number {
    return Number(this.getTotalThieuKetKhauHao().toFixed(3));
  }

  getComponentConsumptionFromTarget(row: RatioRow): number {
    const totalRatio = this.totalRatio();
    if (totalRatio === 0) return 0;
    const ratio = row.ratioCtrl.value ?? 0;
    const totalCons = this.getTotalThieuKetKhauHao();
    const cons = totalCons * (ratio / totalRatio);
    return Number(cons.toFixed(3));
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

      // Initialize milestone-specific FormControls
      const klVaoLoCtrl = prevRow?.klVaoLoCtrl || new FormControl<number | null>(0);
      const tyLeHoiQuangCtrl = prevRow?.tyLeHoiQuangCtrl || new FormControl<number | null>(o.loaiQuang === 3 ? 0 : 0);
      const klNhanCtrl = prevRow?.klNhanCtrl || new FormControl<number | null>(0);
      const khauHaoCtrl = prevRow?.khauHaoCtrl || new FormControl<number | null>(0);
      const percentageCtrl = prevRow?.percentageCtrl || new FormControl<number | null>(0);

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
    
    // Initialize Lò Cao controls if needed
    if (this.milestone() === MilestoneEnum.LoCao) {
      this.initializeLocaoControls();
    }
  }

  // Method to calculate thieuKetKhauHao column for a specific row
  getThieuKetKhauHaoValue(row: RatioRow): number {
    const ratio = row.ratioCtrl.value ?? 0;
    
    // Tìm MKN value từ các thành phần hóa học
    let mknValue = 0;
    const mknChem = this.selectedChems().find(c => c.ma_TPHH === 'MKN');
    if (mknChem) {
      const mknCtrl = row.chems.get(mknChem.id);
      mknValue = mknCtrl?.value ?? 0;
    }
    
    // Công thức: tỷ lệ * (1 - MKN / 100)
    const result = ratio * (1 - mknValue / 100);
    return result;
  }

  // Method to get total thieuKetKhauHao value
  getTotalThieuKetKhauHao(): number {
    return this.rows().reduce((sum, row) => sum + this.getThieuKetKhauHaoValue(row), 0);
  }

  // Method to calculate percentage for each ore
  // Yêu cầu: lấy tỷ lệ nhập vào / tổng tỷ lệ (không dùng giá trị khấu hao)
  getThieuKetKhauHaoPercentage(row: RatioRow): number {
    const total = this.getTotalThieuKetKhauHao();

    const ratio = row.ratioCtrl.value ?? 0;
    return ratio / total;
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

  // Method to get ore data for calculation in thieu-ket-khau-hao component
  getOreDataForCalculation(): OreData[] {
    return this.rows().map(row => {
      // Lấy tỷ lệ từ form control
      const ratio = row.ratioCtrl.value ?? 0;
      
      // Tìm MKN value từ các thành phần hóa học
      let mknValue = 0;
      const mknChem = this.selectedChems().find(c => c.ma_TPHH === 'MKN');
      if (mknChem) {
        const mknCtrl = row.chems.get(mknChem.id);
        mknValue = mknCtrl?.value ?? 0;
      }
      
      return {
        id: row.idQuang,
        name: row.tenQuang,
        ratio: ratio,
        mkn: mknValue
      };
    });
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

  // Save Gang and Xỉ data to Quang_TP_PhanTich
  private saveGangAndXaData(): void {
    // Get current Gang and Xỉ data from locao-result component (with real TPHH IDs from API)
    const gangData = this.locaoResult?.gangData || [];
    const xaData = this.locaoResult?.xiData || [];
    
    if (!this.data?.planId) return;
    
    // Get gang and slag result IDs from plan
    this.quangService.getGangAndSlagChemistryByPlan(this.data.planId).subscribe({
      next: (result) => {
        // Save Gang data using new API
        if (gangData.length > 0 && result.gang) {
          const gangPayload = {
            id: result.gang.quang.id,
            ma_Quang: result.gang.quang.ma_Quang,
            ten_Quang: result.gang.quang.ten_Quang,
            loai_Quang: 2 as const, // Gang
            thanhPhanHoaHoc: gangData.map((item: any, idx: number) => ({
              ID_TPHH: item.tphhId || 0, // Use real TPHH ID from API data
              Gia_Tri_PhanTram: item.percentage || 0,
              ThuTuTPHH: idx + 1,
              KhoiLuong: item.mass || 0,
              CalcFormula: item.calcFormula || null,
              IsCalculated: item.isCalculated || false
            })),
            id_PhuongAn: this.data!.planId!, // Required for result ore mapping
            dang_Hoat_Dong: true,
            ghi_Chu: null,
            id_Quang_Gang: result.gang.quang.id_Quang_Gang ?? null
          };

          console.log('gangPayload', gangPayload);
          
          this.quangService.upsertKetQuaWithThanhPhan(gangPayload).subscribe({
            next: () => {},
            error: (err) => console.error('Failed to save Gang data:', err)
          });
        }
        
        // Save Xỉ data using new API
        if (xaData.length > 0 && result.slag) {
          const xaPayload = {
            id: result.slag.quang.id,
            ma_Quang: result.slag.quang.ma_Quang,
            ten_Quang: result.slag.quang.ten_Quang,
            loai_Quang: 4 as const, // Xỉ
            thanhPhanHoaHoc: xaData.map((item: any, idx: number) => ({
              ID_TPHH: item.tphhId || 0, // Use real TPHH ID from API data
              Gia_Tri_PhanTram: item.percentage || 0,
              ThuTuTPHH: idx + 1,
              KhoiLuong: item.mass || 0,
              CalcFormula: item.calcFormula || null,
              IsCalculated: item.isCalculated || false
            })),
            id_PhuongAn: this.data!.planId!, // Required for result ore mapping
            dang_Hoat_Dong: true,
            ghi_Chu: null,
            id_Quang_Gang: result.slag.quang.id_Quang_Gang ?? null
          };
          
          this.quangService.upsertKetQuaWithThanhPhan(xaPayload).subscribe({
            next: () => {},
            error: (err) => console.error('Failed to save Xỉ data:', err)
          });
        }
      },
      error: (err) => console.error('Failed to get gang/slag result IDs:', err)
    });
  }
}
