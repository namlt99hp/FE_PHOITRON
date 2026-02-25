import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PhuongAnPhoiService } from '../../../core/services/phuong-an-phoi.service';
import { PlanSectionDto } from '../../../core/models/phuong-an-phoi.model';
import { LoaiQuangEnum } from '../../../core/enums/loaiquang.enum';

export interface InputPriceRow {
  id?: number;
  stt: number;
  loaiNNL: string;
  usd: number | null;
  vnd: number | null;
  highlightUsd?: boolean;
  highlightVnd?: boolean;
  loaiQuang?: number;
}

export interface ExcelRow {
  name: string;
  unit: string | null;
  isSectionHeader: boolean;
  isBold: boolean;
  isYellow: boolean;
  isRed?: boolean;
  values: { [planName: string]: number | string | null };
}

@Component({
  selector: 'app-phoi-gang-summary',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './phoi-gang-summary.component.html',
  styleUrl: './phoi-gang-summary.component.scss',
})
export class PhoiGangSummaryComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paService = inject(PhuongAnPhoiService);

  readonly id = signal<number>(Number(this.route.snapshot.paramMap.get('id')));
  readonly maGang = signal<string>(this.route.snapshot.queryParamMap.get('ma') || '');

  readonly plans = signal<{ id: number; ten_Phuong_An: string }[]>([]);
  readonly loading = signal<boolean>(true);
  readonly excelData = signal<ExcelRow[]>([]);
  readonly planColumns = signal<string[]>([]);
  readonly planSectionsData = signal<PlanSectionDto[]>([]);

  /** Giá đầu vào: danh sách NNL với giá USD / VNĐ */
  readonly inputPrices = signal<InputPriceRow[]>([]);
  readonly tyGiaUsdVnd = signal<number | null>(null);
  readonly ngayTyGia = signal<string | null>(null);

  ngOnInit() {
    this.loadPlanSections();
    this.loadRelatedOres();
  }

  /** Lấy danh sách quặng liên quan từ API (trừ loại 2, 4, 7) — dùng cho Giá đầu vào. */
  private loadRelatedOres() {
    const gangDichId = this.id();
    this.paService.getRelatedOresByGangDich(gangDichId).subscribe({
      next: (res) => {
        const list = res?.data ?? [];
        const first = list[0];
        if (first?.tyGia != null) {
          this.tyGiaUsdVnd.set(Number(first.tyGia));
        }
        if (first?.ngayTyGia) {
          const d = String(first.ngayTyGia).slice(0, 10);
          if (d.length >= 10) {
            const [y, m, day] = [d.slice(0, 4), d.slice(5, 7), d.slice(8, 10)];
            this.ngayTyGia.set(`Update ngày ${day}.${m}.${y.slice(2)}`);
          } else {
            this.ngayTyGia.set(`Update ngày ${first.ngayTyGia}`);
          }
        }
        const usdValues = list.map((x) => x.giaUsd ?? 0).filter((v) => v != null && !isNaN(v));
        const avgUsd = usdValues.length ? usdValues.reduce((a, b) => a + b, 0) / usdValues.length : 0;
        const vndValues = list.map((x) => x.giaVnd ?? 0).filter((v) => v != null && !isNaN(v));
        const avgVnd = vndValues.length ? vndValues.reduce((a, b) => a + b, 0) / vndValues.length : 0;
        const rows: InputPriceRow[] = list.map((x, i) => ({
          id: x.id,
          stt: i + 1,
          loaiNNL: x.tenQuang ?? x.maQuang ?? '',
          usd: x.giaUsd != null ? Number(x.giaUsd) : null,
          vnd: x.giaVnd != null ? Number(x.giaVnd) : null,
          // Highlight chỉ với quặng loại 1 (Trộn) và 6 (Quặng vê viên)
          highlightUsd:
            avgUsd > 0 &&
            (x.giaUsd ?? 0) > avgUsd * 1.1 &&
            (x.idLoaiQuang === LoaiQuangEnum.Tron || x.idLoaiQuang === LoaiQuangEnum.QuangVeVien),
          highlightVnd:
            avgVnd > 0 &&
            x.giaVnd != null &&
            x.giaVnd > avgVnd * 1.1 &&
            (x.idLoaiQuang === LoaiQuangEnum.Tron || x.idLoaiQuang === LoaiQuangEnum.QuangVeVien),
          loaiQuang: x.idLoaiQuang,
        }));
        this.inputPrices.set(rows);
      },
    });
  }

  private loadPlanSections() {
    this.loading.set(true);
    const gangDichId = this.id();
    this.paService.getPlanSectionsByGangDich(gangDichId, true, true).subscribe({
      next: (res) => {
        if (res?.data && res.data.length > 0) {
          this.planSectionsData.set(res.data);
          const planNames = res.data.map((p) => p.ten_Phuong_An);
          this.planColumns.set(planNames);
          this.plans.set(
            res.data.map((p) => ({
              id: p.planId,
              ten_Phuong_An: p.ten_Phuong_An,
            }))
          );
          this.buildExcelData(res.data);
        } else {
          this.plans.set([]);
          this.excelData.set([]);
          this.planColumns.set([]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.plans.set([]);
      },
    });
  }

  /**
   * Section "Tỷ lệ phối quặng vào TK" dùng childComponents do BE trả về (chỉ quặng con của quặng phối trong công thức thiêu kết).
   */
  private buildExcelData(planSectionsData: PlanSectionDto[]) {
    const planNames = planSectionsData.map((p) => p.ten_Phuong_An);
    const data: ExcelRow[] = [];

    // ---- 1. Tỷ lệ phối quặng vào TK: chỉ quặng con từ BE (thieuKet.childComponents) ----
    

    const allChildOreNames = new Set<string>();
    const planToChildRatios = new Map<string, Map<string, number>>();
    planNames.forEach((pn) => planToChildRatios.set(pn, new Map()));

    planSectionsData.forEach((plan) => {
      const childComps = (plan.thieuKet as any)?.childComponents ?? plan.thieuKet?.childComponents ?? [];
      const childRatios = planToChildRatios.get(plan.ten_Phuong_An)!;
      childComps.forEach((c: any) => {
        const name = c.tenQuang ?? c.ten_Quang ?? '';
        if (!name) return;
        const ratio = Number(c.tiLePhanTram ?? c.ti_Le_PhanTram) || 0;
        childRatios.set(name, (childRatios.get(name) ?? 0) + ratio);
        allChildOreNames.add(name);
      });
    });

    Array.from(allChildOreNames)
      .sort((a, b) => a.localeCompare(b))
      .forEach((oreName) => {
        const values: { [k: string]: number | string | null } = {};
        planNames.forEach((pn) => {
          const v = planToChildRatios.get(pn)?.get(oreName);
          values[pn] = v != null && v > 0 ? v : null;
        });
        data.push({
          name: oreName,
          unit: '%',
          isSectionHeader: false,
          isBold: false,
          isYellow: false,
          values,
        });
      });

    data.push({
      name: 'Thiêu kết (%SiO2)',
      unit: '%',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.thieuKetKpi(planSectionsData, 'tK_SIO2_QTK'),
    });
    data.push({
      name: 'CaO',
      unit: '',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.thieuKetKpi(planSectionsData, 'tK_CAO'),
    });
    data.push({
      name: 'R2',
      unit: '',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.thieuKetKpi(planSectionsData, 'tK_R2'),
    });

    // ---- 2. Giá thành QTK ----
    data.push({
      name: 'Giá thành QTK',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      values: {},
    });

    const tkCostValues = this.thieuKetKpi(planSectionsData, 'tK_COST');
    data.push({
      name: 'Giá thành QTK',
      unit: 'VND/tấn',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: tkCostValues,
    });

    const firstPlanName = planNames[0];
    const baselineCost = typeof tkCostValues[firstPlanName] === 'number' ? (tkCostValues[firstPlanName] as number) : null;
    const chenhLechQtk: { [k: string]: number | string | null } = {};
    planNames.forEach((pn) => {
      const v = tkCostValues[pn];
      if (baselineCost != null && typeof v === 'number') {
        chenhLechQtk[pn] = v - baselineCost;
      } else {
        chenhLechQtk[pn] = null;
      }
    });
    data.push({
      name: 'Chênh lệch QTK',
      unit: 'VND/tấn',
      isSectionHeader: false,
      isBold: false,
      isYellow: true,
      values: chenhLechQtk,
    });

    // Bảng chi phí: % theo từng loại (Quặng thiêu kết, Vê viên..., Cỡ Khummani)
    const planDataMap = new Map<string, any[]>();
    planSectionsData.forEach((p) => {
      if (p.bangChiPhiLoCao?.length) {
        planDataMap.set(p.ten_Phuong_An, p.bangChiPhiLoCao);
      }
    });
    const DISPLAY_NAME_THIEU_KET = 'Quặng Thiêu kết';
    const hasQuangPA = Array.from(planDataMap.values()).some((arr) =>
      arr.some((it: any) => it.loaiQuang === LoaiQuangEnum.QuangPA || it.loaiQuang === 7)
    );
    const allQuangNames = new Set<string>();
    if (hasQuangPA) allQuangNames.add(DISPLAY_NAME_THIEU_KET);
    planDataMap.forEach((arr) => {
      arr.forEach((it: any) => {
        if (it.loaiQuang === LoaiQuangEnum.QuangPA || it.loaiQuang === 7) return;
        allQuangNames.add(it.tenQuang);
      });
    });
    const sortedQuangNames = Array.from(allQuangNames).sort((a, b) => {
      if (a === DISPLAY_NAME_THIEU_KET) return -1;
      if (b === DISPLAY_NAME_THIEU_KET) return 1;
      return a.localeCompare(b);
    });
    sortedQuangNames.forEach((quangName) => {
      const values: { [k: string]: number | string | null } = {};
      planNames.forEach((pn) => {
        const arr = planDataMap.get(pn);
        if (!arr) {
          values[pn] = null;
          return;
        }
        let sum = 0;
        if (quangName === DISPLAY_NAME_THIEU_KET) {
          const items = arr.filter((it: any) => it.loaiQuang === LoaiQuangEnum.QuangPA || it.loaiQuang === 7);
          sum = items.reduce((acc: number, it: any) => acc + (Number(it.tieuhao) || 0), 0);
        } else {
          const item = arr.find((it: any) => it.tenQuang === quangName);
          sum = item != null ? Number(item.tieuhao) || 0 : 0;
        }
        values[pn] = sum > 0 ? sum : null;
      });
      data.push({
        name: quangName,
        unit: '%',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values,
      });
    });

    // ---- 3. Giá thành Gang xuất xưởng ----
    data.push({
      name: 'Giá thành Gang xuất xưởng',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      values: {},
    });

    const tongChiPhiValues: { [k: string]: number | string | null } = {};
    planNames.forEach((pn) => {
      const plan = planSectionsData.find((p) => p.ten_Phuong_An === pn);
      tongChiPhiValues[pn] = plan?.loCao?.tongChiPhi ?? null;
    });
    data.push({
      name: 'Giá thành Gang xuất xưởng',
      unit: 'VNĐ/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: tongChiPhiValues,
    });

    const baselineGang = typeof tongChiPhiValues[firstPlanName] === 'number' ? (tongChiPhiValues[firstPlanName] as number) : null;
    const chenhLechGang: { [k: string]: number | string | null } = {};

    const mnValues = this.loCaoKpi(planSectionsData, 'lC_MN_TRONG_GANG');
    const mnFirst = mnValues[firstPlanName];
    const chiPhiTangDoChayMn: { [k: string]: number | string | null } = {};
    planNames.forEach((pn) => {
      const mn = mnValues[pn];
      const tongChiPhi = tongChiPhiValues[pn];
      if (
        mn != null && typeof mn === 'number' &&
        mnFirst != null && typeof mnFirst === 'number' &&
        tongChiPhi != null && typeof tongChiPhi === 'number'
      ) {
        // Chênh lệch [Mn] theo phần trăm: ví dụ mn=3%, mnFirst=1% → (3-1)% × (tongChiPhi + 1100000)
        chiPhiTangDoChayMn[pn] = ((mn - mnFirst) * (tongChiPhi + 1100000)) / 100;
      } else {
        chiPhiTangDoChayMn[pn] = null;
      }
    });
    
    planNames.forEach((pn) => {
      const v = tongChiPhiValues[pn];
      if (baselineGang != null && typeof v === 'number') {
        chenhLechGang[pn] = v - baselineGang;
      } else {
        chenhLechGang[pn] = null;
      }
    });
    data.push({
      name: 'Chênh lệch Gang',
      unit: 'VNĐ/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: true,
      values: chenhLechGang,
    });

    // TT ưu tiên giá gang (rank 1,2,3... - nhỏ nhất = ưu tiên 1)
    const sortedByGang = [...planSectionsData].sort((a, b) => {
      const va = a.loCao?.tongChiPhi ?? Infinity;
      const vb = b.loCao?.tongChiPhi ?? Infinity;
      return va - vb;
    });
    const rankGang: { [k: string]: number | string | null } = {};
    sortedByGang.forEach((p, idx) => {
      rankGang[p.ten_Phuong_An] = idx + 1;
    });
    data.push({
      name: 'TT ưu tiên giá gang',
      unit: null,
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      isRed: true,
      values: rankGang,
    });
    data.push({
      name: 'Chi phí tăng do cháy Mn trong thép',
      unit: 'VNĐ/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: true,
      values: chiPhiTangDoChayMn,
    });
    const giaThanhQuyDoiCuoiCung: { [k: string]: number | string | null } = {};
    planNames.forEach((pn) => {
      const tongChiPhi = tongChiPhiValues[pn];
      const chiPhiMn = chiPhiTangDoChayMn[pn];
      if (tongChiPhi != null && typeof tongChiPhi === 'number' && chiPhiMn != null && typeof chiPhiMn === 'number') {
        giaThanhQuyDoiCuoiCung[pn] = tongChiPhi + chiPhiMn;
      } else {
        giaThanhQuyDoiCuoiCung[pn] = null;
      }
    });
    data.push({
      name: 'Giá thành Gang quy đổi cuối cùng',
      unit: 'VNĐ/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: giaThanhQuyDoiCuoiCung,
    });
    data.push({
      name: 'Chênh lệch sau khi cháy Mn trong thép',
      unit: 'VNĐ/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: true,
      values: chenhLechGang,
    });
    data.push({
      name: 'TT ưu tiên giá cuối cùng',
      unit: null,
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      isRed: true,
      values: rankGang,
    });

    // ---- 4. Cu trong gang (chỉ số lò cao) ----
    data.push({
      name: 'Cu trong gang',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      values: {},
    });

    data.push({
      name: 'Cu trong gang',
      unit: '%',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.loCaoKpi(planSectionsData, 'lC_CU_TRONG_GANG'),
    });
    data.push({
      name: '(Al2O3)',
      unit: '%',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.loCaoKpi(planSectionsData, 'aL2O3_XI'),
    });
    data.push({
      name: '[tfe]',
      unit: '',
      isSectionHeader: false,
      isBold: true,
      isYellow: false,
      values: this.loCaoKpi(planSectionsData, 'lC_PHAM_VI_VAO_LO'),
    });
    data.push({
      name: '(R2)',
      unit: '',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.loCaoKpi(planSectionsData, 'lC_R2'),
    });
    data.push({
      name: '[Mn]',
      unit: '%',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.loCaoKpi(planSectionsData, 'lC_MN_TRONG_GANG'),
    });
    data.push({
      name: '(Akali)',
      unit: '',
      isSectionHeader: false,
      isBold: true,
      isYellow: false,
      values: this.loCaoKpi(planSectionsData, 'lC_TONG_KLK_VAO_LO'),
    });
    data.push({
      name: 'Tổng Zn vào lò',
      unit: 'kg/tsp',
      isSectionHeader: false,
      isBold: true,
      isYellow: false,
      values: this.loCaoKpi(planSectionsData, 'lC_TONG_ZN_VAO_LO'),
    });
    data.push({
      name: 'Suất lượng xi',
      unit: 'kg/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.loCaoKpi(planSectionsData, 'lC_XUAT_LUONG_XI'),
    });
    data.push({
      name: 'Tỉ lệ MgO/Al2O3',
      unit: '3dec',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.loCaoKpi(planSectionsData, 'tiLeMgO_AL2O3'),
    });

    this.excelData.set(data);
  }

  private thieuKetKpi(
    planSectionsData: PlanSectionDto[],
    key: 'tK_SIO2_QTK' | 'tK_R2' | 'tK_COST' | 'tK_CAO'
  ): { [planName: string]: number | string | null } {
    const values: { [planName: string]: number | string | null } = {};
    this.planColumns().forEach((pn) => (values[pn] = null));
    planSectionsData.forEach((p) => {
      const v = (p.thieuKet as any)?.[key];
      if (v != null && typeof v === 'number') values[p.ten_Phuong_An] = v;
    });
    return values;
  }

  private loCaoKpi(
    planSectionsData: PlanSectionDto[],
    key: string
  ): { [planName: string]: number | string | null } {
    const values: { [planName: string]: number | string | null } = {};
    this.planColumns().forEach((pn) => (values[pn] = null));
    planSectionsData.forEach((p) => {
      if (!p.loCao) return;
      let v = (p.loCao as any)[key];
      if (v != null && typeof v === 'number') {
        if (key === 'tiLeMgO_AL2O3') v = Number(v.toFixed(3));
        values[p.ten_Phuong_An] = v;
      }
    });
    return values;
  }

  getExcelData(): ExcelRow[] {
    return this.excelData();
  }

  getPlanColumns(): string[] {
    return this.planColumns();
  }

  /** Tổng tỷ lệ các quặng trong section ThieuKet (childComponents) theo từng plan — dùng cho header cột thay 100% fix cứng */
  getThieuKetSumForPlan(planName: string): number | null {
    const plan = this.planSectionsData().find((p) => p.ten_Phuong_An === planName);
    const childComps = (plan?.thieuKet as any)?.childComponents ?? plan?.thieuKet?.childComponents ?? [];
    if (childComps.length === 0) return null;
    const sum = childComps.reduce(
      (acc: number, c: any) => acc + (Number(c.tiLePhanTram ?? c.ti_Le_PhanTram) || 0),
      0
    );
    return sum;
  }

  formatValue(value: number | string | null, unit: string | null): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      if (unit === '%') return value === 0 ? '' : `${value.toFixed(2)}%`;
      if (unit === '3dec') return value.toFixed(3);
      if (value === 0) return '';
      const u = (unit ?? '').toLowerCase().replace(/\s+/g, '');
      const isVnd = u.includes('vnd') || u.includes('vnđ');
      if (isVnd) return Math.round(value).toLocaleString('vi-VN');
      return new Intl.NumberFormat('vi-VN', { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    }
    return String(value);
  }

  getInputPrices(): InputPriceRow[] {
    return this.inputPrices();
  }

  /** Giá đầu vào để hiển thị (từ API GetRelatedOresByGangDich — đã đủ và đã loại trừ 2, 4, 7). STT đánh lại từ 1. */
  getInputPricesForDisplay(): InputPriceRow[] {
    const rows = this.inputPrices();
    return rows.map((r, i) => ({ ...r, stt: i + 1 }));
  }

  formatUsd(value: number | null): string {
    if (value == null || isNaN(value)) return '';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  formatVnd(value: number | null): string {
    if (value == null || isNaN(value)) return '';
    return Math.round(value).toLocaleString('vi-VN');
  }

  onBack() {
    this.router.navigate(['/phoi-gang', this.id()], {
      queryParams: { ma: this.maGang() },
    });
  }
}

