import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Inject,
  inject,
  signal,
  ChangeDetectorRef,
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
  QuangDetailResponse,
  QuangDto,
  ThanhPhanQuangDto,
  UpsertQuangDto,
  QuangUpsertWithThanhPhanDto,
  QuangThanhPhanHoaHocDto,
  QuangGiaDto
} from '../../../core/models/quang.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RateService } from '../../../core/services/rate.service';
import { MatCheckboxModule } from '@angular/material/checkbox';

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
    MatCheckboxModule
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
  private rateSvc = inject(RateService);
  private cdr = inject(ChangeDetectorRef);
  // lưu giá trị gần nhất theo chemId, kể cả khi bị bỏ chọn
  private lastValues = new Map<number, number | null>();



  mode: OreMode;
  chemicals: ChemicalOption[];
  sourceOres: OreOption[];
  tp_HoaHocs = signal<Map<number, { phanTram: FormControl<number | null> }>>(
    new Map()
  );

  private todayISO(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  dateCtrl = new FormControl<string>(this.todayISO(), { nonNullable: true });
  maxDate = this.todayISO();

  valueConvertToVnd = signal<number | null>(null);
  giaVndFromApi = signal<number | null>(null);
  // UI states (Angular signals)
  loading = signal(false);
  error = signal<string | null>(null);
  rate = signal<number | null>(null);
  dateUsed = signal<string>(''); // ngày thực tế trả về (có thể lùi)
  
  // Check exists state
  isChecked = signal<boolean>(false);
  checking = signal<boolean>(false);
  checkError = signal<string | null>(null);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: QuangMuaData,
    private ref: MatDialogRef<QuangMuaFormDialogComponent, { success: boolean; id: number } | null>
  ) {
    this.mode = this.data.mode;

    this.dateCtrl.valueChanges
      .pipe(debounceTime(150), distinctUntilChanged())
      .subscribe(dateISO => {
        if (!dateISO) return;
        this.fetchRate(dateISO);
      });

    // lần đầu load
    this.fetchRate(this.dateCtrl.value);

    // Theo dõi thay đổi giá USD để tính VND theo tỷ giá hiện tại
    this.headerForm.controls.giaUSD.valueChanges
      .pipe(debounceTime(150), distinctUntilChanged())
      .subscribe(() => this.recalcVnd());

    // Tự động tạo mã quặng từ tên quặng (luôn luôn, cả khi thêm mới và edit)
    this.headerForm.controls.tenQuang.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((tenQuang) => {
        if (tenQuang) {
          const maQuangSlug = this.toSlugNoDash(tenQuang);
          if (maQuangSlug) {
            this.headerForm.controls.maQuang.setValue(maQuangSlug, { emitEvent: false });
          }
        }
      });
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


  ngInit() {
  }

  private async fetchRate(dateISO: string) {
    this.loading.set(true);
    this.error.set(null);
    this.rate.set(null);
    this.dateUsed.set('');

    try {
      const { rate, dateUsed } = await this.rateSvc.getUsdVndByDate(dateISO, {
        maxLookbackDays: 2,
        fallback: true
      });
      // làm tròn 2 số sau dấu phẩy cho tỷ giá
      this.rate.set(Number(rate.toFixed(2)));
      this.dateUsed.set(dateUsed);

      // Khi tỷ giá thay đổi, tính lại VND
      this.recalcVnd();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Không thể lấy tỷ giá');
    } finally {
      this.loading.set(false);
    }
  }
  // ====== common header form ======

  headerForm = this.fb.group({
    maQuang: ['', [Validators.required, Validators.maxLength(50)]],
    tenQuang: ['', [Validators.required, Validators.maxLength(200)]],
    giaUSD: [null as number | null], // Không có validation, cho phép null
    ghiChu: ['' as string | null],
    loaiQuang: [0, Validators.required] // 0=thường, 3=phụ liệu, 5=cỡ
  });

  // Computed để check xem có thể enable các input khác không
  canEditOtherFields = computed(() => {
    // Nếu đang edit (có data.quang.id), cho phép edit luôn
    if (this.data.quang?.id) return true;
    // Nếu đang tạo mới, phải check tồn tại trước
    return this.isChecked();
  });

  private recalcVnd() {
    const usd = this.headerForm.controls.giaUSD.value ?? 0;
    const rate = this.rate();

    if (rate == null) {
      this.valueConvertToVnd.set(null);
      return;
    }
    // Nếu giá USD là 0 hoặc null, giá VND cũng là 0
    const vnd = Number(((Number(usd) || 0) * rate).toFixed(2));
    this.valueConvertToVnd.set(vnd);
  }

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


  openSelectChems() {
    // Tự động preselect MKN để người dùng luôn có thể nhập giá trị MKN
    const currentSelectedIds = this.selectedChems().map((x) => x.id);
    const preselectedIds = [...currentSelectedIds];

    // Nếu chưa có MKN trong danh sách và đang là quặng mới (mode MUA)
    // thì tự động preselect MKN để UX tốt hơn
    if (this.mode === 'MUA' && !this.hasMKNSelected()) {
      // MKN sẽ được tự động thêm vào khi dialog load nếu có
      // Hoặc người dùng sẽ tự chọn MKN khi đang chọn thành phần hóa học
    }

    const dlg = this.dialog.open(SelectTphhDialogComponent, {
      width: '840px',
      disableClose: true,
      data: { preselectedIds: preselectedIds },
    });

    dlg.afterClosed().subscribe(async (list: ChemVm[] | undefined) => {
      if (!list) return;
      this.selectedChems.set(list);
      this.syncThanhPhan(list);
    });
  }

  // Helper method to check if MKN is already selected
  private hasMKNSelected(): boolean {
    return this.selectedChems().some(chem => chem.ma_TPHH === 'MKN');
  }

  removeChem(chemId: number) {
    const chems = this.selectedChems().filter((c) => c.id !== chemId);
    this.selectedChems.set(chems);
    this.syncThanhPhan(chems); // Sync lại để xóa control tương ứng
  }

  // ====== submit -> map ra DTO ======
  buildPayload(): QuangUpsertWithThanhPhanDto {
    const idQuang = this.data.quang?.id || null;

    const header = this.headerForm.getRawValue();

    // Map chemical composition to new format
    const thanhPhanHoaHoc: QuangThanhPhanHoaHocDto[] = [];
    const currentDate = new Date().toISOString();

    // Duyệt theo thứ tự selectedChems để gắn ThuTuTPHH (1-based)
    const orderBy = this.selectedChems().map(c => c.id);
    orderBy.forEach((chemId, idx) => {
      const ctrl = this.tp_HoaHocs().get(chemId!);
      if (!ctrl) return;
      const v = ctrl.phanTram.value;
      if (v === null || isNaN(v) || v < 0) return;
      thanhPhanHoaHoc.push({
        ID_TPHH: chemId!,
        Gia_Tri_PhanTram: +v.toFixed(4),
        ThuTuTPHH: idx + 1
      });
    });

    // Map pricing information - Giá USD không bắt buộc, nếu không nhập thì là 0
    const giaUSD = header.giaUSD != null && header.giaUSD > 0 ? Number(header.giaUSD) : 0;
    const tyGia = this.rate() ?? 0; // Nếu không có tỷ giá thì mặc định là 0
    const giaVND = giaUSD * tyGia; // Nếu giaUSD = 0 thì giaVND = 0

    // Không cần validation vì giá USD có thể là 0 (nguyên liệu xoay vòng không tốn chi phí)

    const gia: QuangGiaDto = {
      gia_USD_1Tan: giaUSD,
      ty_Gia_USD_VND: tyGia,
      gia_VND_1Tan: Number(giaVND.toFixed(2)),
      ngay_Chon_TyGia: this.dateCtrl.value || new Date().toISOString()
    };

    return {
      id: idQuang,
      ma_Quang: header.maQuang!,
      ten_Quang: header.tenQuang!,
      loai_Quang: header.loaiQuang ?? 0,
      dang_Hoat_Dong: true,
      ghi_Chu: header.ghiChu ?? null,
      thanhPhanHoaHoc: thanhPhanHoaHoc,
      gia: gia,
      id_Quang_Gang: null // Không áp dụng cho quặng mua về
    };
  }

  onCheckExists() {
    const maQuang = this.headerForm.controls.maQuang.value?.trim();
    const tenQuang = this.headerForm.controls.tenQuang.value?.trim();

    if (!maQuang) {
      this.snack.open('Vui lòng nhập mã quặng trước khi kiểm tra', 'Đóng', {
        duration: 2000,
        panelClass: ['snack-warning']
      });
      return;
    }

    if (!tenQuang) {
      this.snack.open('Vui lòng nhập tên quặng trước khi kiểm tra', 'Đóng', {
        duration: 2000,
        panelClass: ['snack-warning']
      });
      return;
    }

    this.checking.set(true);
    this.checkError.set(null);

    const excludeId = this.data.quang?.id || null;
    this.quangService.checkExists(maQuang, tenQuang, excludeId).subscribe({
      next: (res) => {
        this.checking.set(false);
        if (res.success && res.data) {
          if (res.data.exists) {
            this.isChecked.set(false);
            this.checkError.set('Mã quặng hoặc tên quặng đã tồn tại trong hệ thống. Vui lòng nhập lại.');
            this.snack.open('Mã quặng hoặc tên quặng đã tồn tại', 'Đóng', {
              duration: 3000,
              panelClass: ['snack-error']
            });
          } else {
            this.isChecked.set(true);
            this.checkError.set(null);
            this.snack.open('Mã và tên quặng hợp lệ, có thể tiếp tục nhập thông tin', 'Đóng', {
              duration: 2000,
              panelClass: ['snack-success']
            });
          }
        }
      },
      error: (error) => {
        this.checking.set(false);
        this.isChecked.set(false);
        this.checkError.set(error.error?.message || error.message || 'Lỗi khi kiểm tra tồn tại');
        this.snack.open(`Lỗi: ${error.error?.message || error.message || 'Có lỗi xảy ra'}`, 'Đóng', {
          duration: 3000,
          panelClass: ['snack-error']
        });
      }
    });
  }

  onSave() {
    try {
      const payload = this.buildPayload();
      this.quangService.upsertWithThanhPhan(payload).subscribe({
        next: (res) => {
          if (res) {
            if (this.data.mode === 'MUA') {
              this.snack.open('Thêm quặng mua thành công', 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
            } else {
              this.snack.open('Sửa quặng thành công', 'Đóng', { duration: 1500, panelClass: ['snack-info'] });
            }
            this.ref.close({ success: true, id: res.data?.id || 0 });
          }
        },
        error: (error) => {
          console.error('Error saving quang:', error);
          this.snack.open(`Lỗi: ${error.error?.message || error.message || 'Có lỗi xảy ra'}`, 'Đóng', {
            duration: 3000,
            panelClass: ['snack-error']
          });
        }
      });
    } catch (error: any) {
      this.snack.open(`Lỗi: ${error.message}`, 'Đóng', {
        duration: 3000,
        panelClass: ['snack-error']
      });
    }
    this.headerForm.reset();
  }

  onCancel() {
    this.ref.close(null);
  }

  // ====== patch initial (edit) ======
  ngOnInit(): void {
    if (this.data.quang && this.data.quang.id) {
      this.loading.set(true);
      this.error.set(null);

      this.quangService.getById(this.data.quang.id).subscribe({
        next: (res) => {
          this.PatchFormValue(res);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading quang details:', error);
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            error: error.error,
            message: error.message,
            url: error.url
          });
          this.error.set(error.error?.message || error.message || 'Không thể tải thông tin quặng');
          this.loading.set(false);
          this.snack.open(`Lỗi: ${error.error?.message || error.message || 'Có lỗi xảy ra'}`, 'Đóng', {
            duration: 3000,
            panelClass: ['snack-error']
          });
        }
      });
    }
  }

  PatchFormValue(data: QuangDetailResponse) {
    try {
      console.log('Received data from API:', data);

      // Validate API response structure
      if (!this.validateApiResponse(data)) {
        throw new Error('Invalid API response structure');
      }

      // Nếu đang edit, set isChecked = true để cho phép edit các field khác
      if (this.data.quang?.id) {
        this.isChecked.set(true);
      }

      // Handle both old and new data formats
      const quangData = data.quang || data;

      // Get current pricing information
      const currentPrice = data.giaHienTai || null;

      const giaUSD = currentPrice ? this.parseNumber(currentPrice.gia_USD_1Tan) : null;
      const tyGia = currentPrice ? this.parseNumber(currentPrice.ty_Gia_USD_VND) : null;
      const ngayChonTyGia = currentPrice ? currentPrice.ngay_Chon_TyGia : null;
      // Patch header form with quang data (bỏ matKhiNung vì giờ dùng thành phần hóa học)
      // Lưu ý: mã quặng sẽ được tự động tạo từ tên quặng, không dùng mã cũ
      const tenQuang = quangData.ten_Quang || quangData.tenQuang || '';
      const formData = {
        tenQuang: tenQuang,
        giaUSD: giaUSD,
        ghiChu: quangData.ghi_Chu || quangData.ghiChu || '',
        loaiQuang: quangData.loai_Quang ?? 0,
      };

      this.headerForm.patchValue(formData);
      
      // Tự động tạo mã quặng từ tên quặng sau khi patch (luôn luôn, cả khi edit)
      if (tenQuang) {
        const maQuangSlug = this.toSlugNoDash(tenQuang);
        if (maQuangSlug) {
          this.headerForm.controls.maQuang.setValue(maQuangSlug, { emitEvent: false });
        }
      }

      // Force change detection
      this.cdr.detectChanges();

      if (ngayChonTyGia) {
        try {
          // Convert ISO string to YYYY-MM-DD format for date input
          const dateObj = new Date(ngayChonTyGia);
          const formattedDate = dateObj.toISOString().split('T')[0];
          this.dateCtrl.setValue(formattedDate);
          this.dateUsed.set(formattedDate);
          this.cdr.detectChanges();
        } catch (dateError) {
          // Fallback to original value if it's already in correct format
          this.dateCtrl.setValue(ngayChonTyGia);
          this.dateUsed.set(ngayChonTyGia);
        }
      }
      // Handle chemical composition data
      const chemicalData = data.tP_HoaHocs || [];

      const chemVms: ChemVm[] = chemicalData.map(c => ({
        id: c.id,
        ma_TPHH: c.ma_TPHH,
        ten_TPHH: c.ten_TPHH || '',
        phanTram: c.phanTram || 0
      }));
      this.selectedChems.set(chemVms);

      // Create seed map for chemical composition values
      const seed = new Map<number, number | null>();
      for (const c of chemicalData) {
        const phanTram = c.phanTram;
        if (typeof phanTram !== 'undefined' && phanTram !== null) {
          seed.set(c.id, Number(phanTram.toFixed(4)));
        }
      }

      // Sync chemical composition form controls
      this.syncThanhPhan(chemVms, seed);

      console.log('Form patched successfully with data:', {
        quangData,
        currentPrice,
        giaUSD,
        tyGia,
        ngayChonTyGia,
        giaVndFromApi: this.giaVndFromApi(),
        chemicalData: chemicalData.length,
        seedSize: seed.size
      });

    } catch (error) {
      this.error.set('Lỗi khi tải dữ liệu vào form');
      this.snack.open('Lỗi khi tải dữ liệu vào form', 'Đóng', {
        duration: 3000,
        panelClass: ['snack-error']
      });
    }
  }

  // Gọi hàm này sau khi bạn cập nhật selectedChems()
  syncThanhPhan(list: { id?: number; id_TPHH?: number }[], seed?: Map<number, number | null>) {
    try {
      const current = this.tp_HoaHocs();
      const next = new Map(current);

      // Handle both old format (id) and new format (id_TPHH)
      const selectedIds = new Set(list.map((x) => x.id || x.id_TPHH).filter(id => id !== undefined));

      // Thêm control mới
      for (const c of list) {
        const chemId = c.id || c.id_TPHH;
        if (chemId === undefined) continue;

        if (!next.has(chemId)) {
          // Priority: seed value > lastValues > null
          const init = seed?.get(chemId) ??
            (this.lastValues.has(chemId) ? this.lastValues.get(chemId)! : null);

          const ctrl = new FormControl<number | null>(init, {
            validators: [Validators.min(0), Validators.max(100)]
          });

          ctrl.valueChanges.subscribe((v) => this.lastValues.set(chemId, v));
          next.set(chemId, { phanTram: ctrl });
        } else {
          // Update existing control with seed value if available
          const existingCtrl = next.get(chemId)!.phanTram;
          if (seed?.has(chemId) && seed.get(chemId) !== null && seed.get(chemId) !== undefined) {
            existingCtrl.setValue(seed.get(chemId)!);
          }
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

      console.log('Chemical composition synced:', {
        selectedCount: list.length,
        controlsCount: next.size,
        seedCount: seed?.size || 0
      });

    } catch (error) {
      this.error.set('Lỗi khi đồng bộ thành phần hóa học');
    }
  }
  trackByChem = (_: number, c: { id?: number; id_TPHH?: number }) => c.id || c.id_TPHH;

  // Helper method to safely parse numbers
  private parseNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return isNaN(parsed) ? null : Number(parsed.toFixed(2));
  }

  // Test method to validate API response structure
  private validateApiResponse(data: any): boolean {
    try {
      // Check if data has required structure
      if (!data) {
        console.error('API response is null or undefined');
        return false;
      }

      // Check if it's QuangDetailResponse format
      if (data.quang) {
        console.log('Valid QuangDetailResponse format detected');
        return true;
      }

      // Check if it's legacy format (direct quang data)
      if (data.id && data.ma_Quang) {
        console.log('Legacy format detected, wrapping in QuangDetailResponse structure');
        return true;
      }

      console.error('Invalid API response format:', data);
      return false;
    } catch (error) {
      console.error('Error validating API response:', error);
      return false;
    }
  }
}
