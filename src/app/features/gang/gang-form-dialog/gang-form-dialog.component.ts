import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  QuangUpsertWithThanhPhanDto,
  QuangThanhPhanHoaHocDto,
  QuangKetQuaUpsertDto,
  ProcessParamTemplateItem,
  ThongKeTemplateItem,
  GangTemplateConfigResponse,
  GangTemplateConfigUpsertDto,
  GangDichConfigDetailResponse,
  GangDichConfigUpsertDto,
  QuangDetailResponse
} from '../../../core/models/quang.model';
import { LoaiQuangEnum } from '../../../core/enums/loaiquang.enum';
import { QuangService } from '../../../core/services/quang.service';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectTphhDialogComponent } from '../../mix-quang-dialog/select-tphh-dialog/select-tphh-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { FormulaCalculatorComponent } from '../../locao-process-param/formula-calculator/formula-calculator.component';
import { FormulaCalculatorData, FormulaCalculatorResult, FormulaParam, FormulaCalculatorContext } from '../../../core/models/formula-calculator.model';
import { ThanhPhanHoaHocService } from '../../../core/services/tphh.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { LoCaoProcessParamService } from '../../../core/services/locao-process-param.service';
import { ThongKeFunctionService } from '../../../core/services/thongke-function.service';
import { SelectProcessParamDialogComponent } from '../../../shared/components/select-process-param-dialog/select-process-param-dialog.component';
import { PlanResultsComponent } from '../../thongke-function/plan-results/plan-results.component';
import { PhuongAnPhoiService } from '../../../core/services/phuong-an-phoi.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-gang-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
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
  private locaoProcessParamService = inject(LoCaoProcessParamService);
  private thongKeFunctionService = inject(ThongKeFunctionService);
  private paService = inject(PhuongAnPhoiService);
  
  // Expose enum for template
  readonly LoaiQuangEnum = LoaiQuangEnum;

  form = this.fb.group({
    maGang: ['', [Validators.required, Validators.maxLength(50)]],
    tenGang: ['', [Validators.required, Validators.maxLength(200)]],
    ghiChu: ['' as string | null],
  });

  selectedChems = signal<{ id: number; ma_TPHH: string; ten_TPHH?: string }[]>([]);
  tp_HoaHocs = signal(new Map<number, {
    phanTram: FormControl<number | null>;
    calcFormula?: string;
    displayFormula?: string;
    isCalculated?: boolean;
    khoiLuong?: number | null;
  }>());

  useTemplate = signal(false);
  templateLoading = signal(false);
  templatePreview = signal<GangTemplateConfigResponse | null>(null);
  templateError = signal<string | null>(null);

  availableProcessParams = signal<ProcessParamTemplateItem[]>([]);
  availableThongKes = signal<ThongKeTemplateItem[]>([]);
  selectedProcessParams = signal<ProcessParamTemplateItem[]>([]);
  selectedThongKes = signal<ThongKeTemplateItem[]>([]);

  // Track configuration status for each section
  hasGangConfig = signal(false);
  hasSlagConfig = signal(false);
  hasProcessParamConfig = signal(false);
  hasThongKeConfig = signal(false);

  // Slag configuration (similar to gang)
  selectedSlagChems = signal<{ id: number; ma_TPHH: string; ten_TPHH?: string }[]>([]);
  slagTP_HoaHocs = signal(new Map<number, {
    phanTram: FormControl<number | null>;
    calcFormula?: string;
    displayFormula?: string;
    isCalculated?: boolean;
    khoiLuong?: number | null;
  }>());
  existingSlagId = signal<number | null>(null); // Lưu ID xỉ hiện có nếu đang edit

  // Snapshot để lưu cấu hình ban đầu khi edit gang (để restore khi tắt toggle)
  private originalConfigSnapshot: {
    selectedChems: { id: number; ma_TPHH: string; ten_TPHH?: string }[];
    chemControls: Array<{
      id: number;
      phanTram: number | null;
      calcFormula?: string;
      displayFormula?: string;
      isCalculated?: boolean;
      khoiLuong?: number | null;
    }>;
    selectedSlagChems: { id: number; ma_TPHH: string; ten_TPHH?: string }[];
    slagChemControls: Array<{
      id: number;
      phanTram: number | null;
      calcFormula?: string;
      displayFormula?: string;
      isCalculated?: boolean;
      khoiLuong?: number | null;
    }>;
    processParams: ProcessParamTemplateItem[];
    thongKes: ThongKeTemplateItem[];
    existingSlagId: number | null;
  } | null = null;

  private manualSnapshot: {
    selectedChems: { id: number; ma_TPHH: string; ten_TPHH?: string }[];
    chemControls: Array<{
      id: number;
      phanTram: number | null;
      calcFormula?: string;
      displayFormula?: string;
      isCalculated?: boolean;
      khoiLuong?: number | null;
    }>;
    processParams: ProcessParamTemplateItem[];
    thongKes: ThongKeTemplateItem[];
  } | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number | null; loaiQuang?: number | null; idQuangGang?: number | null; planId?: number | null; cloneFromId?: number | null; cloneWithPlans?: boolean },
    private ref: MatDialogRef<GangFormDialogComponent, any>
  ) { }

  ngOnInit(): void {
    this.loadReferenceData();

    // Reset existingSlagId khi tạo mới (không phải edit)
    if (!this.data?.id) {
      this.existingSlagId.set(null);
    }

    // Tự động tạo mã gang từ tên gang (luôn luôn, cả khi thêm mới và edit)
    this.form.controls.tenGang.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((tenGang) => {
        if (tenGang) {
          const maGangSlug = this.toSlugNoDash(tenGang);
          if (maGangSlug) {
            this.form.controls.maGang.setValue(maGangSlug, { emitEvent: false });
          }
        }
      });

    if (this.data && this.data.id) {
      if (this.isGangTarget()) {
        this.loadGangDichDetail(this.data.id);
      } else {
        this.loadQuangDetail(this.data.id);
      }
    } else if (this.data && this.data.cloneFromId) {
      // Clone mode: load template config from source gang and auto-enable template mode
      this.useTemplate.set(true);
      this.loadTemplateFromGang(this.data.cloneFromId);
      // Reset existingSlagId khi clone để tạo xỉ mới
      this.existingSlagId.set(null);
    }
  }

  // Helper: Convert string to slug không có dấu gạch ngang (viết liền)
  private toSlugNoDash(input: string | null | undefined): string {
    if (!input) return '';
    
    // Remove Vietnamese accents and convert to lowercase
    const normalized = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Replace spaces and special chars, remove all non-alphanumeric, viết liền
    const slug = normalized
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '') // Loại bỏ tất cả ký tự không phải chữ và số, viết liền
      .replace(/^-+|-+$/g, '');
    return slug;
  }

  private loadGangDichDetail(gangId: number) {
    this.quangService.getGangDichDetailWithConfig(gangId).subscribe({
      next: (detail) => {
        if (!detail) return;
        this.applyGangDetail(detail.gang);
        this.applySlagDetail(detail.slag);
        this.setProcessParamConfig(detail.processParams);
        this.setThongKeConfig(detail.thongKes);
        // Đảm bảo snapshot được lưu sau khi tất cả config đã được apply
        this.saveOriginalConfigSnapshot();
      },
      error: () => {
        this.snack.open('Không thể tải thông tin gang đích', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      }
    });
  }

  private loadQuangDetail(id: number) {
    this.quangService.getById(id).subscribe({
      next: (detail) => {
        if (!detail) return;
        this.applyGangDetail(detail);
      },
      error: () => {
        this.snack.open('Không thể tải thông tin quặng', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      }
    });
  }

  private applyGangDetail(detail: QuangDetailResponse) {
    if (!detail?.quang) {
      return;
    }
    // Không patch maGang trực tiếp, để valueChanges tự động generate từ tenGang
    this.form.patchValue({
      tenGang: detail.quang.ten_Quang,
      ghiChu: detail.quang.ghi_Chu ?? null,
    });
    // Manually trigger maGang update sau khi tenGang được patched
    if (detail.quang.ten_Quang) {
      this.form.controls.maGang.setValue(this.toSlugNoDash(detail.quang.ten_Quang), { emitEvent: false });
    }

    const chems = (detail.tP_HoaHocs || []).map(c => ({ id: c.id, ma_TPHH: c.ma_TPHH, ten_TPHH: c.ten_TPHH || undefined }));
    this.selectedChems.set(chems);
    this.hasGangConfig.set(chems.length > 0);

    const map = new Map<number, {
      phanTram: FormControl<number | null>;
      calcFormula?: string;
      displayFormula?: string;
      isCalculated?: boolean;
      khoiLuong?: number | null;
    }>();
    for (const c of detail.tP_HoaHocs || []) {
      map.set(c.id, {
        phanTram: new FormControl<number | null>(c.phanTram ?? 0),
        calcFormula: c.calcFormula || undefined,
        displayFormula: undefined,
        isCalculated: c.isCalculated || false,
        khoiLuong: null
      });
    }
    this.tp_HoaHocs.set(map);

    // Lưu snapshot cấu hình ban đầu khi edit gang (để restore khi tắt toggle)
    this.saveOriginalConfigSnapshot();
  }

  private applySlagDetail(detail: QuangDetailResponse | null) {
    if (!detail || !detail.quang) {
      this.selectedSlagChems.set([]);
      this.slagTP_HoaHocs.set(new Map());
      this.hasSlagConfig.set(false);
      this.existingSlagId.set(null);
      return;
    }

    this.existingSlagId.set(detail.quang.id);
    const slagChems = (detail.tP_HoaHocs || []).map(c => ({
      id: c.id,
      ma_TPHH: c.ma_TPHH,
      ten_TPHH: c.ten_TPHH || undefined,
    }));
    this.selectedSlagChems.set(slagChems);
    this.hasSlagConfig.set(slagChems.length > 0);

    const slagMap = new Map<number, {
      phanTram: FormControl<number | null>;
      calcFormula?: string;
      displayFormula?: string;
      isCalculated?: boolean;
      khoiLuong?: number | null;
    }>();
    for (const c of detail.tP_HoaHocs || []) {
      slagMap.set(c.id, {
        phanTram: new FormControl<number | null>(c.phanTram ?? 0),
        calcFormula: c.calcFormula || undefined,
        displayFormula: undefined,
        isCalculated: c.isCalculated || false,
        khoiLuong: null,
      });
    }
    this.slagTP_HoaHocs.set(slagMap);

    // Cập nhật snapshot nếu đã có (khi applySlagDetail được gọi sau applyGangDetail)
    if (this.originalConfigSnapshot) {
      this.saveOriginalConfigSnapshot();
    }
  }

  private setProcessParamConfig(items: ProcessParamTemplateItem[]) {
    this.selectedProcessParams.set(items.map(p => ({ ...p })));
    this.hasProcessParamConfig.set(items.length > 0);
    
    // Cập nhật snapshot nếu đang edit
    if (this.data?.id && this.originalConfigSnapshot) {
      this.saveOriginalConfigSnapshot();
    }
  }

  private setThongKeConfig(items: ThongKeTemplateItem[]) {
    this.selectedThongKes.set(items.map(t => ({ ...t })));
    this.hasThongKeConfig.set(items.length > 0);
    
    // Cập nhật snapshot nếu đang edit
    if (this.data?.id && this.originalConfigSnapshot) {
      this.saveOriginalConfigSnapshot();
    }
  }

  private saveOriginalConfigSnapshot() {
    // Chỉ lưu snapshot khi đang edit gang (có data.id)
    if (!this.data?.id) {
      return;
    }

    this.originalConfigSnapshot = {
      selectedChems: this.selectedChems().map(c => ({ ...c })),
      chemControls: Array.from(this.tp_HoaHocs()).map(([id, ctrl]) => ({
        id,
        phanTram: ctrl.phanTram.value,
        calcFormula: ctrl.calcFormula,
        displayFormula: ctrl.displayFormula,
        isCalculated: ctrl.isCalculated,
        khoiLuong: ctrl.khoiLuong ?? null,
      })),
      selectedSlagChems: this.selectedSlagChems().map(c => ({ ...c })),
      slagChemControls: Array.from(this.slagTP_HoaHocs()).map(([id, ctrl]) => ({
        id,
        phanTram: ctrl.phanTram.value,
        calcFormula: ctrl.calcFormula,
        displayFormula: ctrl.displayFormula,
        isCalculated: ctrl.isCalculated,
        khoiLuong: ctrl.khoiLuong ?? null,
      })),
      processParams: this.selectedProcessParams().map(item => ({ ...item })),
      thongKes: this.selectedThongKes().map(item => ({ ...item })),
      existingSlagId: this.existingSlagId(),
    };
  }

  private restoreOriginalConfigSnapshot() {
    if (!this.originalConfigSnapshot) {
      return;
    }

    // Restore gang config
    this.selectedChems.set(this.originalConfigSnapshot.selectedChems.map(c => ({ ...c })));
    const gangMap = new Map<number, {
      phanTram: FormControl<number | null>;
      calcFormula?: string;
      displayFormula?: string;
      isCalculated?: boolean;
      khoiLuong?: number | null;
    }>();
    for (const ctrl of this.originalConfigSnapshot.chemControls) {
      gangMap.set(ctrl.id, {
        phanTram: new FormControl<number | null>(ctrl.phanTram),
        calcFormula: ctrl.calcFormula,
        displayFormula: ctrl.displayFormula,
        isCalculated: ctrl.isCalculated,
        khoiLuong: ctrl.khoiLuong,
      });
    }
    this.tp_HoaHocs.set(gangMap);
    this.hasGangConfig.set(this.originalConfigSnapshot.selectedChems.length > 0);

    // Restore slag config
    this.selectedSlagChems.set(this.originalConfigSnapshot.selectedSlagChems.map(c => ({ ...c })));
    const slagMap = new Map<number, {
      phanTram: FormControl<number | null>;
      calcFormula?: string;
      displayFormula?: string;
      isCalculated?: boolean;
      khoiLuong?: number | null;
    }>();
    for (const ctrl of this.originalConfigSnapshot.slagChemControls) {
      slagMap.set(ctrl.id, {
        phanTram: new FormControl<number | null>(ctrl.phanTram),
        calcFormula: ctrl.calcFormula,
        displayFormula: ctrl.displayFormula,
        isCalculated: ctrl.isCalculated,
        khoiLuong: ctrl.khoiLuong,
      });
    }
    this.slagTP_HoaHocs.set(slagMap);
    this.hasSlagConfig.set(this.originalConfigSnapshot.selectedSlagChems.length > 0);
    this.existingSlagId.set(this.originalConfigSnapshot.existingSlagId);

    // Restore process params config
    this.selectedProcessParams.set(this.originalConfigSnapshot.processParams.map(item => ({ ...item })));
    this.hasProcessParamConfig.set(this.originalConfigSnapshot.processParams.length > 0);

    // Restore thong ke config
    this.selectedThongKes.set(this.originalConfigSnapshot.thongKes.map(item => ({ ...item })));
    this.hasThongKeConfig.set(this.originalConfigSnapshot.thongKes.length > 0);
  }

  private loadTemplateFromGang(gangId: number) {
    this.templateLoading.set(true);
    this.templateError.set(null);

    this.quangService.getGangTemplateConfig(gangId).subscribe({
      next: (template) => {
        this.templateLoading.set(false);
        if (!template) {
          this.templateError.set('Không tìm thấy cấu hình template từ gang này');
          return;
        }
        this.applyTemplateClone(template);
      },
      error: (err) => {
        this.templateLoading.set(false);
        this.templateError.set('Không thể tải cấu hình template: ' + (err.message || 'Lỗi không xác định'));
      }
    });
  }

  private loadReferenceData() {
    this.locaoProcessParamService.getAll().subscribe({
      next: list => {
        const mapped = (list ?? []).map(item => ({
          id: item.id,
          code: item.code,
          ten: item.ten,
          donVi: item.donVi ?? '',
          thuTu: item.thuTu ?? 0
        }));
        this.availableProcessParams.set(mapped);
      },
      error: () => this.snack.open('Không tải được danh sách tham số lò cao', 'Đóng', { duration: 2000, panelClass: ['snack-error'] })
    });

    this.thongKeFunctionService.getAllFunctions().subscribe({
      next: list => {
        const mapped = (list ?? []).map(item => ({
          id: item.id,
          code: item.code,
          ten: item.ten,
          donVi: item.donVi ?? '',
          thuTu: 0
        }));
        this.availableThongKes.set(mapped);
      },
      error: () => this.snack.open('Không tải được danh sách thống kê', 'Đóng', { duration: 2000, panelClass: ['snack-error'] })
    });
  }

  onTemplateToggle(checked: boolean) {
    if (checked) {
      this.enableTemplateClone();
    } else {
      this.disableTemplateClone();
    }
  }

  reloadTemplate() {
    if (!this.useTemplate()) return;
    this.enableTemplateClone(true);
  }

  private enableTemplateClone(forceReload = false) {
    if (!this.isGangTarget()) {
      this.snack.open('Clone template chỉ áp dụng cho gang đích', 'Đóng', { duration: 2000, panelClass: ['snack-warning'] });
      this.useTemplate.set(false);
      return;
    }

    // Reset tất cả cấu hình trước khi clone để đảm bảo bắt đầu từ trạng thái sạch
    this.resetAllConfigurations();

    this.useTemplate.set(true);
    this.templatePreview.set(null);
    this.templateError.set(null);
    this.templateLoading.set(true);

    // Gọi API clone template
    const gangId = this.data?.id ?? null;
    this.quangService.getGangTemplateConfig(forceReload ? (gangId ?? null) : gangId ?? null).subscribe({
      next: template => {
        this.templateLoading.set(false);
        if (!template) {
          this.templateError.set('Không tìm thấy template gang đích gần nhất.');
          this.snack.open('Không tìm thấy template gang đích gần nhất', 'Đóng', { duration: 2000, panelClass: ['snack-warning'] });
          this.disableTemplateClone(true);
          return;
        }
        this.applyTemplateClone(template);
      },
      error: () => {
        this.templateLoading.set(false);
        this.snack.open('Tải template thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
        this.disableTemplateClone(true);
      }
    });
  }

  private disableTemplateClone(silent = false) {
    this.useTemplate.set(false);
    this.templatePreview.set(null);
    this.templateError.set(null);

    // Nếu đang edit gang (có data.id), restore lại cấu hình ban đầu
    // Nếu tạo mới, reset về trống
    if (this.data?.id && this.originalConfigSnapshot) {
      this.restoreOriginalConfigSnapshot();
      if (!silent) {
        this.snack.open('Đã khôi phục cấu hình ban đầu của gang', 'Đóng', { duration: 2000, panelClass: ['snack-info'] });
      }
    } else {
      // Reset tất cả cấu hình về trạng thái ban đầu (như lúc mới mở popup)
      this.resetAllConfigurations();
      if (!silent) {
        this.snack.open('Đã chuyển sang chế độ thiết lập thủ công. Tất cả cấu hình đã được reset.', 'Đóng', { duration: 2000, panelClass: ['snack-info'] });
      }
    }

    this.manualSnapshot = null;
  }

  private resetAllConfigurations() {
    // Reset gang config
    this.selectedChems.set([]);
    this.tp_HoaHocs.set(new Map());
    this.hasGangConfig.set(false);

    // Reset slag config
    this.selectedSlagChems.set([]);
    this.slagTP_HoaHocs.set(new Map());
    this.hasSlagConfig.set(false);
    this.existingSlagId.set(null);

    // Reset process params config
    this.selectedProcessParams.set([]);
    this.hasProcessParamConfig.set(false);

    // Reset thong ke config
    this.selectedThongKes.set([]);
    this.hasThongKeConfig.set(false);
  }

  private snapshotManualState() {
    this.manualSnapshot = {
      selectedChems: this.selectedChems().map(c => ({ ...c })),
      chemControls: Array.from(this.tp_HoaHocs()).map(([id, ctrl]) => ({
        id,
        phanTram: ctrl.phanTram.value,
        calcFormula: ctrl.calcFormula,
        displayFormula: ctrl.displayFormula,
        isCalculated: ctrl.isCalculated,
        khoiLuong: ctrl.khoiLuong ?? null,
      })),
      processParams: this.selectedProcessParams().map(item => ({ ...item })),
      thongKes: this.selectedThongKes().map(item => ({ ...item }))
    };
  }

  private clearTemplateSelections() {
    // Method này không còn được dùng, đã thay bằng resetAllConfigurations
    this.resetAllConfigurations();
  }

  private applyTemplateClone(template: GangTemplateConfigResponse) {
    this.templatePreview.set(template);

    // Gang config
    const chems = template.gangTPHHs.map(c => ({
      id: c.id,
      ma_TPHH: c.ma_TPHH,
      ten_TPHH: c.ten_TPHH || undefined,
    }));
    this.selectedChems.set(chems);

    const chemMap = new Map<number, {
      phanTram: FormControl<number | null>;
      calcFormula?: string;
      displayFormula?: string;
      isCalculated?: boolean;
      khoiLuong?: number | null;
    }>();
    // Chỉ clone thành phần hóa học và công thức, giá trị để 0 vì mỗi phương án sẽ có giá trị khác nhau
    for (const c of template.gangTPHHs) {
      chemMap.set(c.id, {
        phanTram: new FormControl<number | null>(0), // Giá trị để 0, không clone giá trị từ template
        calcFormula: c.calcFormula || undefined, // Clone công thức tính
        displayFormula: undefined,
        isCalculated: c.isCalculated || false,
        khoiLuong: null,
      });
    }
    this.tp_HoaHocs.set(chemMap);
    this.hasGangConfig.set(template.gangTPHHs.length > 0);

    // Slag config - chỉ clone thành phần và công thức, giá trị để 0
    if (template.slag && template.slagTPHHs.length > 0) {
      this.existingSlagId.set(null); // Reset khi clone template, sẽ tạo mới
      const slagChems = template.slagTPHHs.map(c => ({
        id: c.id,
        ma_TPHH: c.ma_TPHH,
        ten_TPHH: c.ten_TPHH || undefined,
      }));
      this.selectedSlagChems.set(slagChems);

      const slagChemMap = new Map<number, {
        phanTram: FormControl<number | null>;
        calcFormula?: string;
        displayFormula?: string;
        isCalculated?: boolean;
        khoiLuong?: number | null;
      }>();
      // Chỉ clone thành phần hóa học và công thức, giá trị để 0 vì mỗi phương án sẽ có giá trị khác nhau
      for (const c of template.slagTPHHs) {
        slagChemMap.set(c.id, {
          phanTram: new FormControl<number | null>(0), // Giá trị để 0, không clone giá trị từ template
          calcFormula: c.calcFormula || undefined, // Clone công thức tính
          displayFormula: undefined,
          isCalculated: c.isCalculated || false,
          khoiLuong: null,
        });
      }
      this.slagTP_HoaHocs.set(slagChemMap);
      this.hasSlagConfig.set(true);
    } else {
      this.hasSlagConfig.set(false);
    }

    // Process params config
    this.selectedProcessParams.set(template.processParams.map(p => ({ ...p })));
    this.hasProcessParamConfig.set(template.processParams.length > 0);

    // Thong ke config
    this.selectedThongKes.set(template.thongKes.map(t => ({ ...t })));
    this.hasThongKeConfig.set(template.thongKes.length > 0);

    this.snack.open('Đã clone template cấu hình gang gần nhất', 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
  }

  onSave() {
    // Validate form
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Vui lòng điền đầy đủ thông tin bắt buộc', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      return;
    }

    // Validate cho gang đích (tạo mới hoặc chỉnh sửa)
    if (this.isGangTargetMode) {
      if (!this.validateGangDichConfig()) {
        return;
      }
    }

    const thanhPhanHoaHoc: QuangThanhPhanHoaHocDto[] = this.selectedChems().map((c, idx) => ({
      ID_TPHH: c.id,
      Gia_Tri_PhanTram: this.tp_HoaHocs().get(c.id)?.phanTram.value ?? 0,
      ThuTuTPHH: idx + 1,
      KhoiLuong: this.tp_HoaHocs().get(c.id)?.khoiLuong ?? null,
      CalcFormula: this.tp_HoaHocs().get(c.id)?.calcFormula ?? null,
      IsCalculated: this.tp_HoaHocs().get(c.id)?.isCalculated ?? false,
    }));

    const saveAsTemplate = this.shouldSaveAsTemplate();
    const templateConfig = saveAsTemplate ? this.buildTemplateConfig() : null;

    if (saveAsTemplate && !this.validateTemplateData(templateConfig)) {
      return;
    }

    // Xử lý theo từng trường hợp
    if (this.data?.planId) {
      this.saveKetQua(thanhPhanHoaHoc);
    } else if (this.data?.loaiQuang === LoaiQuangEnum.Xi) {
      this.saveSlag(thanhPhanHoaHoc);
    } else {
      this.saveGangDich(thanhPhanHoaHoc, saveAsTemplate, templateConfig);
    }
  }

  private saveKetQua(thanhPhanHoaHoc: QuangThanhPhanHoaHocDto[]) {
    const ketQuaDto: QuangKetQuaUpsertDto = {
      id: this.data?.id ?? null,
      ma_Quang: this.form.controls.maGang.value!,
      ten_Quang: this.form.controls.tenGang.value!,
      id_LoaiQuang: this.data?.loaiQuang === LoaiQuangEnum.Xi ? LoaiQuangEnum.Xi : LoaiQuangEnum.Gang,
      thanhPhanHoaHoc,
      id_PhuongAn: this.data!.planId!,
      dang_Hoat_Dong: true,
      ghi_Chu: this.form.controls.ghiChu.value ?? null,
      id_Quang_Gang: this.data?.idQuangGang ?? null,
    };

    this.quangService.upsertKetQuaWithThanhPhan(ketQuaDto).subscribe({
      next: (res) => {
        if (res?.success && res.data?.id) {
          const message = this.data?.loaiQuang === LoaiQuangEnum.Xi
            ? (this.data?.id ? 'Cập nhật xỉ kết quả thành công' : 'Thêm xỉ kết quả thành công')
            : (this.data?.id ? 'Cập nhật gang kết quả thành công' : 'Thêm gang kết quả thành công');
          this.snack.open(message, 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
          this.ref.close(res.data.id);
        } else {
          this.snack.open('Lưu kết quả thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
        }
      },
      error: () => this.snack.open('Lưu kết quả thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] }),
    });
  }

  private saveSlag(thanhPhanHoaHoc: QuangThanhPhanHoaHocDto[]) {
    const slagDto: QuangUpsertWithThanhPhanDto = {
      id: this.data?.id ?? null,
      ma_Quang: this.form.controls.maGang.value!,
      ten_Quang: this.form.controls.tenGang.value!,
      id_LoaiQuang: LoaiQuangEnum.Xi,
      dang_Hoat_Dong: true,
      ghi_Chu: this.form.controls.ghiChu.value ?? null,
      thanhPhanHoaHoc,
      gia: null,
      id_Quang_Gang: this.data?.idQuangGang ?? null,
      saveAsTemplate: false,
      templateConfig: null,
    };

    this.quangService.upsertWithThanhPhan(slagDto).subscribe({
      next: (res) => {
        if (res?.success && res.data?.id) {
          this.snack.open(this.data?.id ? 'Cập nhật xỉ thành công' : 'Thêm xỉ thành công', 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
          this.ref.close(res.data.id);
        } else {
          this.snack.open('Lưu xỉ thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
        }
      },
      error: () => this.snack.open('Lưu xỉ thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] }),
    });
  }

  private saveGangDich(
    thanhPhanHoaHoc: QuangThanhPhanHoaHocDto[],
    saveAsTemplate: boolean,
    templateConfig: GangTemplateConfigUpsertDto | null
  ) {
    const maGang = this.form.controls.maGang.value!;
    const tenGang = this.form.controls.tenGang.value!;

    const gangDto: QuangUpsertWithThanhPhanDto = {
      id: this.data?.id ?? null,
      ma_Quang: maGang,
      ten_Quang: tenGang,
      id_LoaiQuang: LoaiQuangEnum.Gang,
      dang_Hoat_Dong: true,
      ghi_Chu: this.form.controls.ghiChu.value ?? null,
      thanhPhanHoaHoc,
      gia: null,
      id_Quang_Gang: null,
      saveAsTemplate,
      templateConfig,
    };

    let slagDto: QuangUpsertWithThanhPhanDto | null = null;
    if (this.hasSlagConfig() && this.selectedSlagChems().length > 0) {
      const slagThanhPhanHoaHoc: QuangThanhPhanHoaHocDto[] = this.selectedSlagChems().map((c, idx) => ({
        ID_TPHH: c.id,
        Gia_Tri_PhanTram: this.slagTP_HoaHocs().get(c.id)?.phanTram.value ?? 0,
        ThuTuTPHH: idx + 1,
        KhoiLuong: this.slagTP_HoaHocs().get(c.id)?.khoiLuong ?? null,
        CalcFormula: this.slagTP_HoaHocs().get(c.id)?.calcFormula ?? null,
        IsCalculated: this.slagTP_HoaHocs().get(c.id)?.isCalculated ?? false,
      }));

      slagDto = {
        id: this.data?.id ? (this.existingSlagId() ?? null) : null,
        ma_Quang: `xi-${maGang}`,
        ten_Quang: `xỉ - ${tenGang}`,
        id_LoaiQuang: LoaiQuangEnum.Xi,
        dang_Hoat_Dong: true,
        ghi_Chu: `Xỉ tự động tạo cho gang ${tenGang}`,
        thanhPhanHoaHoc: slagThanhPhanHoaHoc,
        gia: null,
        id_Quang_Gang: this.data?.id ?? null,
        saveAsTemplate,
        templateConfig: null,
      };
    }

    const payload: GangDichConfigUpsertDto = {
      gang: gangDto,
      slag: slagDto,
      templateConfig: templateConfig ?? null,
    };

    this.quangService.upsertGangDichWithConfig(payload).subscribe({
      next: (res) => {
        if (res?.success && res.data?.id) {
          const newGangId = res.data.id;
          const hasSlag = !!slagDto;
          const message = hasSlag
            ? (this.data?.id ? 'Cập nhật gang và xỉ template thành công' : 'Tạo gang và xỉ template thành công')
            : (this.data?.id ? 'Cập nhật gang đích thành công' : 'Tạo gang đích thành công');
          this.snack.open(message, 'Đóng', { duration: 2000, panelClass: ['snack-success'] });
          
          // Nếu đang clone gang với tất cả phương án, gọi API clone phương án sau khi tạo gang thành công
          if (this.data?.cloneWithPlans && this.data?.cloneFromId && !this.data?.id) {
            this.cloneAllPlans(this.data.cloneFromId, newGangId);
          } else {
            this.ref.close(newGangId);
          }
        } else {
          this.snack.open('Lưu gang đích thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
        }
      },
      error: () => {
        this.snack.open('Lưu gang đích thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      }
    });
  }

  private cloneAllPlans(sourceGangId: number, newGangId: number) {
    const dto = {
      sourceGangId,
      newGangId,
      resetRatiosToZero: false,
      copySnapshots: false,
      copyDates: false,
      copyStatuses: false,
      cloneDate: null
    };

    this.paService.cloneGangWithAllPlans(dto).subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          const clonedCount = res.data.clonedCount || 0;
          this.snack.open(
            `Clone gang và ${clonedCount} phương án thành công`, 
            'Đóng', 
            { duration: 3000, panelClass: ['snack-success'] }
          );
          this.ref.close(newGangId);
        } else {
          this.snack.open('Clone phương án thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
          // Vẫn close dialog với gang ID đã tạo
          this.ref.close(newGangId);
        }
      },
      error: (error: any) => {
        console.error('Error cloning plans:', error);
        this.snack.open(
          `Lỗi khi clone phương án: ${error.error?.message || error.message || 'Có lỗi xảy ra'}`, 
          'Đóng', 
          { duration: 3000, panelClass: ['snack-error'] }
        );
        // Vẫn close dialog với gang ID đã tạo
        this.ref.close(newGangId);
      }
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
      const next = new Map(this.tp_HoaHocs());
      const selectedIds = new Set(this.selectedChems().map(c => c.id));
      for (const c of this.selectedChems()) {
        if (!next.has(c.id)) {
          next.set(c.id, {
            phanTram: new FormControl<number | null>(0),
            calcFormula: undefined,
            displayFormula: undefined,
            isCalculated: false,
            khoiLuong: null,
          });
        }
      }
      for (const id of Array.from(next.keys())) {
        if (!selectedIds.has(id)) next.delete(id);
      }
      this.tp_HoaHocs.set(next);
      this.hasGangConfig.set(list.length > 0);
    });
  }

  editGangConfig() {
    this.openSelectChems();
  }

  configureGang() {
    this.openSelectChems();
  }

  removeChem(id: number) {
    this.selectedChems.set(this.selectedChems().filter(c => c.id !== id));
    const next = new Map(this.tp_HoaHocs());
    next.delete(id);
    this.tp_HoaHocs.set(next);
  }

  removeGangTpHoaHoc(id: number) {
    this.selectedChems.set(this.selectedChems().filter(c => c.id !== id));
    const next = new Map(this.tp_HoaHocs());
    next.delete(id);
    this.tp_HoaHocs.set(next);
    if (this.selectedChems().length === 0) {
      this.hasGangConfig.set(false);
    }
  }

  removeSlagTpHoaHoc(id: number) {
    this.selectedSlagChems.set(this.selectedSlagChems().filter(c => c.id !== id));
    const next = new Map(this.slagTP_HoaHocs());
    next.delete(id);
    this.slagTP_HoaHocs.set(next);
    if (this.selectedSlagChems().length === 0) {
      this.hasSlagConfig.set(false);
    }
  }

  trackByChem = (_: number, c: { id: number }) => c.id;
  trackByTemplateItem = (_: number, item: { id: number }) => item.id;

  openProcessParamDialog() {
    const dialogRef = this.dialog.open(SelectProcessParamDialogComponent, {
      width: '1000px',
      height: '80vh',
      disableClose: true,
      data: {
        templateMode: true,
        initialSelection: this.selectedProcessParams().map(item => ({
          id: item.id,
          thuTu: item.thuTu,
          code: item.code,
          ten: item.ten,
          donVi: item.donVi
        }))
      }
    });

    dialogRef.afterClosed().subscribe((result: { items: Array<{ id: number; thuTu: number; code?: string; ten?: string; donVi?: string }> } | boolean | undefined) => {
      if (!result || typeof result === 'boolean') return;
      const availableMap = new Map<number, ProcessParamTemplateItem>();
      this.availableProcessParams().forEach(option => availableMap.set(option.id, option));
      const currentMap = new Map<number, ProcessParamTemplateItem>();
      this.selectedProcessParams().forEach(option => currentMap.set(option.id, option));

      const next = result.items
        .map((item, idx) => {
          const fromAvailable = availableMap.get(item.id);
          const fallback = currentMap.get(item.id);
          const source = fromAvailable ?? fallback;
          return {
            id: item.id,
            code: item.code ?? source?.code ?? '',
            ten: item.ten ?? source?.ten ?? '',
            donVi: item.donVi ?? source?.donVi ?? '',
            thuTu: item.thuTu && item.thuTu > 0 ? item.thuTu : idx + 1,
          };
        })
        .sort((a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0));

      this.selectedProcessParams.set(next);
      this.hasProcessParamConfig.set(next.length > 0);
    });
  }

  editProcessParamConfig() {
    this.openProcessParamDialog();
  }

  configureProcessParam() {
    this.openProcessParamDialog();
  }

  openThongKeDialog() {
    const dialogRef = this.dialog.open(PlanResultsComponent, {
      width: '1100px',
      height: '85vh',
      disableClose: true,
      data: {
        templateMode: true,
        initialSelection: this.selectedThongKes().map(item => ({
          id: item.id,
          thuTu: item.thuTu,
          code: item.code,
          ten: item.ten,
          donVi: item.donVi,
          description: item.ten
        }))
      }
    });

    dialogRef.afterClosed().subscribe((result: { items: Array<{ id: number; thuTu: number; code?: string; ten?: string; donVi?: string }> } | boolean | undefined) => {
      if (!result || typeof result === 'boolean') return;
      const availableMap = new Map<number, ThongKeTemplateItem>();
      this.availableThongKes().forEach(option => availableMap.set(option.id, option));
      const currentMap = new Map<number, ThongKeTemplateItem>();
      this.selectedThongKes().forEach(option => currentMap.set(option.id, option));

      const next = result.items
        .map((item, idx) => {
          const fromAvailable = availableMap.get(item.id);
          const fallback = currentMap.get(item.id);
          const source = fromAvailable ?? fallback;
          return {
            id: item.id,
            code: item.code ?? source?.code ?? '',
            ten: item.ten ?? source?.ten ?? '',
            donVi: item.donVi ?? source?.donVi ?? '',
            thuTu: item.thuTu && item.thuTu > 0 ? item.thuTu : idx + 1,
          };
        })
        .sort((a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0));

      this.selectedThongKes.set(next);
      this.hasThongKeConfig.set(next.length > 0);
    });
  }

  editThongKeConfig() {
    this.openThongKeDialog();
  }

  configureThongKe() {
    this.openThongKeDialog();
  }

  configureSlag() {
    const dlg = this.dialog.open(SelectTphhDialogComponent, {
      width: '750px',
      data: { preselectedIds: this.selectedSlagChems().map(x => x.id) }
    });
    dlg.afterClosed().subscribe((list: { id: number; ma_TPHH: string; ten_TPHH?: string }[] | undefined) => {
      if (!list) return;
      this.selectedSlagChems.set(list);
      const next = new Map(this.slagTP_HoaHocs());
      const selectedIds = new Set(this.selectedSlagChems().map(c => c.id));
      for (const c of this.selectedSlagChems()) {
        if (!next.has(c.id)) {
          next.set(c.id, {
            phanTram: new FormControl<number | null>(0),
            calcFormula: undefined,
            displayFormula: undefined,
            isCalculated: false,
            khoiLuong: null,
          });
        }
      }
      for (const id of Array.from(next.keys())) {
        if (!selectedIds.has(id)) next.delete(id);
      }
      this.slagTP_HoaHocs.set(next);
      this.hasSlagConfig.set(list.length > 0);
    });
  }

  editSlagConfig() {
    this.configureSlag();
  }

  openSlagFormulaCalculator(chem: { id: number; ma_TPHH: string; ten_TPHH?: string }) {
    const availableParams: FormulaParam[] = this.selectedSlagChems().map(c => ({
      id: c.id,
      code: c.ma_TPHH,
      ten: c.ma_TPHH || c.ma_TPHH,
    }));

    const dialogData: FormulaCalculatorData = {
      context: FormulaCalculatorContext.OreChemistry,
      title: `Thiết lập công thức cho ${chem.ma_TPHH} (Xỉ)`,
      currentIdFormula: this.slagTP_HoaHocs().get(chem.id)?.calcFormula || '',
      currentIsCalculated: this.slagTP_HoaHocs().get(chem.id)?.isCalculated || false,
      currentComponentId: chem.id,
      availableParams,
      searchApi: async (searchTerm: string) => new Promise((resolve) => {
        this.tphhService.search({
          pageIndex: 0,
          pageSize: 50,
          search: searchTerm,
          sortBy: 'code',
          sortDir: 'asc'
        }).subscribe(result => {
          const searchParams: FormulaParam[] = result.data.map(p => ({
            id: p.id,
            code: p.ma_TPHH,
            ten: p.ma_TPHH || p.ma_TPHH,
          }));
          resolve(searchParams);
        });
      }),
      searchPlaceholder: 'Tìm kiếm thành phần hóa học...',
      gangData: this.selectedSlagChems().map(c => ({
        tphhId: c.id,
        element: c.ten_TPHH || c.ma_TPHH,
        mass: 0,
        percentage: 0,
        isCalculated: false,
        calcFormula: undefined,
      })),
      arrayData: [],
    };

    const dialogRef = this.dialog.open(FormulaCalculatorComponent, {
      width: '1000px',
      height: 'auto',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result: FormulaCalculatorResult | null) => {
      if (!result) return;
      const currentMap = new Map(this.slagTP_HoaHocs());
      const currentCtrl = currentMap.get(chem.id);
      if (!currentCtrl) return;

      currentCtrl.calcFormula = result.idFormula || undefined;
      currentCtrl.displayFormula = result.displayFormula || undefined;
      currentCtrl.isCalculated = result.isCalculated ?? false;
      currentMap.set(chem.id, currentCtrl);
      this.slagTP_HoaHocs.set(currentMap);
    });
  }

  onCancel() {
    this.ref.close(null);
  }

  // onDeleteSlag() {
  //   if (!this.data?.id) return;
  //   this.quangService.softDelete(this.data.id).subscribe({
  //     next: () => {
  //       this.snack.open('Xoá xỉ thành công', 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
  //       this.ref.close('deleted');
  //     },
  //     error: () => this.snack.open('Xoá xỉ thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] })
  //   });
  // }

  openFormulaCalculator(chem: { id: number; ma_TPHH: string; ten_TPHH?: string }) {
    const availableParams: FormulaParam[] = this.selectedChems().map(c => ({
      id: c.id,
      code: c.ma_TPHH,
      ten: c.ma_TPHH || c.ma_TPHH,
    }));

    const dialogData: FormulaCalculatorData = {
      context: FormulaCalculatorContext.OreChemistry,
      title: `Thiết lập công thức cho ${chem.ma_TPHH}`,
      currentIdFormula: this.tp_HoaHocs().get(chem.id)?.calcFormula || '',
      currentIsCalculated: this.tp_HoaHocs().get(chem.id)?.isCalculated || false,
      currentComponentId: chem.id,
      availableParams,
      searchApi: async (searchTerm: string) => new Promise((resolve) => {
        this.tphhService.search({
          pageIndex: 0,
          pageSize: 50,
          search: searchTerm,
          sortBy: 'code',
          sortDir: 'asc'
        }).subscribe(result => {
          const searchParams: FormulaParam[] = result.data.map(p => ({
            id: p.id,
            code: p.ma_TPHH,
            ten: p.ma_TPHH || p.ma_TPHH,
          }));
          resolve(searchParams);
        });
      }),
      searchPlaceholder: 'Tìm kiếm thành phần hóa học...',
      gangData: this.selectedChems().map(c => ({
        tphhId: c.id,
        element: c.ten_TPHH || c.ma_TPHH,
        mass: 0,
        percentage: 0,
        isCalculated: false,
        calcFormula: undefined,
      })),
      arrayData: [],
    };

    const dialogRef = this.dialog.open(FormulaCalculatorComponent, {
      width: '1000px',
      height: 'auto',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result: FormulaCalculatorResult | null) => {
      if (!result) return;
      const currentMap = new Map(this.tp_HoaHocs());
      const currentCtrl = currentMap.get(chem.id);
      if (!currentCtrl) return;

      currentCtrl.calcFormula = result.idFormula || undefined;
      currentCtrl.displayFormula = result.displayFormula || undefined;
      currentCtrl.isCalculated = result.isCalculated ?? false;
      currentMap.set(chem.id, currentCtrl);
      this.tp_HoaHocs.set(currentMap);
    });
  }

  private shouldSaveAsTemplate(): boolean {
    return this.isGangTarget();
  }

  private isGangTarget(): boolean {
    return !this.data?.planId && (this.data?.loaiQuang ?? LoaiQuangEnum.Gang) !== LoaiQuangEnum.Xi;
  }

  private buildTemplateConfig(): GangTemplateConfigUpsertDto | null {
    const processParams = this.selectedProcessParams().map((item, index) => ({
      id: item.id,
      thuTu: item.thuTu && item.thuTu > 0 ? item.thuTu : index + 1,
    }));
    const thongKes = this.selectedThongKes().map((item, index) => ({
      id: item.id,
      thuTu: item.thuTu && item.thuTu > 0 ? item.thuTu : index + 1,
    }));

    if (processParams.length === 0 && thongKes.length === 0) {
      return null;
    }

    return { processParams, thongKes };
  }

  private validateGangDichConfig(): boolean {
    // Validate thành phần hóa học gang
    if (!this.hasGangConfig() || this.selectedChems().length === 0) {
      this.snack.open('Vui lòng cấu hình thành phần hóa học cho gang', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      return false;
    }

    // Validate tham số lò cao
    if (!this.hasProcessParamConfig() || this.selectedProcessParams().length === 0) {
      this.snack.open('Vui lòng cấu hình tham số lò cao', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      return false;
    }

    // Validate thông số thống kê
    if (!this.hasThongKeConfig() || this.selectedThongKes().length === 0) {
      this.snack.open('Vui lòng cấu hình thông số thống kê', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      return false;
    }

    // Xỉ là optional, không bắt buộc
    // if (!this.hasSlagConfig()) {
    //   this.snack.open('Vui lòng cấu hình xỉ', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
    //   return false;
    // }

    return true;
  }

  private validateTemplateData(templateConfig: GangTemplateConfigUpsertDto | null): templateConfig is GangTemplateConfigUpsertDto {
    if (!templateConfig) {
      this.snack.open('Vui lòng thiết lập tham số lò cao và thống kê cho template gang đích', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      return false;
    }

    if (!templateConfig.processParams || templateConfig.processParams.length === 0) {
      this.snack.open('Cần chọn ít nhất một tham số lò cao cho template gang đích', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      return false;
    }

    if (!templateConfig.thongKes || templateConfig.thongKes.length === 0) {
      this.snack.open('Cần chọn ít nhất một thông số thống kê cho template gang đích', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
      return false;
    }

    return true;
  }

  get isGangTargetMode(): boolean {
    return this.isGangTarget();
  }

  get canSave(): boolean {
    if (this.form.invalid || this.templateLoading()) {
      return false;
    }

    // Nếu là gang đích, cần validate các cấu hình
    if (this.isGangTargetMode) {
      return this.hasGangConfig() &&
        this.hasProcessParamConfig() &&
        this.hasThongKeConfig();
    }

    return true;
  }
}


