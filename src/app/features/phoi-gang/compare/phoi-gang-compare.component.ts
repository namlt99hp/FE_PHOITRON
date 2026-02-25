import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { PhuongAnPhoiService } from '../../../core/services/phuong-an-phoi.service';
import { LoaiQuangEnum } from '../../../core/enums/loaiquang.enum';
import {
  PlanThieuKetSectionDto,
  PlanSectionDto,
  BangChiPhiLoCaoDto,
} from '../../../core/models/phuong-an-phoi.model';

interface ExcelRow {
  name: string;
  unit: string | null;
  isSectionHeader: boolean;
  isBold: boolean;
  isYellow: boolean;
  /** Dòng đặc biệt: Tỷ lệ phối Thiêu kết (sum childComponents) */
  isThieuKetSumRow?: boolean;
  backgroundColor?: string;
  values: { [planName: string]: number | string | null };
}

// Mock response models (BE -> FE) per plan
interface PlanMetricResponse {
  key: string;
  value: number | string | null;
}
interface PlanComparisonPlanData {
  planId: number;
  planName: string;
  metrics: PlanMetricResponse[];
}

@Component({
  selector: 'app-phoi-gang-compare',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatTooltipModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './phoi-gang-compare.component.html',
  styleUrl: './phoi-gang-compare.component.scss',
})
export class PhoiGangCompareComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paService = inject(PhuongAnPhoiService);

  readonly id = signal<number>(Number(this.route.snapshot.paramMap.get('id')));
  readonly maGang = signal<string>(
    this.route.snapshot.queryParamMap.get('ma') || ''
  );

  readonly plans = signal<any[]>([]);
  readonly loading = signal<boolean>(true);
  readonly excelData = signal<ExcelRow[]>([]);
  readonly planColumns = signal<string[]>([]);
  readonly planSectionsData = signal<PlanSectionDto[]>([]);

  // Form controls for calculation parameters
  readonly tyleTFE = new FormControl<number>(1);
  readonly tyleTong = new FormControl<number>(100);
  readonly sanluongGiamTFE = new FormControl<number>(2.5);
  readonly sanluongGiamTong = new FormControl<number>(7);
  readonly tieuhaoTangTFE = new FormControl<number>(1.5);
  readonly tieuhaoTangTong = new FormControl<number>(15);

  constructor() {}

  ngOnInit() {
    this.loadPlans();
    this.loadPlanSectionsData();
    this.setupFormControlSubscriptions();
  }

  private setupFormControlSubscriptions() {
    // Subscribe to all form control changes to recalculate when values change
    const formControls = [
      this.tyleTFE,
      this.tyleTong,
      this.sanluongGiamTFE,
      this.sanluongGiamTong,
      this.tieuhaoTangTFE,
      this.tieuhaoTangTong,
    ];

    formControls.forEach((control) => {
      control.valueChanges.subscribe(() => {
        this.recalculateSanLuongSection();
      });
    });
  }

  private recalculateSanLuongSection() {
    const currentData = this.excelData();
    const planSectionsData = this.planSectionsData();
    if (planSectionsData.length > 0) {
      const updatedData = this.updateSanLuongSection(
        currentData,
        planSectionsData
      );
      const updatedCokeData = this.updateTieuHaoCokeSection(
        currentData,
        planSectionsData
      );
      this.excelData.set(updatedData);
      this.excelData.set(updatedCokeData);
    } else {
    }
  }

  private loadPlanSectionsData() {
    const gangDichId = this.id();
    // Load both Thiêu Kết and Lò Cao sections
    this.paService.getPlanSectionsByGangDich(gangDichId, true, true).subscribe({
      next: (res) => {
        if (res?.data && res.data.length > 0) {
          this.planSectionsData.set(res.data);

          // Update plan columns based on real data
          const planNames = res.data.map((plan) => plan.ten_Phuong_An);
          this.planColumns.set(planNames);

          // Update plans signal with real data
          const plans = res.data.map((plan) => ({
            id: plan.planId,
            ten_Phuong_An: plan.ten_Phuong_An,
            ngay_Tinh_Toan: plan.ngay_Tinh_Toan || '',
          }));
          this.plans.set(plans);

          // Update the Excel data with real data
          this.updateExcelDataWithRealSections(res.data);
        }
      },
      error: (err) => {
        console.error('[PlanSectionsByGangDich][error]', err);
      },
    });
  }

  private updateExcelDataWithRealSections(planSectionsData: PlanSectionDto[]) {
    const currentData = this.excelData();
    let updatedData = [...currentData];

    // Update Thiêu Kết section if available (chỉ dùng childComponents = quặng thành phần của quặng loại 7)
    const plansWithThieuKet = planSectionsData.filter(
      (plan) =>
        plan.thieuKet != null
    );
    if (plansWithThieuKet.length > 0) {
      updatedData = this.updateThieuKetSection(updatedData, plansWithThieuKet);
    }

    // Update Lò Cao section if available
    const plansWithLoCao = planSectionsData.filter(
      (plan) =>
        plan.loCao && plan.loCao.components && plan.loCao.components.length > 0
    );
    if (plansWithLoCao.length > 0) {
      updatedData = this.updateLoCaoSection(updatedData, plansWithLoCao);
    }

    // Add Sản lượng section
    updatedData = this.updateSanLuongSection(updatedData, planSectionsData);
    // Add Tiêu hao coke 25-80 section
    updatedData = this.updateTieuHaoCokeSection(updatedData, planSectionsData);
    // Add Giá thành gang section
    updatedData = this.updateGiaThanhGangSection(updatedData, planSectionsData);

    this.excelData.set(updatedData);
  }

  private updateThieuKetSection(
    updatedData: ExcelRow[],
    plansWithThieuKet: PlanSectionDto[]
  ): ExcelRow[] {
    // Find the Thiêu Kết section in the Excel data
    const thieuKetSectionIndex = updatedData.findIndex(
      (row) => row.name === '1. THIÊU KẾT' && row.isSectionHeader
    );

    if (thieuKetSectionIndex === -1) {
      return updatedData;
    }

    // Get all unique ore names from childComponents (quặng thành phần của quặng loại 7)
    const allOreNames = new Set<string>();
    plansWithThieuKet.forEach((plan) => {
      if (plan.thieuKet?.childComponents) {
        plan.thieuKet.childComponents.forEach((component: any) => {
          allOreNames.add(component.tenQuang);
        });
      }
    });

    // Create ore rows for each unique ore
    const oreRows: ExcelRow[] = [];
    allOreNames.forEach((oreName) => {
      const values: { [planName: string]: number | string | null } = {};

      // Initialize all plan columns with 0 or null
      this.planColumns().forEach((planName) => {
        values[planName] = null;
      });

      // Fill in actual values from childComponents
      plansWithThieuKet.forEach((plan) => {
        if (plan.thieuKet?.childComponents) {
          const component = plan.thieuKet.childComponents.find(
            (c: any) => c.tenQuang === oreName
          );
          if (component) {
            values[plan.ten_Phuong_An] = component.tiLePhanTram;
          }
        }
      });

      oreRows.push({
        name: oreName,
        unit: '%',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: values,
      });
    });

    // Sort ore rows by name
    oreRows.sort((a, b) => a.name.localeCompare(b.name));

    // Row đầu tiên: Tỷ lệ phối Thiêu kết = sum các quặng phối trong section thiêu kết (childComponents)
    const tiLePhoiThieuKetValues: { [planName: string]: number | string | null } = {};
    this.planColumns().forEach((planName) => {
      tiLePhoiThieuKetValues[planName] = null;
    });
    plansWithThieuKet.forEach((plan) => {
      const childComps = plan.thieuKet?.childComponents ?? [];
      const sum = childComps.reduce(
        (acc: number, c: any) => acc + (Number(c?.tiLePhanTram) || 0),
        0
      );
      tiLePhoiThieuKetValues[plan.ten_Phuong_An] = sum > 0 ? sum : null;
    });
    const tiLePhoiThieuKetRow: ExcelRow = {
      name: 'Tỷ lệ phối Thiêu kết',
      unit: '%',
      isSectionHeader: false,
      isBold: true,
      isYellow: false,
      isThieuKetSumRow: true,
      values: tiLePhoiThieuKetValues,
    };

    // Add KPI rows after ore components
    const kpiRows: ExcelRow[] = [
      {
        name: 'Tiêu hao quặng thiêu kết',
        unit: 'tấn/tsp',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createThieuKetKpiValues(
          plansWithThieuKet,
          'tK_TIEU_HAO_QTK'
        ),
      },
      {
        name: 'SiO2 trong Qtk',
        unit: '%',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createThieuKetKpiValues(plansWithThieuKet, 'tK_SIO2_QTK'),
      },
      {
        name: 'TFe',
        unit: '%',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createThieuKetKpiValues(plansWithThieuKet, 'tK_TFE'),
      },
      {
        name: 'R2',
        unit: '%',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createThieuKetKpiValues(plansWithThieuKet, 'tK_R2'),
      },
      {
        name: 'Phẩm vị quặng vào lò',
        unit: '%',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createThieuKetKpiValues(
          plansWithThieuKet,
          'tK_PHAM_VI_VAO_LO'
        ),
      },
      {
        name: 'Giá thành QTK',
        unit: 'VND/tấn',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createThieuKetKpiValues(plansWithThieuKet, 'tK_COST'),
      },
    ];

    // Find where to insert the new rows (after the section header)
    const insertIndex = thieuKetSectionIndex + 1;

    // Remove existing Thiêu Kết content (keep only the section header)
    const afterThieuKetIndex = updatedData.findIndex(
      (row, index) =>
        index > thieuKetSectionIndex &&
        (row.isSectionHeader ||
          row.name.startsWith('2.') ||
          row.name.startsWith('3.'))
    );

    const endIndex =
      afterThieuKetIndex === -1 ? updatedData.length : afterThieuKetIndex;

    // Replace the content between section header and next section
    const newData = [
      ...updatedData.slice(0, insertIndex),
      tiLePhoiThieuKetRow,
      ...oreRows,
      ...kpiRows,
      ...updatedData.slice(endIndex),
    ];

    return newData;
  }

  private updateLoCaoSection(
    updatedData: ExcelRow[],
    plansWithLoCao: PlanSectionDto[]
  ) {
    // Find the Lò Cao section in the Excel data
    const loCaoSectionIndex = updatedData.findIndex(
      (row) => row.name === '2. LÒ CAO' && row.isSectionHeader
    );

    if (loCaoSectionIndex === -1) {
      return updatedData;
    }

    // Quặng loại 7 (QuangPA): không hiển thị riêng, gom vào một dòng "Quặng Thiêu kết", render hàng đầu tiên. Các quặng khác: một dòng theo tên.
    const DISPLAY_NAME_THIEU_KET = 'Quặng Thiêu kết';
    const hasAnyQuangPA = plansWithLoCao.some(
      (plan) => plan.loCao?.components?.some((c: any) => c.loaiQuang === LoaiQuangEnum.QuangPA || c.loaiQuang === 7)
    );
    const allOreNames = new Set<string>();
    if (hasAnyQuangPA) {
      allOreNames.add(DISPLAY_NAME_THIEU_KET);
    }
    plansWithLoCao.forEach((plan) => {
      if (plan.loCao?.components) {
        plan.loCao.components.forEach((component: any) => {
          if (component.loaiQuang === LoaiQuangEnum.QuangPA || component.loaiQuang === 7) {
            return; // QuangPA: không thêm tên riêng, đã gom vào Quặng Thiêu kết
          }
          allOreNames.add(component.tenQuang);
        });
      }
    });

    const oreRows: ExcelRow[] = [];
    allOreNames.forEach((oreName) => {
      const values: { [planName: string]: number | string | null } = {};
      this.planColumns().forEach((planName) => {
        values[planName] = null;
      });

      const isThieuKetRow = oreName === DISPLAY_NAME_THIEU_KET;

      plansWithLoCao.forEach((plan) => {
        if (!plan.loCao?.components) return;
        if (isThieuKetRow) {
          const thieuKetComponents = plan.loCao.components.filter(
            (c: any) => c.loaiQuang === LoaiQuangEnum.QuangPA || c.loaiQuang === 7
          );
          const sum = thieuKetComponents.reduce(
            (acc: number, c: any) => acc + (Number(c.tiLePhanTram) || 0),
            0
          );
          if (thieuKetComponents.length > 0) {
            values[plan.ten_Phuong_An] = sum;
          }
        } else {
          const component = plan.loCao.components.find(
            (c: any) => c.tenQuang === oreName
          );
          if (component) {
            values[plan.ten_Phuong_An] = component.tiLePhanTram;
          }
        }
      });

      oreRows.push({
        name: oreName,
        unit: '%',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: values,
      });
    });

    // Hàng "Quặng Thiêu kết" đầu tiên, các hàng còn lại sort theo tên
    oreRows.sort((a, b) => {
      if (a.name === DISPLAY_NAME_THIEU_KET) return -1;
      if (b.name === DISPLAY_NAME_THIEU_KET) return 1;
      return a.name.localeCompare(b.name);
    });

    // Add KPI rows after ore components
    const kpiRows: ExcelRow[] = [
      {
        name: 'Sản lượng gang',
        unit: 'tấn/ngày',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_SAN_LUONG_GANG'),
      },
      {
        name: 'Tiêu hao quặng',
        unit: 'kg/tsp',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_TIEU_HAO_QUANG'),
      },
      {
        name: 'Coke 25-80',
        unit: 'kg/tsp',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_COKE_25_80'),
      },
      {
        name: 'Coke 10-25',
        unit: 'kg/tsp',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_COKE_10_25'),
      },
      {
        name: 'Than phun',
        unit: 'kg/tsp',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_THAN_PHUN'),
      },
      {
        name: 'Tổng nhiên liệu',
        unit: 'kg/tsp',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_TONG_NHIEU_LIEU'),
      },
      {
        name: 'Xuất lượng xỉ',
        unit: 'kg/tsp',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_XUAT_LUONG_XI'),
      },
      {
        name: 'Độ kiềm đơn R2',
        unit: '',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_R2'),
      },
      {
        name: 'Tổng KLK vào lò cao',
        unit: 'kg/tsp',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_TONG_KLK_VAO_LO'),
      },
      {
        name: 'Tổng Zn vào lò',
        unit: 'kg/tsp',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_TONG_ZN_VAO_LO'),
      },
      {
        name: 'Phẩm vị quặng vào lò',
        unit: '%',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_PHAM_VI_VAO_LO'),
      },
      {
        name: 'Chênh lệch TFe vào lò',
        unit: '%',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.calculateTFeChieuLech(plansWithLoCao, 'lC_PHAM_VI_VAO_LO'),
      },
      {
        name: 'Ti trong gang',
        unit: '%',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_TI_TRONG_GANG'),
      },
      {
        name: 'Mn trong gang',
        unit: '%',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: this.createLoCaoKpiValues(plansWithLoCao, 'lC_MN_TRONG_GANG'),
      },
    ];

    // Find where to insert the new rows (after the section header)
    const insertIndex = loCaoSectionIndex + 1;

    // Remove existing Lò Cao content (keep only the section header)
    const afterLoCaoIndex = updatedData.findIndex(
      (row, index) =>
        index > loCaoSectionIndex &&
        (row.isSectionHeader ||
          row.name.startsWith('3.') ||
          row.name.startsWith('4.'))
    );

    const endIndex =
      afterLoCaoIndex === -1 ? updatedData.length : afterLoCaoIndex;

    // Replace the content between section header and next section
    const newData = [
      ...updatedData.slice(0, insertIndex),
      ...oreRows,
      ...kpiRows,
      ...updatedData.slice(endIndex),
    ];

    return newData;
  }

  private createThieuKetKpiValues(
    plansWithThieuKet: PlanSectionDto[],
    kpiKey:
      | 'tK_TIEU_HAO_QTK'
      | 'tK_SIO2_QTK'
      | 'tK_TFE'
      | 'tK_R2'
      | 'tK_PHAM_VI_VAO_LO'
      | 'tK_COST'
  ): { [planName: string]: number | string | null } {
    const values: { [planName: string]: number | string | null } = {};

    // Initialize all plan columns with null
    this.planColumns().forEach((planName) => {
      values[planName] = null;
    });

    // Fill in actual values from the data
    plansWithThieuKet.forEach((plan) => {
      if (plan.thieuKet) {
        const value = plan.thieuKet[kpiKey];
        if (value !== null && value !== undefined) {
          values[plan.ten_Phuong_An] = value;
        }
      }
    });

    return values;
  }

  private createLoCaoKpiValues(
    plansWithLoCao: PlanSectionDto[],
    kpiKey: string
  ): { [planName: string]: number | string | null } {
    const values: { [planName: string]: number | string | null } = {};

    // Initialize all plan columns with null
    this.planColumns().forEach((planName) => {
      values[planName] = null;
    });

    // Fill in actual values from the data
    plansWithLoCao.forEach((plan) => {
      if (plan.loCao) {
        const value = plan.loCao[kpiKey as keyof typeof plan.loCao];
        if (
          value !== null &&
          value !== undefined &&
          typeof value === 'number'
        ) {
          values[plan.ten_Phuong_An] = value;
        }
      }
    });

    return values;
  }

  private calculateTFeChieuLech(
    plansWithLoCao: PlanSectionDto[],
    kpiKey: string
  ): { [planName: string]: number | string | null } {
    const values: { [planName: string]: number | string | null } = {};

    // Initialize all plan columns with null
    this.planColumns().forEach((planName) => {
      values[planName] = null;
    });

    // Get the first plan's lC_PHAM_VI_VAO_LO value as baseline
    const firstPlan = plansWithLoCao[0];
    const baselineValue = firstPlan?.loCao?.lC_PHAM_VI_VAO_LO;

    if (baselineValue === null || baselineValue === undefined) {
      return values;
    }

    // Calculate chênh lệch for plans from index 1 onwards (skip first plan)
    plansWithLoCao.forEach((plan, index) => {
      // Skip first plan - it's the baseline, no need to show value
      if (index === 0) {
        return;
      }

      // Only calculate if current plan has valid data
      if (
        plan.loCao?.lC_PHAM_VI_VAO_LO !== null &&
        plan.loCao?.lC_PHAM_VI_VAO_LO !== undefined
      ) {
        const currentValue = plan.loCao.lC_PHAM_VI_VAO_LO;
        const chieuLech = baselineValue - currentValue;
        values[plan.ten_Phuong_An] = chieuLech;
      }
      // If current plan has no data, leave as null (won't show)
    });

    return values;
  }

  private updateSanLuongSection(
    updatedData: ExcelRow[],
    planSectionsData: PlanSectionDto[]
  ): ExcelRow[] {
    // Find existing "3. SẢN LƯỢNG" section to replace it
    const existingSanLuongIndex = updatedData.findIndex(
      (row) => row.name === '3. SẢN LƯỢNG' || row.name?.includes('SẢN LƯỢNG')
    );

    if (existingSanLuongIndex === -1) {
      // If no existing Sản lượng section found, add at the end
      return this.addSanLuongSectionToEnd(updatedData, planSectionsData);
    }

    // Find the end of existing Sản lượng section
    let endIndex = existingSanLuongIndex + 1;
    while (
      endIndex < updatedData.length &&
      !updatedData[endIndex].isSectionHeader
    ) {
      endIndex++;
    }

    // Create new Sản lượng section rows
    const sanLuongRows = this.createSanLuongSectionRows(planSectionsData);

    // Replace the existing Sản lượng section
    updatedData.splice(
      existingSanLuongIndex,
      endIndex - existingSanLuongIndex,
      ...sanLuongRows
    );

    return updatedData;
  }

  private addSanLuongSectionToEnd(
    updatedData: ExcelRow[],
    planSectionsData: PlanSectionDto[]
  ): ExcelRow[] {
    const sanLuongRows = this.createSanLuongSectionRows(planSectionsData);
    return [...updatedData, ...sanLuongRows];
  }

  private createSanLuongSectionRows(
    planSectionsData: PlanSectionDto[]
  ): ExcelRow[] {
    const rows: ExcelRow[] = [];

    // Section header
    rows.push({
      name: '3. SẢN LƯỢNG',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      backgroundColor: '#E6F3FF',
      values: {},
    });

    // Sản lượng rows
    rows.push({
      name: 'Sản lượng giảm do TFe giảm',
      unit: 'tấn/ngày',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.calculateSanLuongGiamDoTFeGiam(planSectionsData),
    });

    rows.push({
      name: 'Sản lượng giảm do Tổng xỉ tăng',
      unit: 'tấn/ngày',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.calculateSanLuongGiamDoTongXiTang(planSectionsData),
    });

    rows.push({
      name: 'Sản lượng giảm do Quặng sống',
      unit: 'tấn/ngày',
      isSectionHeader: false,
      isBold: false,
      isYellow: true,
      values: this.calculateSanLuongGiamDoQuangSong(planSectionsData),
    });

    rows.push({
      name: 'Tổng sản lượng giảm',
      unit: 'tấn/ngày',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.calculateTongSanLuongGiam(planSectionsData),
    });

    rows.push({
      name: 'Sản lượng thực',
      unit: 'tấn/ngày',
      isSectionHeader: false,
      isBold: true,
      isYellow: false,
      values: this.calculateSanLuongThuc(planSectionsData),
    });

    return rows;
  }

  private updateTieuHaoCokeSection(
    updatedData: ExcelRow[],
    planSectionsData: PlanSectionDto[]
  ): ExcelRow[] {
    // Insert after Sản lượng section; replace if exists
    const existingIndex = updatedData.findIndex(
      (r) => r.name === '4. TIÊU HAO COKE 25-80' && r.isSectionHeader
    );
    const rows = this.createTieuHaoCokeSectionRows(planSectionsData);
    if (existingIndex === -1) {
      return [...updatedData, ...rows];
    }
    // find end of current section
    let end = existingIndex + 1;
    while (end < updatedData.length && !updatedData[end].isSectionHeader) end++;
    updatedData.splice(existingIndex, end - existingIndex, ...rows);
    return updatedData;
  }

  private createTieuHaoCokeSectionRows(
    planSectionsData: PlanSectionDto[]
  ): ExcelRow[] {
    const rows: ExcelRow[] = [];
    rows.push({
      name: '4. TIÊU HAO COKE 25-80',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      backgroundColor: '#E6F3FF',
      values: {},
    });

    rows.push({
      name: 'Tiêu hao tăng do TFe giảm',
      unit: 'kg/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.calculateCokeTangDoTFeGiam(planSectionsData),
    });

    rows.push({
      name: 'Tiêu hao tăng do Tổng xỉ tăng',
      unit: 'kg/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.calculateCokeTangDoTongXiTang(planSectionsData),
    });

    rows.push({
      name: 'Tiêu hao tăng do tăng quặng sống',
      unit: 'kg/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: true,
      values: this.calculateCokeTangDoQuangSong(planSectionsData),
    });

    rows.push({
      name: 'Tiêu hao tăng do tăng nhiệt xỉ',
      unit: 'kg/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: true,
      values: this.calculateCokeTangDoTangNhietXi(planSectionsData),
    });

    rows.push({
      name: 'Tổng tiêu hao coke 25-80 tăng',
      unit: 'kg/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: this.calculateTongCoke2580Tang(planSectionsData),
    });

    rows.push({
      name: 'Tiêu hao coke 25-80 thực',
      unit: 'kg/tsp',
      isSectionHeader: false,
      isBold: true,
      isYellow: false,
      values: this.calculateCoke2580Thuc(planSectionsData),
    });

    return rows;
  }

  private updateGiaThanhGangSection(
    updatedData: ExcelRow[],
    planSectionsData: PlanSectionDto[]
  ): ExcelRow[] {
    const existingIndex = updatedData.findIndex(
      (r) => r.name === '5. GIÁ THÀNH GANG' && r.isSectionHeader
    );
    const rowsGiaThanh = this.createGiaThanhGangRows(planSectionsData);
    const rowsSoSanh = this.createSoSanhGiaThanhRows(planSectionsData);
    const rows = [...rowsGiaThanh, ...rowsSoSanh];
    if (existingIndex === -1) {
      return [...updatedData, ...rows];
    }
    let end = existingIndex + 1;
    while (end < updatedData.length && !updatedData[end].isSectionHeader) end++;
    updatedData.splice(existingIndex, end - existingIndex, ...rows);
    return updatedData;
  }

  private createGiaThanhGangRows(
    planSectionsData: PlanSectionDto[]
  ): ExcelRow[] {
    const rows: ExcelRow[] = [];
    rows.push({
      name: '5. GIÁ THÀNH GANG',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      backgroundColor: '#E6F3FF',
      values: {},
    });

    // Tạo map để group dữ liệu theo plan
    const planDataMap = new Map<string, any[]>();
    planSectionsData.forEach(plan => {
      if (plan.bangChiPhiLoCao?.length) {
        planDataMap.set(plan.ten_Phuong_An, plan.bangChiPhiLoCao);
      }
    });

    const DISPLAY_NAME_THIEU_KET = 'Quặng Thiêu kết';
    const hasAnyQuangPA = Array.from(planDataMap.values()).some(data =>
      data.some((item: any) => item.loaiQuang === LoaiQuangEnum.QuangPA || item.loaiQuang === 7)
    );

    // Lấy tất cả tên quặng unique từ tất cả plans
    const allQuangNames = new Set<string>();
    if (hasAnyQuangPA) {
      allQuangNames.add(DISPLAY_NAME_THIEU_KET);
    }
    planDataMap.forEach(data => {
      data.forEach(item => {
        if (item.loaiQuang === LoaiQuangEnum.QuangPA || item.loaiQuang === 7) {
          return; // QuangPA: gom vào Quặng Thiêu kết
        }
        allQuangNames.add(item.tenQuang);
      });
    });

    // Tạo các dòng quặng từ dữ liệu thực tế
    Array.from(allQuangNames).sort((a, b) => {
      if (a === DISPLAY_NAME_THIEU_KET) return -1;
      if (b === DISPLAY_NAME_THIEU_KET) return 1;
      return a.localeCompare(b);
    }).forEach(quangName => {
      const values: { [planName: string]: number | string | null } = {};
      this.planColumns().forEach((planName) => {
        const planData = planDataMap.get(planName);
        if (!planData) {
          values[planName] = null;
          return;
        }

        if (quangName === DISPLAY_NAME_THIEU_KET) {
          const thieuKetItems = planData.filter((item: any) => item.loaiQuang === LoaiQuangEnum.QuangPA || item.loaiQuang === 7);
          const sum = thieuKetItems.reduce((acc: number, it: any) => acc + (Number(it.tieuhao) || 0), 0);
          values[planName] = thieuKetItems.length > 0 ? sum : null;
        } else {
          const quangData = planData.find(item => item.tenQuang === quangName);
          values[planName] = quangData?.tieuhao ?? null;
        }
      });
      
      rows.push({
        name: quangName,
        unit: 'tấn/tsp',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values,
      });
    });

    // Các dòng cố định thuộc section 5. GIÁ THÀNH GANG
    const fixedItems: { name: string; unit: string | null; bold?: boolean }[] = [
      { name: 'Chi phí SX chung (Nhân công, bảo trì, sửa chữa, tiêu hao khác...)', unit: 'VNĐ/tsp' },
      { name: 'Tổng', unit: 'VNĐ/tsp', bold: true },
      { name: 'Chi phí cơ hội (lợi nhuận/ tấn thép)', unit: 'VNĐ/tsp' },
    ];

    fixedItems.forEach((item) => {
      const values: { [planName: string]: number | string | null } = {};
      this.planColumns().forEach((planName) => {
        if (item.name === 'Chi phí SX chung (Nhân công, bảo trì, sửa chữa, tiêu hao khác...)') {
          values[planName] = 1;
        } else if (item.name === 'Tổng') {
          const plan = planSectionsData.find((p) => p.ten_Phuong_An === planName);
          values[planName] = plan?.loCao?.tongChiPhi ?? null;
        } else {
          values[planName] = null;
        }
      });
      rows.push({
        name: item.name,
        unit: item.unit,
        isSectionHeader: false,
        isBold: !!item.bold,
        isYellow: false,
        values,
      });
    });

    return rows;
  }

  /** Section riêng: So sánh giá thành các phương án (header + các dòng so sánh). */
  private createSoSanhGiaThanhRows(planSectionsData: PlanSectionDto[]): ExcelRow[] {
    const rows: ExcelRow[] = [];
    rows.push({
      name: '6. SO SÁNH GIÁ THÀNH CÁC PHƯƠNG ÁN',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      backgroundColor: '#E6F3FF',
      values: {},
    });
    const soSanhItems: { name: string; unit: string | null; bold?: boolean }[] = [
      { name: 'Chênh lệch PA0', unit: 'VNĐ/tsp' },
      { name: 'Chi phí SX chung tăng thêm', unit: 'VNĐ/tsp' },
      { name: 'Giá thành chênh thực so PA0', unit: 'VNĐ/tsp', bold: true },
      { name: 'Giá thành sản xuất', unit: 'VNĐ/tsp', bold: true },
      { name: 'Chi phí cơ hội giảm', unit: 'VNĐ/tsp' },
      { name: 'Giá thành Gang xuất xưởng', unit: 'VNĐ/tsp', bold: true },
      { name: 'Chênh lệch', unit: 'VNĐ/tsp' },
    ];
    const chiPhiSXChungTangThem = this.calculateChiPhiSXChungTangThem(planSectionsData);
    soSanhItems.forEach((item) => {
      const values: { [planName: string]: number | string | null } = {};
      if (item.name === 'Chi phí SX chung tăng thêm') {
        this.planColumns().forEach((p) => (values[p] = chiPhiSXChungTangThem[p] ?? null));
      } else {
        this.planColumns().forEach((p) => (values[p] = null));
      }
      rows.push({
        name: item.name,
        unit: item.unit,
        isSectionHeader: false,
        isBold: !!item.bold,
        isYellow: false,
        values,
      });
    });
    return rows;
  }

  private loadPlans() {
    this.loading.set(true);

    // Generate initial Excel data with mock data for other sections
    // The Thiêu Kết section will be replaced with real data when API call completes
    this.generateInitialExcelData();
    this.loading.set(false);
  }

  private generateInitialExcelData() {
    // Create initial Excel data structure with mock data for non-Thiêu Kết sections
    const data: ExcelRow[] = [];

    // 1. THIÊU KẾT Section (will be replaced with real data)
    data.push({
      name: '1. THIÊU KẾT',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      backgroundColor: '#E6F3FF',
      values: {},
    });

    // Add placeholder for Thiêu Kết content (will be replaced)
    data.push({
      name: 'Đang tải dữ liệu Thiêu Kết...',
      unit: null,
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: {},
    });

    // 2. LÒ CAO Section (mock data for now)
    data.push({
      name: '2. LÒ CAO',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      backgroundColor: '#E6F3FF',
      values: {},
    });

    // Add mock Lò Cao data
    const locaoMaterials = [
      {
        name: 'Quặng thiêu kết',
        values: { PA0: 100, 'PA1-5% AC+ BRBF': 100 } as {
          [planId: string]: number;
        },
      },
      {
        name: 'Coke',
        values: { PA0: 450, 'PA1-5% AC+ BRBF': 445 } as {
          [planId: string]: number;
        },
      },
      {
        name: 'Đá vôi',
        values: { PA0: 120, 'PA1-5% AC+ BRBF': 118 } as {
          [planId: string]: number;
        },
      },
    ];

    locaoMaterials.forEach((material) => {
      data.push({
        name: material.name,
        unit: 'kg/tsp',
        isSectionHeader: false,
        isBold: false,
        isYellow: false,
        values: material.values,
      });
    });

    // 3. SẢN LƯỢNG Section
    data.push({
      name: '3. SẢN LƯỢNG',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      backgroundColor: '#E6F3FF',
      values: {},
    });

    data.push({
      name: 'Sản lượng gang',
      unit: 'tấn/ngày',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: { PA0: 2500, 'PA1-5% AC+ BRBF': 2550 } as {
        [planId: string]: number;
      },
    });

    // 4. TIÊU HAO COKE Section
    data.push({
      name: '4. TIÊU HAO COKE 25-80',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      backgroundColor: '#E6F3FF',
      values: {},
    });

    data.push({
      name: 'Tiêu hao coke',
      unit: 'kg/tsp',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: { PA0: 450, 'PA1-5% AC+ BRBF': 445 } as {
        [planId: string]: number;
      },
    });

    // 5. GIÁ THÀNH GANG Section
    data.push({
      name: '5. GIÁ THÀNH GANG',
      unit: null,
      isSectionHeader: true,
      isBold: true,
      isYellow: false,
      backgroundColor: '#E6F3FF',
      values: {},
    });

    data.push({
      name: 'Giá thành gang',
      unit: 'VND/tấn',
      isSectionHeader: false,
      isBold: false,
      isYellow: false,
      values: { PA0: 15000000, 'PA1-5% AC+ BRBF': 14800000 } as {
        [planId: string]: number;
      },
    });

    // 6. SO SÁNH GIÁ THÀNH Section
    // data.push({
    //   name: '6. SO SÁNH GIÁ THÀNH',
    //   unit: null,
    //   isSectionHeader: true,
    //   isBold: true,
    //   isYellow: false,
    //   backgroundColor: '#E6F3FF',
    //   values: {},
    // });

    // data.push({
    //   name: 'Chênh lệch so với PA0',
    //   unit: 'VND/tấn',
    //   isSectionHeader: false,
    //   isBold: false,
    //   isYellow: false,
    //   values: { PA0: 0, 'PA1-5% AC+ BRBF': -200000 } as {
    //     [planId: string]: number;
    //   },
    // });

    this.excelData.set(data);
  }

  onBack() {
    this.router.navigate(['/phoi-gang', this.id()], {
      queryParams: { ma: this.maGang() },
    });
  }

  // Helper methods for template
  getExcelData() {
    return this.excelData();
  }

  getPlanColumns() {
    return this.planColumns();
  }

  getValueForPlan(row: ExcelRow, planName: string): string {
    const value = row.values[planName];
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      if (row.unit === '%') {
        return value === 0 ? '' : `${value}%`;
      }
      return value.toString();
    }
    return value.toString();
  }

  formatValue(value: number | string | null, unit: string | null): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      if (unit === '%') {
        return value === 0 ? '' : `${value.toFixed(2)}%`;
      }
      if (value === 0) return '';

      const unitNorm = (unit ?? '').toLowerCase().replace(/\s+/g, '');
      const isVnd = unitNorm.includes('vnd') || unitNorm.includes('vnđ');
      const isPerTon = unitNorm.includes('/tấn') || unitNorm.includes('/tan');

      // VND/tấn: làm tròn, không thập phân
      if (isVnd && isPerTon) {
        return Math.round(value).toLocaleString('vi-VN');
      }

      // Các unit tiền tệ khác (VNĐ/...) cũng không cần thập phân
      if (isVnd) {
        return Math.round(value).toLocaleString('vi-VN');
      }

      // Các unit khác %: format có phân tách hàng nghìn (cách 3 chữ số), giữ 2 chữ số thập phân như hiện tại
      return new Intl.NumberFormat('vi-VN', {
        useGrouping: true,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
    return value.toString();
  }

  // Sản lượng calculation functions
  private calculateSanLuongGiamDoTFeGiam(planSectionsData: PlanSectionDto[]): {
    [planName: string]: number | string | null;
  } {
    const values: { [planName: string]: number | string | null } = {};

    // Initialize all plan columns with null
    this.planColumns().forEach((planName) => {
      values[planName] = null;
    });

    // Get form control value (percentage -> normalize to fraction)
    const sanluongGiamTFEValuePct = (this.sanluongGiamTFE.value || 0) / 100;

    // Get baseline values from first plan
    const firstPlan = planSectionsData[0];
    const baselineTFeValue = firstPlan?.loCao?.lC_PHAM_VI_VAO_LO;
    const baselineSanLuongGang = firstPlan?.loCao?.lC_SAN_LUONG_GANG;

    if (
      baselineTFeValue === null ||
      baselineTFeValue === undefined ||
      baselineSanLuongGang === null ||
      baselineSanLuongGang === undefined
    ) {
      return values; // No baseline data available
    }

    // Calculate for each plan
    planSectionsData.forEach((plan, index) => {
      // Skip first plan - it's the baseline
      if (index === 0) {
        values[plan.ten_Phuong_An] = 0; // Baseline plan has no reduction
        return;
      }

      // Check if plan has LoCao data

      if (plan.loCao?.lC_PHAM_VI_VAO_LO) {
        const currentTFeValue = plan.loCao.lC_PHAM_VI_VAO_LO;

        // Calculate TFe difference (baseline - current)
        const chenhLechTFe = baselineTFeValue - currentTFeValue;

        // Formula: Sản lượng gang x Chênh lệch TFe x Tham số nhập (% -> fraction)
        const result =
          baselineSanLuongGang * chenhLechTFe * sanluongGiamTFEValuePct;

        values[plan.ten_Phuong_An] = Math.round(result * 100) / 100; // Round to 2 decimal places
      }
    });

    return values;
  }

  private calculateSanLuongGiamDoTongXiTang(
    planSectionsData: PlanSectionDto[]
  ): { [planName: string]: number | string | null } {
    const values: { [planName: string]: number | string | null } = {};

    // Initialize all plan columns with null
    this.planColumns().forEach((planName) => {
      values[planName] = null;
    });

    // Get form control values for formula: (E56 - $D$56)/$N$7*$P$7*$D$50
    const tyleTongValue = this.tyleTong.value || 0; // $N$7 (divisor)
    const sanLuongGiamTongFactor = (this.sanluongGiamTong.value || 0) / 100; // $P$7 (%) -> fraction

    // Get baseline data from first plan
    const firstPlan = planSectionsData[0];
    const baselineXuatLuongXi = firstPlan?.loCao?.lC_XUAT_LUONG_XI;
    const baselineSanLuongGang = firstPlan?.loCao?.lC_SAN_LUONG_GANG;

    if (
      baselineXuatLuongXi === null ||
      baselineXuatLuongXi === undefined ||
      baselineSanLuongGang === null ||
      baselineSanLuongGang === undefined ||
      tyleTongValue === 0
    ) {
      return values; // No baseline data or division by zero
    }

    // Calculate for each plan
    planSectionsData.forEach((plan, index) => {
      // Check if plan has LoCao data
      if (plan.loCao?.lC_XUAT_LUONG_XI) {
        const currentXuatLuongXi = plan.loCao.lC_XUAT_LUONG_XI;

        // Calculate xỉ difference (current - baseline)
        const chenhLechXi = currentXuatLuongXi - baselineXuatLuongXi;

        // Formula: (E56 - $D$56)/$N$7*$P$7*$D$50
        const result =
          (chenhLechXi / tyleTongValue) *
          sanLuongGiamTongFactor *
          baselineSanLuongGang;

        values[plan.ten_Phuong_An] = Math.round(result * 100) / 100; // Round to 2 decimal places
      }
    });

    return values;
  }

  private calculateSanLuongGiamDoQuangSong(
    planSectionsData: PlanSectionDto[]
  ): { [planName: string]: number | string | null } {
    const values: { [planName: string]: number | string | null } = {};

    // Initialize all plan columns with null
    this.planColumns().forEach((planName) => {
      values[planName] = null;
    });

    // Tính theo công thức: SUM(tiLePhanTram của các quặng có loại quặng = 5 trong loCao section) x 1% x lC_SAN_LUONG_GANG / 10%
    planSectionsData.forEach((plan) => {
      const planName = plan.ten_Phuong_An;
      const loCao = plan.loCao;
      
      if (!loCao || !loCao.components || loCao.lC_SAN_LUONG_GANG == null) {
        return;
      }

      // Lọc các quặng có loại quặng = QuangCo (5) và tính tổng tiLePhanTram
      const componentsWithLoai5 = loCao.components.filter((component) => {
        return component.loaiQuang === LoaiQuangEnum.QuangCo;
      });

      const sumTiLePhanTram = componentsWithLoai5.reduce((sum, comp) => sum + (comp.tiLePhanTram || 0), 0);

      // Công thức: SUM x 1% x lC_SAN_LUONG_GANG / 10%
      const result = (sumTiLePhanTram / 100 * 0.01 * loCao.lC_SAN_LUONG_GANG) / 0.1;
      values[planName] = Math.round(result * 100) / 100;
    });

    return values;
  }

  // Placeholder coke calculation functions – will be filled with real formulas later
  private calculateCokeTangDoTFeGiam(planSectionsData: PlanSectionDto[]): {
    [planName: string]: number | string | null;
  } {
    const values: { [planName: string]: number | string | null } = {};
    // initialize
    this.planColumns().forEach((planName) => {
      values[planName] = null;
    });

    // input factor (% -> fraction) - coerce to number to avoid string/NaN
    const tfeRaw = this.tieuhaoTangTFE.value;
    const tfeFactor = Number(tfeRaw ?? 0) / 100;
    
    // baseline coke from first plan
    const first = planSectionsData[0];
    const baselineCoke2580 = first?.loCao?.lC_COKE_25_80;
    if (baselineCoke2580 == null) return values;

    // use existing TFe chênh lệch calculation
    const chenhLechMap = this.calculateTFeChieuLech(planSectionsData, 'lC_PHAM_VI_VAO_LO');

    this.planColumns().forEach(planName => {
      const diff = chenhLechMap[planName];
      if (typeof diff === 'number') {
        const result = tfeFactor * baselineCoke2580 * diff;
        values[planName] = Math.round(result * 100) / 100;
      }
    });

    return values;
  }

  private calculateCokeTangDoTongXiTang(planSectionsData: PlanSectionDto[]): {
    [planName: string]: number | string | null;
  } {
    const values: { [planName: string]: number | string | null } = {};
    // init
    this.planColumns().forEach((p) => (values[p] = null));

    // inputs
    const tyleTongValue = this.tyleTong.value || 0; // divisor
    const tieuhaoTangTongValue = this.tieuhaoTangTong.value || 0; // multiplier (not %)

    // baseline
    const first = planSectionsData[0];
    const baselineXi = first?.loCao?.lC_XUAT_LUONG_XI;
    if (baselineXi == null || tyleTongValue === 0) return values;

    // compute per plan
    planSectionsData.forEach((plan) => {
      const name = plan.ten_Phuong_An;
      const currentXi = plan.loCao?.lC_XUAT_LUONG_XI;
      if (currentXi == null) return;
      const diff = currentXi - baselineXi;
      const result = (diff / tyleTongValue) * tieuhaoTangTongValue;
      values[name] = Math.round(result * 100) / 100;
    });

    return values;
  }

  // hàm đang chưa tính chuẩn
  private calculateCokeTangDoQuangSong(planSectionsData: PlanSectionDto[]): {
    [planName: string]: number | string | null;
  } {
    const values: { [planName: string]: number | string | null } = {};
    this.planColumns().forEach((p) => (values[p] = null));
    planSectionsData.forEach((plan) => {
      const planName = plan.ten_Phuong_An;
      const loCao = plan.loCao;
      
      if (!loCao || !loCao.components || loCao.lC_COKE_25_80 == null) {
        return;
      }

      let sumTiLePhanTram = 0;
      const componentsWithLoai5 = loCao.components.filter((component) => {
        return component.loaiQuang === LoaiQuangEnum.QuangCo;
      });

      sumTiLePhanTram = componentsWithLoai5.reduce((sum, comp) => sum + (comp.tiLePhanTram || 0), 0);
      // Công thức: SUM x 2% x lC_COKE_25_80 / 10% x 0
      const result = (sumTiLePhanTram / 100 * 0.02 * loCao.lC_COKE_25_80 / 0.1) * 0;
      values[planName] = Math.round(result * 100) / 100;
    });

    return values;
  }

// hàm đang chưa tính chuẩn 
  private calculateCokeTangDoTangNhietXi(planSectionsData: PlanSectionDto[]): {
    [planName: string]: number | string | null;
  } {
    const values: { [planName: string]: number | string | null } = {};
    this.planColumns().forEach((p) => (values[p] = null));
    return values;
  }

  private calculateTongCoke2580Tang(planSectionsData: PlanSectionDto[]): {
    [planName: string]: number | string | null;
  } {
    const result: { [planName: string]: number | string | null } = {};
    const byTFe = this.calculateCokeTangDoTFeGiam(planSectionsData);
    const byXi = this.calculateCokeTangDoTongXiTang(planSectionsData);
    const byQuangSong = this.calculateCokeTangDoQuangSong(planSectionsData);
    const byNhietXi = this.calculateCokeTangDoTangNhietXi(planSectionsData);

    this.planColumns().forEach((planName) => {
      const v1 =
        typeof byTFe[planName] === 'number' ? (byTFe[planName] as number) : 0;
      const v2 =
        typeof byXi[planName] === 'number' ? (byXi[planName] as number) : 0;
      const v3 =
        typeof byQuangSong[planName] === 'number'
          ? (byQuangSong[planName] as number)
          : 0;
      const v4 =
        typeof byNhietXi[planName] === 'number'
          ? (byNhietXi[planName] as number)
          : 0;
      const sum = v1 + v2 + v3 + v4;
      result[planName] = Math.round(sum * 100) / 100;
    });

    return result;
  }

  private calculateCoke2580Thuc(planSectionsData: PlanSectionDto[]): {
    [planName: string]: number | string | null;
  } {
    const result: { [planName: string]: number | string | null } = {};
    // Initialize
    this.planColumns().forEach((p) => (result[p] = null));

    // Get total increase per plan
    const tongTang = this.calculateTongCoke2580Tang(planSectionsData);

    // Add LoCao coke 25-80 value for each plan
    planSectionsData.forEach((plan) => {
      const planName = plan.ten_Phuong_An;
      const baseCoke = plan.loCao?.lC_COKE_25_80 ?? null;
      const increase =
        typeof tongTang[planName] === 'number'
          ? (tongTang[planName] as number)
          : 0;

      if (baseCoke !== null) {
        const val = (baseCoke as number) + increase;
        result[planName] = Math.round(val * 100) / 100;
      }
    });

    return result;
  }

  private calculateTongSanLuongGiam(planSectionsData: PlanSectionDto[]): {
    [planName: string]: number | string | null;
  } {
    const result: { [planName: string]: number | string | null } = {};
    const tfeDecrease = this.calculateSanLuongGiamDoTFeGiam(planSectionsData);
    const slagIncrease =
      this.calculateSanLuongGiamDoTongXiTang(planSectionsData);
    const rawOreDecrease =
      this.calculateSanLuongGiamDoQuangSong(planSectionsData);

    // Sum three components per plan; treat non-number/null as 0
    this.planColumns().forEach((planName) => {
      const v1 =
        typeof tfeDecrease[planName] === 'number'
          ? (tfeDecrease[planName] as number)
          : 0;
      const v2 =
        typeof slagIncrease[planName] === 'number'
          ? (slagIncrease[planName] as number)
          : 0;
      const v3 =
        typeof rawOreDecrease[planName] === 'number'
          ? (rawOreDecrease[planName] as number)
          : 0;
      const sum = v1 + v2 + v3;
      result[planName] = Math.round(sum * 100) / 100;
    });

    return result;
  }

  private calculateSanLuongThuc(planSectionsData: PlanSectionDto[]): {
    [planName: string]: number | string | null;
  } {
    const result: { [planName: string]: number | string | null } = {};

    // Baseline: sản lượng gang phương án đầu tiên
    const firstPlan = planSectionsData[0];
    const baselineSanLuongGang = firstPlan?.loCao?.lC_SAN_LUONG_GANG || 0;

    // Tổng sản lượng giảm cho từng phương án
    const tongGiam = this.calculateTongSanLuongGiam(planSectionsData);

    // Tính sản lượng thực = baseline - tổng giảm
    this.planColumns().forEach((planName) => {
      const giam =
        typeof tongGiam[planName] === 'number'
          ? (tongGiam[planName] as number)
          : 0;
      const value = baselineSanLuongGang - giam;
      result[planName] = Math.round(value * 100) / 100;
    });

    return result;
  }

  /**
   * Chi phí SX chung tăng thêm = (Tổng sản lượng giảm của PA - Tổng sản lượng giảm PA đầu) * 600000 / Sản lượng thực PA đầu.
   * Phương án đầu tiên không tính (null).
   */
  private calculateChiPhiSXChungTangThem(planSectionsData: PlanSectionDto[]): {
    [planName: string]: number | string | null;
  } {
    const values: { [planName: string]: number | string | null } = {};
    const firstPlan = planSectionsData[0];
    if (!firstPlan) {
      this.planColumns().forEach((p) => (values[p] = null));
      return values;
    }
    const firstPlanName = firstPlan.ten_Phuong_An;
    const tongSanLuongGiam = this.calculateTongSanLuongGiam(planSectionsData);
    const sanLuongThuc = this.calculateSanLuongThuc(planSectionsData);

    const giam0 = typeof tongSanLuongGiam[firstPlanName] === 'number' ? (tongSanLuongGiam[firstPlanName] as number) : 0;
    const thuc0 = typeof sanLuongThuc[firstPlanName] === 'number' ? (sanLuongThuc[firstPlanName] as number) : 0;

    this.planColumns().forEach((planName) => {
      if (planName === firstPlanName) {
        values[planName] = null;
        return;
      }
      const giam = typeof tongSanLuongGiam[planName] === 'number' ? (tongSanLuongGiam[planName] as number) : 0;
      if (thuc0 <= 0) {
        values[planName] = null;
        return;
      }
      const tangThem = (giam - giam0) * 600000 / thuc0;
      values[planName] = Math.round(tangThem * 100) / 100;
    });
    return values;
  }
}
