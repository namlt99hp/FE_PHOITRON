import { Component, Input, OnInit, OnDestroy, inject, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { QuangService } from '../../../core/services/quang.service';
import { MixRowData, ProcessParamData } from '../../../core/models/mix-row-data.model';
import { ProductTotal } from '../mix-quang-dialog.component';
import { StatisticsEngineService } from '../../../core/services/statistics-engine.service';
import { ThongKeResultResponse } from '../../../core/models/thongke-response.model';

// Interfaces for data structures
export interface GangComposition {
  element: string;
  mass: number;
  percentage: number;
  isCalculated?: boolean | null;
  calcFormula?: string | null;
  tphhId?: number; // Real TPHH ID from API
}

export interface XaComposition {
  element: string;
  mass: number;
  percentage: number;
  isCalculated?: boolean | null;
  calcFormula?: string | null;
  tphhId?: number; // Real TPHH ID from API
}

export interface LocaoStatistics {
  totalOreInput: number;
  totalCokeInput: number;
  totalPulverizedCoalInput: number;
  gangOutput: number;
  xaOutput: number;
  ironOutput: number;
  cokeConsumption: number;
  pulverizedCoalConsumption: number;
  efficiency: number;
}

@Component({
  selector: 'app-locao-result',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './locao-result.component.html',
  styleUrls: ['./locao-result.component.scss']
})
export class LocaoResultComponent implements OnInit, OnDestroy, OnChanges {
  public gangData: GangComposition[] = [];
  public xiData: XaComposition[] = [];
  @Input() statistics: LocaoStatistics | null = null;
  @Input() planName: string = '';
  @Input() planId: number = 0;
  @Input() gangId: number | null = null; // DEPRECATED: use planId instead
  @Input() productTotals: ProductTotal[] = [];
  // Optional inputs to compute statistics
  @Input() mixRows: MixRowData[] = [];
  @Input() processParams: ProcessParamData[] = [];

  private destroy$ = new Subject<void>();
  private quangService = inject(QuangService);
  private statsEngine = inject(StatisticsEngineService);
  // Removed separate statistics service calls; now using bundle API from QuangService
  private lastProductTotalsSig: string | null = null;


  planResults: ThongKeResultResponse[] = [];
  statsForm: FormGroup = new FormGroup({});

  ngOnInit(): void {
    // Load from API if planId provided; otherwise keep incoming data
    if (this.planId && this.planId > 0) {
      this.loadLocaoBundle(this.planId);
    }
    
    this.recomputeGangTwoPass();
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['planId'] && !changes['planId'].isFirstChange()) {
      const newPlanId = changes['planId'].currentValue as number;
      if (newPlanId && newPlanId > 0) this.loadLocaoBundle(newPlanId);
    }
    
    if (changes['mixRows']) {
      // mixRows changed, recalculate statistics
      this.computeAndUpdateStatistics();
    }
    
    if (changes['productTotals']) {
      const sig = this.buildProductTotalsSignature();
      if (sig === this.lastProductTotalsSig) {
        return; // no real change -> avoid loops
      }
      this.lastProductTotalsSig = sig;
      this.applyFormulasSimple(this.gangData);
      this.recomputeGangTwoPass();
      this.applyFormulasSimple(this.xiData);
      this.recomputeXaPercentages();
      this.computeAndUpdateStatistics();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLocaoBundle(planId: number): void {
    this.quangService.getLoCaoBundle(planId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (bundle: any) => {
        const gangTP = bundle?.gang?.tP_HoaHocs ?? [];
        const slagTP = bundle?.slag?.tP_HoaHocs ?? [];
        // Map gang
        this.gangData = gangTP.map((tp: any) => ({
          element: tp.ma_TPHH,
          mass: 0,
          percentage: +(tp.phanTram ?? 0),
          isCalculated: tp.isCalculated ?? null,
          calcFormula: tp.calcFormula ?? null,
          tphhId: tp.id
        }));
        // Map slag
        this.xiData = slagTP.map((tp: any) => ({
          element: tp.ma_TPHH,
          mass: 0,
          percentage: +(tp.phanTram ?? 0),
          isCalculated: tp.isCalculated ?? null,
          calcFormula: tp.calcFormula ?? null,
          tphhId: tp.id
        }));
        // Statistics
        this.planResults = (bundle?.statistics ?? []) as any;
        this.buildStatsForm();
        // Recompute
        this.applyFormulasSimple(this.gangData);
        this.recomputeGangTwoPass();
        this.applyFormulasSimple(this.xiData);
        this.recomputeXaPercentages();
        this.computeAndUpdateStatistics();
      },
      error: () => {
        this.recomputeGangTwoPass();
        this.computeAndUpdateStatistics();
      }
    });
  }

  // Enhanced evaluator: handle different formula types
  private evaluateFormula(formula: string, productMapById: Map<number, number>, currentList: Array<GangComposition | XaComposition>): number {
    if (!formula) return 0;
    let expr = formula;


    // Handle G:ID_X references (Gang components)
    expr = expr.replace(/G:ID_(\d+)/g, (_m, idStr) => {
      const id = Number(idStr);
      const gangItem = currentList.find(item => item.tphhId === id);
      const value = gangItem ? gangItem.mass : 0;
      return String(value);
    });

    // Handle G:ID_X_P references (Gang component percentage)
    expr = expr.replace(/G:ID_(\d+)_P/g, (_m, idStr) => {
      const id = Number(idStr);
      const gangItem = currentList.find(item => item.tphhId === id);
      const value = gangItem ? gangItem.percentage : 0;
      return String(value);
    });

    // Handle A:ID_X references (Array/Product data)
    expr = expr.replace(/A:ID_(\d+)/g, (_m, idStr) => {
      const id = Number(idStr);
      const value = productMapById.get(id) || 0;
      return String(value);
    });

    // Handle simple ID_X references (Product data)
    expr = expr.replace(/ID_(\d+)/g, (_m, idStr) => {
      const id = Number(idStr);
      const value = productMapById.get(id) || 0;
      return String(value);
    });

    // Handle SUM functions
    expr = expr.replace(/SUM\(([^)]+)\)/g, (_m, params) => {
      const paramList = params.split(';').map((p: string) => p.trim());
      let sum = 0;
      for (const param of paramList) {
        if (param.startsWith('G:ID_')) {
          const id = Number(param.replace('G:ID_', ''));
          const gangItem = currentList.find(item => item.tphhId === id);
          const value = gangItem ? gangItem.mass : 0;
          sum += value;
        } else if (param.startsWith('A:ID_')) {
          const id = Number(param.replace('A:ID_', ''));
          const value = productMapById.get(id) || 0;
          sum += value;
        } else if (param.startsWith('ID_')) {
          const id = Number(param.replace('ID_', ''));
          const value = productMapById.get(id) || 0;
          sum += value;
        } else {
          // Direct number
          const value = Number(param) || 0;
          sum += value;
        }
      }
      return String(sum);
    });


    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${expr});`);
      const result = Number(fn());
      return isFinite(result) ? result : 0;
    } catch (error) {
      // console.warn('Formula evaluation error:', formula, error);
      return 0;
    }
  }

  private applyFormulasSimple(list: Array<GangComposition | XaComposition>): void {
    if (!list || list.length === 0) return;
    const productMapById = new Map<number, number>(this.productTotals.map(p => [p.id, p.mass || 0]));

    // First pass: Calculate all items except manual input with formula (which will be handled separately)
    // LUÔN tính công thức cho tất cả items có calcFormula (không phân biệt isCalculated)
    for (const item of list) {
      if (item.calcFormula && !(!item.isCalculated && item.calcFormula)) {
        const mass = this.evaluateFormula(item.calcFormula, productMapById, list);
        item.mass = Number(mass.toFixed(3));
      }
    }

  }

  private buildProductTotalsSignature(): string {
    if (!this.productTotals || this.productTotals.length === 0) return 'empty';
    return this.productTotals
      .map(p => `${p.id}:${Number(p.mass || 0).toFixed(6)}`)
      .sort()
      .join('|');
  }

  // Calculate totals for display
  getGangTotalMass(): number {
    return this.gangData.reduce((sum, item) => sum + item.mass, 0);
  }

  getGangTotalPercentage(): number {
    return this.gangData.reduce((sum, item) => sum + item.percentage, 0);
  }

  // --- Enhanced solver for Gang table ---
  // Logic:
  // - Cột Khối lượng: LUÔN tính theo công thức (dù isCalculated = true/false)
  // - Cột Phần trăm: 
  //   * isCalculated = true: Tính từ mass/total * 100
  //   * isCalculated = false: Input thủ công từ user
  private recomputeGangTwoPass(): void {
    if (!this.gangData || this.gangData.length === 0) return;

    // First, calculate ALL masses using formulas (regardless of isCalculated)
    this.applyFormulasSimple(this.gangData);

    // Special handling for elements with manual percentage input but have formula
    // This happens when: isCalculated = false (manual input) BUT has calcFormula
    // The formula might depend on the element's own percentage, creating circular dependency
    const manualInputWithFormula = this.gangData.find(item => 
      !item.isCalculated && 
      item.calcFormula
    );
    
    if (manualInputWithFormula) {
      // For manual input with formula: mass = percentage/100 * total_mass_of_others / (1 - percentage/100)
      const sumOthers = this.gangData
        .filter(item => item !== manualInputWithFormula) // Exclude the element itself
        .reduce((sum, item) => sum + item.mass, 0);
      
      const percentageDecimal = (manualInputWithFormula.percentage || 0) / 100;
      if (percentageDecimal > 0 && percentageDecimal < 1) {
        manualInputWithFormula.mass = (percentageDecimal / (1 - percentageDecimal)) * sumOthers;
        manualInputWithFormula.mass = Number(manualInputWithFormula.mass.toFixed(3));
      }
    }

    // Then calculate percentages based on isCalculated flag
    const totalMass = this.getGangTotalMass();
    
    for (const item of this.gangData) {
      if (item.isCalculated) {
        // Percentage is calculated from mass/total
        if (totalMass > 0) {
          item.percentage = Number((item.mass / totalMass * 100).toFixed(3));
        } else {
          item.percentage = 0;
        }
      }
      // If isCalculated = false, percentage remains as user input
    }
  }

  getXaTotalMass(): number {
    // Tổng khối lượng Xỉ: KHÔNG tính R2
    return this.xiData.reduce((sum, item) => item.element === 'R2' ? sum : sum + item.mass, 0);
  }

  getXaTotalPercentage(): number {
    // Tổng phần trăm Xỉ: KHÔNG tính R2
    return this.xiData.reduce((sum, item) => item.element === 'R2' ? sum : sum + item.percentage, 0);
  }

  // Recompute Xỉ percentages based on isCalculated flag
  // Logic:
  // - Cột Khối lượng: LUÔN tính theo công thức (dù isCalculated = true/false)
  // - Cột Phần trăm: 
  //   * isCalculated = true: Tính từ mass/total * 100
  //   * isCalculated = false: Input thủ công từ user
  private recomputeXaPercentages(): void {
    if (!this.xiData || this.xiData.length === 0) return;

    // First, calculate ALL masses using formulas (regardless of isCalculated)
    this.applyFormulasSimple(this.xiData);

    // Then calculate percentages based on isCalculated flag
    const totalMass = this.getXaTotalMass(); // đã loại R2 ở trên
    
    for (const item of this.xiData) {
      // R2: không tính phần trăm
      if (item.element === 'R2') {
        continue;
      }
      if (item.isCalculated) {
        // Percentage is calculated from mass/total
        if (totalMass > 0) {
          item.percentage = Number((item.mass / totalMass * 100).toFixed(3));
        } else {
          item.percentage = 0;
        }
      }
      // If isCalculated = false, percentage remains as user input
    }
  }

  // Handle percentage input change for manual input items
  onPercentageChange(item: GangComposition | XaComposition, newValue: number): void {
    if (!item.isCalculated) {
      // Only allow change for manual input items
      item.percentage = newValue;
      
      
      // Immediate calculation for manual input with formula since it affects other calculations
      if (!item.isCalculated && item.calcFormula) {
        this.recalculateAll();
      } else {
        // Debounce calculation for other elements
        setTimeout(() => {
          this.recalculateAll();
        }, 300);
      }
    }
  }

  private recalculateAll(): void {
    // Recalculate all formulas and percentages
    this.applyFormulasSimple(this.gangData);
    this.applyFormulasSimple(this.xiData);
    
    // Recalculate percentages based on isCalculated flag
    this.recomputeGangTwoPass();
    this.recomputeXaPercentages();
    this.computeAndUpdateStatistics();
    
  }

  // Removed: loadPlanStatistics -> statistics now fetched via bundle

  computeAndUpdateStatistics(): void {
    // Ensure form controls exist
    if (!this.statsForm || !this.planResults) return;

    for (const r of this.planResults) {
      const key = this.getResultKey(r);
      const ctrl = this.statsForm.get(key) as FormControl | null;
      if (!ctrl) continue;

      if (r.isAutoCalculated) {
        // Calculate value
        let computedValue = r.giaTri;
        if (r.functionCode) {
          const context = {
            mixData: this.mixRows || [],
            gangData: this.gangData.map(g => ({ element: g.element, mass: g.mass, percentage: g.percentage })),
            xaData: this.xiData.map(x => ({ element: x.element, mass: x.mass, percentage: x.percentage })),
            processParams: this.processParams || []
          };
          try {
            computedValue = this.statsEngine.calculateSingleFunction(r.functionCode, context);
          } catch {
            computedValue = r.giaTri;
          }
        }
        r.giaTri = computedValue;
        ctrl.setValue(computedValue, { emitEvent: false });
        ctrl.disable({ emitEvent: false });
      } else {
        // Manual input: read current control value back to model
        r.giaTri = Number(ctrl.value ?? 0);
        if (ctrl.disabled) ctrl.enable({ emitEvent: false });
      }
    }
  }

  private buildStatsForm(): void {
    const group: { [key: string]: FormControl } = {};
    for (const r of this.planResults) {
      const key = this.getResultKey(r);
      const ctrl = new FormControl<number | null>(r.giaTri ?? 0);
      group[key] = ctrl as any;
    }
    this.statsForm = new FormGroup(group);
  }

  getResultKey(r: ThongKeResultResponse): string {
    return `${r.iD_ThongKe_Function}_${r.functionCode}`;
  }

  // Expose current values for saving
  public getUpsertPlanResults(): Array<{ Id_ThongKe_Function: number; GiaTri: number; }> {
    const items: Array<{ Id_ThongKe_Function: number; GiaTri: number; }> = [];
    for (const r of this.planResults) {
      const key = this.getResultKey(r);
      const ctrl = this.statsForm.get(key) as FormControl | null;
      const val = ctrl ? Number(ctrl.value ?? r.giaTri ?? 0) : Number(r.giaTri ?? 0);
      items.push({ Id_ThongKe_Function: r.iD_ThongKe_Function, GiaTri: val });
    }
    return items;
  }



}
