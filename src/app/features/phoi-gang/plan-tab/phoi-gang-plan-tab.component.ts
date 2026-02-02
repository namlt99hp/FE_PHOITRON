import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, computed, OnInit, DestroyRef, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MixQuangDialogComponent } from '../../mix-quang-dialog/mix-quang-dialog.component';
import { SelectProcessParamDialogComponent } from '../../../shared/components/select-process-param-dialog/select-process-param-dialog.component';
import { PhuongAnPhoiService } from '../../../core/services/phuong-an-phoi.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuangService } from '../../../core/services/quang.service';
import { MilestoneEnum } from '../../../core/enums/milestone.enum';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CongThucPhoiDetailMinimal, MixResponseDto } from '../../../core/models/api-models';
import { PlanResultsComponent } from '../../thongke-function/plan-results/plan-results.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CongThucPhoiService } from '../../../core/services/congthucphoi.service';
import { GangSlagConfigDialogComponent } from './gang-slag-config-dialog/gang-slag-config-dialog.component';

export interface PhoiPlanTabModel {
  id?: number;
  ten: string;
  ngay_Tinh_Toan?: string;
}

export interface CongThucPhoiDetail {
  id: number;
  ma_Cong_Thuc: string;
  ten_Cong_Thuc: string;
  ghi_Chu?: string;
  milestone?: number;
  quangDauRa: {
    id: number;
    ma_Quang: string;
    ten_Quang: string;
    mat_Khi_Nung?: number;
    tP_HoaHocs?: Array<{
      id: number;
      ma_TPHH: string;
      ten_TPHH: string;
      phanTram: number;
    }>;
  };
  chiTietQuang: Array<{
    id: number;
    id_Cong_Thuc_Phoi: number;
    id_Quang_DauVao: number;
    ti_Le_Phan_Tram: number;
    // flattened names from BE response
    mat_Khi_Nung?: number;
    quang_DauVao_Ma?: string;
    quang_DauVao_Ten?: string;
    loai_Quang?: number; // Loại quặng (0: mua, 1: tron, 2: gang, 3: khac)
    tP_HoaHocs?: Array<{
      id: number;
      ma_TPHH: string;
      ten_TPHH: string;
      phanTram: number;
    }>;
    // Note: Path and Level fields removed - using ThuTuPhoi for sorting instead
  }>;
  rangBuocTPHH: Array<{
    id: number;
    id_Cong_Thuc_Phoi: number;
    id_TPHH: number;
    min_PhanTram?: number;
    max_PhanTram?: number;
    ma_TPHH: string;
    ten_TPHH: string;
  }>;
}

@Component({
  selector: 'app-phoi-gang-plan-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './phoi-gang-plan-tab.component.html',
  styleUrl: './phoi-gang-plan-tab.component.scss'
})
export class PhoiGangPlanTabComponent implements OnInit {
  @Input() plan!: PhoiPlanTabModel;
  @Input() gangId!: number;
  @Input() maGang!: string;

  @Output() requestRename = new EventEmitter<void>();
  @Output() processParamConfigChanged = new EventEmitter<void>();
  @Output() requestRemove = new EventEmitter<void>();

  private dialog = inject(MatDialog);
  private paService = inject(PhuongAnPhoiService);
  private destroyRef = inject(DestroyRef);
  private quangService = inject(QuangService);
  private snack = inject(MatSnackBar);
  private congThucPhoiService = inject(CongThucPhoiService);

  // Quặng kết quả management
  gangKetQuaId: number | null = null;
  slagId: number | null = null;

  // Danh sách công thức phối đã tạo (mỗi công thức gắn với 1 quặng output)
  mixes = signal<{ id: number; ten: string }[]>([]);

  // Chi tiết các công thức phối
  congThucDetails = signal<CongThucPhoiDetail[]>([]);

  // Chemistry matrix per detailId
  private detailChem = signal(new Map<number, { headers: { id: number; ma: string; ten: string }[]; rows: Array<{ oreId: number; oreName: string; ratio: number; matKhiNung: number; values: Map<number, number>; loai_Quang?: number }>; out: { name: string; matKhiNung: number; values: Map<number, number> } }>());

  // Loading state
  isLoading = signal<boolean>(false);

  // Note: Sorting logic removed - BE now handles sorting by ThuTuPhoi

  milestone = signal<MilestoneEnum>(MilestoneEnum.Standard);

  // Kiểm tra xem đã có milestone lò cao chưa
  hasLoCaoMilestone = computed(() => {
    return this.congThucDetails().some(detail => detail.milestone === MilestoneEnum.LoCao);
  });

  ngOnInit(): void {
    this.loadCongThucPhoiList();
  }

  // Load danh sách công thức phối của plan hiện tại - FLAT API VERSION
  private loadCongThucPhoiList() {
    if (!this.plan.id) return;
    this.isLoading.set(true);

    // Use new flat API that returns all formulas in a single list, sorted by ThuTuPhoi
    this.paService.getFormulasByPlanWithDetails(this.plan.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.isLoading.set(false);
        if (!res?.success || !res.data) {
          this.mixes.set([]);
          this.congThucDetails.set([]);
          return;
        }

        // Get all formulas from flat list (already sorted by ThuTuPhoi from BE)
        const allFormulas = res.data.formulas ?? [];

        // Get quặng kết quả (gang và xỉ) từ API response
        const quangKetQua = res.data.quangKetQua ?? [];
        this.updateQuangKetQua(quangKetQua);

        // Update mixes for pipeline tabs and anchors
        this.mixes.set(allFormulas.map(f => ({
          id: f.congThuc.id,
          ten: f.congThuc.ten ?? f.congThuc.ma
        })));

        // Convert to CongThucPhoiDetail format (already sorted by ThuTuPhoi from BE)
        const details = allFormulas.map(f => this.mapToCongThucPhoiDetail(f));
        this.congThucDetails.set(details);

        // Build chemistry matrices for each detail so the table can render rows/columns
        for (const d of details) {
          this.loadChemistryForDetail(d);
        }

        // No need for frontend sorting - BE already sorts by ThuTuPhoi
        // Each formula includes its milestone for display purposes
      }, _ => {
        this.isLoading.set(false);
        this.mixes.set([]);
        this.congThucDetails.set([]);
      });
  }

  // Map API response to CongThucPhoiDetail format
  private mapToCongThucPhoiDetail(f: CongThucPhoiDetailMinimal): CongThucPhoiDetail {
    return {
      id: f.congThuc.id,
      ma_Cong_Thuc: f.congThuc.ma,
      ten_Cong_Thuc: f.congThuc.ten ?? f.congThuc.ma,
      ghi_Chu: f.congThuc.ghiChu,
      milestone: f.milestone,
      quangDauRa: {
        id: f.quangDauRa.id,
        ma_Quang: f.quangDauRa.ma_Quang,
        ten_Quang: f.quangDauRa.ten_Quang,
        mat_Khi_Nung: 0, // Not used anymore
        tP_HoaHocs: f.quangDauRa.tP_HoaHocs ?? [],
      },
      chiTietQuang: (f.chiTietQuang || []).map((x: any) => ({
        id: 0,
        id_Cong_Thuc_Phoi: f.congThuc.id,
        id_Quang_DauVao: x.id_Quang ?? x.iD_Quang ?? x.ID_Quang ?? x.id_Quang_DauVao ?? x.iD_Quang_DauVao ?? x.ID_Quang_DauVao,
        mat_Khi_Nung: 0, // Not used anymore
        ti_Le_Phan_Tram: x.ti_Le_Phan_Tram,
        quang_DauVao_Ten: x.ten_Quang,
        loai_Quang: x.loai_Quang, // Loại quặng từ BE
        tP_HoaHocs: x.tP_HoaHocs ?? []
      })),
      rangBuocTPHH: (f.rangBuocTPHH || []).map((r: any) => ({
        id: r.id_TPHH ?? r.iD_TPHH ?? r.ID_TPHH,
        id_Cong_Thuc_Phoi: f.congThuc.id,
        id_TPHH: r.id_TPHH ?? r.iD_TPHH ?? r.ID_TPHH,
        min_PhanTram: r.min_PhanTram,
        max_PhanTram: r.max_PhanTram,
        ma_TPHH: r.ma_TPHH,
        ten_TPHH: r.ten_TPHH,
      }))
    };
  }



  private loadChemistryForDetail(detail: CongThucPhoiDetail) {
    // Build headers priority: output ore chems -> constraints -> inputs
    let hdrs: { id: number; ma: string; ten: string }[] = [];
    const outChems = ((detail as any).quangDauRa?.tP_HoaHocs || []) as any[];
    if (outChems.length) {
      hdrs = outChems.map(t => ({ id: Number(t.id), ma: t.ma_TPHH ?? '', ten: t.ten_TPHH ?? '' }));
    }
    if (!hdrs.length) {
      hdrs = (detail.rangBuocTPHH || []).map(x => ({ id: Number((x as any).id_TPHH ?? (x as any).iD_TPHH ?? (x as any).ID_TPHH), ma: (x as any).ma_TPHH, ten: (x as any).ten_TPHH }));
    }
    if (!hdrs.length) {
      const set = new Map<number, { id: number; ma: string; ten: string }>();
      for (const ctq of (detail.chiTietQuang || []) as any[]) {
        for (const t of (ctq.tP_HoaHocs || [])) {
          const id = Number(t.id);
          if (!set.has(id)) set.set(id, { id, ma: t.ma_TPHH ?? '', ten: t.ten_TPHH ?? '' });
        }
      }
      hdrs = Array.from(set.values());
    }

    // Rows from chiTietQuang with inline chem values
    const rows = (detail.chiTietQuang || []).map((ctq: any) => {
      const qid = Number(ctq.id_Quang ?? ctq.iD_Quang ?? ctq.id_Quang_DauVao ?? ctq.iD_Quang_DauVao ?? ctq.ID_Quang);
      const values = new Map<number, number>();
      const dict = new Map<number, number>();
      for (const t of (ctq.tP_HoaHocs || [])) {
        let raw: any = t.phanTram;
        if (typeof raw === 'string') raw = raw.replace(',', '.');
        const num = Number(raw);
        dict.set(Number(t.id), isNaN(num) ? 0 : num);
      }
      for (const h of hdrs) values.set(h.id, dict.get(h.id) ?? 0);
      return {
        oreId: qid,
        oreName: ctq.ten_Quang ?? ctq.quang_DauVao_Ten ?? `ORE-${qid}`,
        ratio: Number(ctq.ti_Le_Phan_Tram ?? 0),
        matKhiNung: Number(ctq.mat_Khi_Nung ?? 0),
        values,
        loai_Quang: ctq.loai_Quang
      };
    });

    // Output ore values for the last row
    const outValues = new Map<number, number>();
    const outDict = new Map<number, number>();
    for (const t of ((detail as any).quangDauRa?.tP_HoaHocs ?? [])) {
      let raw: any = t.phanTram; if (typeof raw === 'string') raw = raw.replace(',', '.');
      const num = Number(raw);
      outDict.set(Number(t.id), isNaN(num) ? 0 : num);
    }
    for (const h of hdrs) outValues.set(h.id, outDict.get(h.id) ?? 0);
    const out = { name: (detail as any).quangDauRa?.ten_Quang ?? 'Quặng đầu ra', matKhiNung: Number((detail as any).quangDauRa?.mat_Khi_Nung ?? 0), values: outValues };

    const m = new Map(this.detailChem());
    m.set(detail.id, { headers: hdrs, rows, out });
    this.detailChem.set(m);
  }

  // Helpers for template
  getChemHeaders(detailId: number) {
    return this.detailChem().get(detailId)?.headers || [];
  }
  getChemHeadersSorted(detailId: number) {
    const headers = this.getChemHeaders(detailId).slice();
    return headers.sort((a, b) => (a.ma || '').localeCompare(b.ma || '', undefined, { sensitivity: 'base' }) || a.id - b.id);
  }
  getChemRows(detailId: number) {
    return this.detailChem().get(detailId)?.rows || [];
  }
  getValue(detailId: number, row: { values: Map<number, number> }, chemId: number): number {
    return row.values.get(chemId) ?? 0;
  }
  getOutName(detailId: number): string {
    return this.detailChem().get(detailId)?.out.name || '';
  }
  getOutValue(detailId: number, chemId: number): number {
    return this.detailChem().get(detailId)?.out.values.get(chemId) ?? 0;
  }
  // Backward-compatible aliases
  getTotalValue(detailId: number, chemId: number): number { return this.getOutValue(detailId, chemId); }

  private getDefaultChemSelections(): Array<{ id: number; ma_TPHH: string; ten_TPHH: string }> {
    const firstDetail = this.congThucDetails()[0];
    if (!firstDetail?.rangBuocTPHH?.length) {
      return [];
    }

    const map = new Map<number, { id: number; ma_TPHH: string; ten_TPHH: string }>();
    for (const chem of firstDetail.rangBuocTPHH) {
      const chemId = Number(chem.id_TPHH ?? chem.id);
      if (!chemId) continue;
      map.set(chemId, {
        id: chemId,
        ma_TPHH: chem.ma_TPHH,
        ten_TPHH: chem.ten_TPHH
      });
    }

    let result = Array.from(map.values());
    if (this.milestone() === MilestoneEnum.LoCao) {
      result = result.filter(c => (c.ma_TPHH ?? '').toUpperCase() !== 'MKN');
    }
    return result;
  }

  openMixDialog() {
    this.dialog.open(MixQuangDialogComponent, {
      width: '1700px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        planId: this.plan.id,
        planName: this.plan.ten,
        planNgayTao: this.plan.ngay_Tinh_Toan,
        gangId: this.gangId,
        maGang: this.maGang,
        milestone: this.milestone(),
        outputLoaiQuang: 7, // Loại 7 cho quặng phối trộn trong phương án
        defaultChems: this.getDefaultChemSelections(),
      }
    }).afterClosed().subscribe((res: MixResponseDto | null) => {
      // Kỳ vọng BE trả { idQuangOut }
      const outId = res?.idQuangOut ?? null;
      const outName = `Quặng phối #${outId}`;
      if (!outId) return;
      const list = [...this.mixes()];
      list.push({ id: Number(outId), ten: String(outName) });
      this.mixes.set(list);
      this.loadCongThucPhoiList();
      // Scroll đến chi tiết công thức mới tạo
      setTimeout(() => this.scrollToMix(outId), 0);
    });
  }

  editCongThuc(detail: CongThucPhoiDetail) {
    this.dialog.open(MixQuangDialogComponent, {
      width: '1700px',
      maxWidth: '95vw',
      height: '900px',
      disableClose: true,
      data: {
        // Data để edit
        congThucPhoiId: detail.id,
        planId: this.plan.id,
        planName: this.plan.ten,
        planNgayTao: this.plan.ngay_Tinh_Toan,
        gangId: this.gangId,
        maGang: this.maGang,
        milestone: detail.milestone, // Truyền milestone của công thức cụ thể
        outputLoaiQuang: 7, // Loại 7 cho quặng phối trộn trong phương án
      }
    }).afterClosed().subscribe((res: MixResponseDto | null) => {
      // Reload data sau khi edit
      if (res) {
        this.loadCongThucPhoiList();
      }
    });
  }

  deleteCongThuc(detail: CongThucPhoiDetail) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa công thức "${detail.ten_Cong_Thuc || detail.ma_Cong_Thuc}"?`,
        confirmText: 'Xóa',
        cancelText: 'Hủy'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.congThucPhoiService.deleteCongThucPhoi(detail.id).subscribe({
          next: () => {
            this.snack.open('Xóa công thức thành công', 'Đóng', { duration: 2000 });
            this.loadCongThucPhoiList();
          },
          error: (error: any) => {
            console.error('Error deleting formula:', error);

            // Check if it's a 409 Conflict error (business rule violation)
            if (error.status === 409) {
              // Show error dialog for business rule violations
              this.dialog.open(ConfirmDialogComponent, {
                width: '500px',
                data: {
                  title: 'Không thể xóa công thức',
                  message: 'Quặng đầu ra của công thức này đang được sử dụng trong công thức phối khác.',
                  confirmText: 'Đóng',
                  cancelText: null, // Hide cancel button
                  showCancel: false
                }
              });
            } else {
              // Show snackbar for other errors
              this.snack.open('Xóa công thức thất bại', 'Đóng', { duration: 2000 });
            }
          }
        });
      }
    });
  }

  scrollToMix(id: number) {
    const el = document.getElementById(this.mixAnchorId(id));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  mixAnchorId = (id: number) => `mix-${id}`;

  // Compute total ratio for a formula detail
  getTotalTiLe(detail: CongThucPhoiDetail): number {
    if (!detail || !detail.chiTietQuang) return 0;
    return detail.chiTietQuang.reduce((sum, x) => sum + (x.ti_Le_Phan_Tram || 0), 0);
  }

  // Get milestone display name
  getMilestoneDisplayName(milestone?: number): string {
    switch (milestone) {
      case 0: return 'Standard';
      case 1: return 'Thiêu kết';
      case 2: return 'Lò Cao';
      default: return 'Khác';
    }
  }

  // Get milestone CSS class for styling
  getMilestoneClass(milestone?: number): string {
    switch (milestone) {
      case 0: return 'milestone-standard';
      case 1: return 'milestone-thieu-ket';
      case 2: return 'milestone-lo-cao';
      default: return 'milestone-other';
    }
  }

  // Check if ore is a mixed ore (loai_Quang = 1 hoặc 7)
  // Loại 1: Trộn bình thường, Loại 7: Trộn trong phương án
  isMixedOre(ore: any): boolean {
    return  ore.loai_Quang === 7;
  }

  // Process Parameter Configuration
  openProcessParamConfig(): void {
    if (!this.plan.id) {
      console.warn('Cannot open process param config: plan ID is missing');
      return;
    }

    this.dialog.open(SelectProcessParamDialogComponent, {
      width: '1200px',
      height: '800px',
      data: {
        planId: this.plan.id,
        planName: this.plan.ten
      }
    }).afterClosed().subscribe(result => {
      if (result) {
        // Configuration was updated successfully
        this.processParamConfigChanged.emit();
        console.log('Process param configuration updated:', result);
      }
    });
  }

  openStatisticsConfig(): void {
    if (!this.plan.id) {
      console.warn('Cannot open statistics config: plan ID is missing');
      return;
    }

    this.dialog.open(PlanResultsComponent, {
      width: '1200px',
      height: '700px',
      data: {
        planId: this.plan.id,
        planName: this.plan.ten
      }
    }).afterClosed().subscribe(result => {
      if (result) {
        // Statistics configuration was updated successfully
        console.log('Statistics configuration updated:', result);
        // this.loadCongThucPhoiList();
      }
    });
  }

  // ===== Quặng kết quả Management =====
  private updateQuangKetQua(quangKetQua: any[]) {
    this.gangKetQuaId = null;
    this.slagId = null;
    for (const q of quangKetQua) {
      if (q.loaiQuang === 2) { // Gang
        this.gangKetQuaId = q.iD_Quang;
      } else if (q.loaiQuang === 4) { // Xỉ
        this.slagId = q.iD_Quang;
      }
    }
  }

  onCreateGang() {
    if (!this.gangKetQuaId) {
      this.snack.open('Gang kết quả chưa được tạo. Vui lòng tạo phương án trước.', 'Đóng', { duration: 3000 });
      return;
    }
    if (!this.gangId) {
      this.snack.open('Gang đích chưa được thiết lập. Vui lòng kiểm tra lại.', 'Đóng', { duration: 3000 });
      return;
    }

    this.dialog.open(GangSlagConfigDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      maxHeight: '800px',
      disableClose: true,
      data: {
        quangId: this.gangKetQuaId,
        loaiQuang: 2, // Gang
        planId: this.plan.id,
        idQuangGang: this.gangId // Gang kết quả không có id_Quang_Gang
      }
    }).afterClosed().subscribe((saved) => {
      if (saved) {
        // Reload data if needed
        console.log('Gang config saved');
      }
    });
  }

  onCreateSlag() {
    if (!this.slagId) {
      this.snack.open('Xỉ kết quả chưa được tạo. Vui lòng tạo phương án trước.', 'Đóng', { duration: 3000 });
      return;
    }

    if (!this.gangId) {
      this.snack.open('Gang đích chưa được thiết lập. Vui lòng kiểm tra lại.', 'Đóng', { duration: 3000 });
      return;
    }

    this.dialog.open(GangSlagConfigDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      maxHeight: '800px',
      disableClose: true,
      data: {
        quangId: this.slagId,
        loaiQuang: 4, // Xỉ
        planId: this.plan.id,
        idQuangGang: this.gangId // Xỉ kết quả phải link đến gang đích (giống như khi tạo từ template)
      }
    }).afterClosed().subscribe((saved) => {
      if (saved) {
        // Reload data if needed
        console.log('Slag config saved');
      }
    });
  }

  // Note: Level display removed - using ThuTuPhoi for sorting instead
}


