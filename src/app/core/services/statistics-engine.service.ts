import { Injectable } from '@angular/core';
import { FUNCTION_MAPPING_LIST } from '../constants/function-mapping.constant';
import { ORE_TYPE_CODES } from '../constants/ore-type-codes.constant';
import { MixRowData, ProcessParamData } from '../models/mix-row-data.model';

// Using MixRowData from mix-row-data.model.ts instead

export interface GangCompositionDto {
  element: string;
  mass: number;
  percentage: number;
  isCalculated?: boolean | null;
  calcFormula?: string | null;
  tphhId?: number | null;
}

export interface XaCompositionDto extends GangCompositionDto {}

export interface CalculationContextDto {
  mixData: MixRowData[];
  gangData: GangCompositionDto[];
  xaData: XaCompositionDto[];
  processParams?: ProcessParamData[];
}

@Injectable({ providedIn: 'root' })
export class StatisticsEngineService {
  // Normalize incoming context: lowercase codes, chem keys; coerce numbers
  normalizeContext(input: CalculationContextDto): CalculationContextDto {
    const normalizeNumber = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const mixData = (input.mixData || []).map(row => ({
      ...row,
      code: (row.code || '').toLowerCase(),
      tenQuang: row.tenQuang,
      loaiQuang: row.loaiQuang,
      ratio: normalizeNumber(row.ratio),
      klVaoLo: normalizeNumber(row.klVaoLo),
      tyLeHoiQuang: normalizeNumber(row.tyLeHoiQuang),
      klNhan: normalizeNumber(row.klNhan),
      chems: Object.fromEntries(
        Object.entries(row.chems || {}).map(([k, v]) => [(k || '').toLowerCase(), normalizeNumber(v)])
      )
    }));

    const gangData = (input.gangData || []).map(it => ({
      ...it,
      element: (it.element || '').toLowerCase(),
      mass: normalizeNumber(it.mass),
      percentage: normalizeNumber(it.percentage)
    }));

    const xaData = (input.xaData || []).map(it => ({
      ...it,
      element: (it.element || '').toLowerCase(),
      mass: normalizeNumber(it.mass),
      percentage: normalizeNumber(it.percentage)
    }));

    const processParams = (input.processParams || []).map(p => ({
      ...p,
      code: (p.code || '').toLowerCase(),
      value: normalizeNumber(p.value)
    }));

    return { mixData, gangData, xaData, processParams };
  }

  calculate(context: CalculationContextDto): Array<{ code: string; value: number }> {
    // Ensure normalized input
    const ctx = this.normalizeContext(context);
    const funcs = FUNCTION_MAPPING_LIST;
    const codeToFunc = new Map(funcs.map(f => [f.functionCode, f]));

    // Build dependency order (topological)
    const deps = new Map<string, string[]>(funcs.map(f => [f.functionCode, f.dependsOn || []]));
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (code: string) => {
      if (visited.has(code)) return;
      if (temp.has(code)) return; // ignore cycles for now
      temp.add(code);
      const children = deps.get(code) || [];
      for (const c of children) if (codeToFunc.has(c)) visit(c);
      temp.delete(code);
      visited.add(code);
      order.push(code);
    };

    funcs.forEach(f => visit(f.functionCode));

    const resultsByCode = new Map<string, number>();
    for (const code of order) {
      const value = this.calculateByCode(code, ctx, resultsByCode);
      resultsByCode.set(code, value);
    }

    return Array.from(resultsByCode.entries()).map(([code, value]) => ({ code, value }));
  }

  // Calculate single function by code (for API-based statistics)
  calculateSingleFunction(functionCode: string, context: CalculationContextDto): number {
    const ctx = this.normalizeContext(context);
    const results = new Map<string, number>();
    
    // Pre-calculate dependencies for functions that need other results
    if (functionCode === 'TOTAL_KLK_INTO_BF') {
      results.set('K2O_NA2O_FROM_QTK', this.calcK2ONa2OFromQtk(ctx));
      results.set('K2O_NA2O_FROM_QVV_QC', this.calcK2ONa2OFromQvvQc(ctx));
      results.set('K2O_NA2O_FROM_COKE', this.calcK2ONa2OFromCoke(ctx));
      results.set('K2O_NA2O_FROM_PULVERIZED_COAL', this.calcK2ONa2OFromPulverizedCoal(ctx));
    } else if (functionCode === 'TOTAL_FUEL') {
      results.set('COKE_25_80', this.calcCoke2580(ctx));
      results.set('COKE_10_25', this.calcCoke1025(ctx));
      results.set('PULVERIZED_COAL', this.calcPulverizedCoal(ctx));
    }
    
    return this.calculateByCode(functionCode, ctx, results);
  }

  private getResult(results: Map<string, number>, code: string): number {
    return results.get(code) ?? 0;
  }

  private calculateByCode(code: string, ctx: CalculationContextDto, results: Map<string, number>): number {
    switch (code) {
      case 'GANG_OUTPUT':
        return this.calcGangOutput(ctx);
      case 'ORE_CONSUMPTION':
        return this.calcOreConsumption(ctx);
      case 'K2O_NA2O_FROM_QTK':
        return this.calcK2ONa2OFromQtk(ctx);
      case 'K2O_NA2O_FROM_QVV_QC':
        return this.calcK2ONa2OFromQvvQc(ctx);
      case 'TOTAL_KLK_INTO_BF':
        return this.getResult(results, 'K2O_NA2O_FROM_QTK')
             + this.getResult(results, 'K2O_NA2O_FROM_QVV_QC')
             + this.getResult(results, 'K2O_NA2O_FROM_COKE')
             + this.getResult(results, 'K2O_NA2O_FROM_PULVERIZED_COAL');
      case 'ORE_QUALITY':
        return this.calcOreQuality(ctx);
      case 'R2_BASICITY':
        return this.calcR2Basicity(ctx);
      case 'COKE_25_80':
        return this.calcCoke2580(ctx);
      case 'COKE_10_25':
        return this.calcCoke1025(ctx);
      case 'PULVERIZED_COAL':
        return this.calcPulverizedCoal(ctx);
      case 'TOTAL_FUEL':
        return this.getResult(results, 'COKE_25_80')
             + this.getResult(results, 'COKE_10_25')
             + this.getResult(results, 'PULVERIZED_COAL');
      case 'SLAG_OUTPUT':
        return this.calcSlagOutput(ctx);
      case 'K2O_NA2O_FROM_COKE':
        return this.calcK2ONa2OFromCoke(ctx);
      case 'K2O_NA2O_FROM_PULVERIZED_COAL':
        return this.calcK2ONa2OFromPulverizedCoal(ctx);
      case 'TOTAL_ZN_INTO_BF':
        return this.calcTotalZnIntoBF(ctx);
      case 'SLAG_MELTING_TEMP':
        return this.calcSlagMeltingTemp(ctx);
      default:
        return 0;
    }
  }

  private getChem(row: MixRowData, code: string): number {
    const key = (code || '').toLowerCase();
    const val = row.chems?.[key];
    return Number.isFinite(val) ? Number(val) : 0;
  }

  // Implementations (initial; can refine with exact business rules)
  private calcGangOutput(ctx: CalculationContextDto): number {
    // Tổng khối lượng Gang (sum of mass column in Gang result table)
    const totalGangMass = ctx.gangData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
    if (totalGangMass <= 0) return 0;

    // Tìm process param có code = 'tocdolieu'
    const rateParam = ctx.processParams?.find(p => (p.code || '').toLowerCase() === 'tocdolieu');
    const tocDoLieu = Number(rateParam?.value) || 0; // percentage

    // Công thức: Tổng khối lượng Gang x 24 x (tocdolieu / 100)
    return totalGangMass * 24 * (tocDoLieu / 100);
  }

  private calcOreConsumption(ctx: CalculationContextDto): number {
    // Tổng khối lượng Gang (cột tổng bảng Gang kết quả)
    const totalGangMass = ctx.gangData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
    if (totalGangMass <= 0) return 0;

    // Giá trị param 'melieu'
    const param = ctx.processParams?.find(p => (p.code || '').toLowerCase() === 'melieu');
    const meLieu = Number(param?.value) || 0;

    // Tiêu hao quặng = melieu / tổng khối lượng gang × 100
    return (meLieu / totalGangMass) * 100;
  }

  private calcK2ONa2OFromQtk(ctx: CalculationContextDto): number {
    // Lấy tiêu hao × (K2O + Na2O) × 10 của quặng thiêu kết
    const thieuKetRows = ctx.mixData.filter(r => (r.code || '').toLowerCase() === ORE_TYPE_CODES.thieuKet);
    return thieuKetRows.reduce((sum, row) => {
      const k2o = this.getChem(row, 'k2o');
      const na2o = this.getChem(row, 'na2o');
      // Tiêu hao = KL nhận / Tổng khối lượng Gang × 100
      const totalGangMass = ctx.gangData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
      if (totalGangMass <= 0) return sum;
      
      const tieuHao = (row.klNhan / totalGangMass) * 100;
      return sum + (tieuHao * (k2o + na2o) * 10);
    }, 0);
  }

  private calcK2ONa2OFromQvvQc(ctx: CalculationContextDto): number {
    // Tính K2O + Na2O từ quặng vê viên và quặng cỡ (QC), loại trừ: loại 3 (coke/coal) và 'thieuket'
    // Công thức: Σ( Tiêu hao × (K2O + Na2O) × 10 ), với Tiêu hao = KL nhận / Tổng KL Gang × 100
    const totalGangMass = ctx.gangData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
    if (totalGangMass <= 0) return 0;

    const rows = ctx.mixData.filter(r => r.loaiQuang !== 3 && (r.code || '').toLowerCase() !== ORE_TYPE_CODES.thieuKet);
    return rows.reduce((sum, row) => {
      const k2o = this.getChem(row, 'k2o');
      const na2o = this.getChem(row, 'na2o');
      const tieuHao = (row.klNhan / totalGangMass) * 100; // %
      return sum + (tieuHao * (k2o + na2o) * 10);
    }, 0);
  }

  private calcOreQuality(ctx: CalculationContextDto): number {
    // Phẩm vị quặng vào lò = (TFe ở dòng tổng bảng mix quặng) / melieu
    // TFe tổng dòng tổng tương đương TFe trung bình gia quyền theo KL vào lò

    const sumTfeTimesWeight = ctx.mixData.reduce((s, r) => {
      const tfe = this.getChem(r, 'tfe');
      return s + tfe * r.klVaoLo;
    }, 0);
    const meLieuParam = ctx.processParams?.find(p => (p.code || '').toLowerCase() === 'melieu');
    const meLieu = Number(meLieuParam?.value) || 0;
    if (meLieu <= 0) return 0;
    const tfeTotalRow = sumTfeTimesWeight / meLieu;
    return tfeTotalRow;
  }

  private calcR2Basicity(ctx: CalculationContextDto): number {
    const findByElement = (code: string) => ctx.xaData.find(x => (x.element || '').toLowerCase() === code.toLowerCase())?.mass ?? 0;
    const cao = findByElement('cao');
    const sio2 = findByElement('sio2');
    return sio2 > 0 ? cao / sio2 : 0;
  }

  private calcCoke2580(ctx: CalculationContextDto): number {
    const totalGangMass = ctx.gangData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
    if (totalGangMass <= 0) return 0;
    const param = ctx.processParams?.find(p => (p.code || '').toLowerCase() === 'mecoke2580');

    const coke2580 = Number(param?.value) || 0;
    // (coke2580 / tổng KL Gang) × 100 × 1000
    return (coke2580 / totalGangMass) * 100 * 1000;
  }
  private calcCoke1025(ctx: CalculationContextDto): number {
    const totalGangMass = ctx.gangData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
    if (totalGangMass <= 0) return 0;
    const param = ctx.processParams?.find(p => (p.code || '').toLowerCase() === 'mecoke1025');
    const coke1025 = Number(param?.value) || 0;
    // (coke1025 / tổng KL Gang) × 100 × 1000
    return (coke1025 / totalGangMass) * 100 * 1000;
  }
  private calcPulverizedCoal(ctx: CalculationContextDto): number {
    const totalGangMass = ctx.gangData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
    console.log('totalGangMass', totalGangMass);
    console.log('ctx.processParams', ctx.processParams);
    if (totalGangMass <= 0) return 0;
    // Support both English code and Vietnamese alias just in case
    
    const tocDoLieu = ctx.processParams?.find(p => (p.code || '').toLowerCase() === 'tocdolieu')?.value || 0;
    const param = ctx.processParams?.find(p => {
      const c = (p.code || '').toLowerCase();
      return c === 'pulverizedcoal' || c === 'thanphun';
    });
    const pulverized = Number(param?.value) || 0;
    // (than phun / tổng KL Gang) × 100 × 1000
    return ((pulverized / tocDoLieu) / totalGangMass) * 100 * 1000;
  }
  private calcSlagOutput(ctx: CalculationContextDto): number {
    const totalSlagMass = ctx.xaData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
    const totalGangMass = ctx.gangData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
    if (totalGangMass <= 0) return 0;
    // Sản lượng xỉ = (Tổng KL Xỉ / Tổng KL Gang) × 1000
    return (totalSlagMass / totalGangMass) * 1000;
  }
  private calcK2ONa2OFromCoke(ctx: CalculationContextDto): number {
    // (consumption of coke2580 + consumption of coke1025) × (K2O + Na2O of coke2580) × 10
    const totalGangMass = ctx.gangData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
    if (totalGangMass <= 0) return 0;

    const isCoke2580 = (r: MixRowData) => (r.code || '').toLowerCase() === ORE_TYPE_CODES.mecoke2580;
    const isCoke1025 = (r: MixRowData) => (r.code || '').toLowerCase() === ORE_TYPE_CODES.mecoke1025;

    const coke2580Rows = ctx.mixData.filter(isCoke2580);
    const coke1025Rows = ctx.mixData.filter(isCoke1025);

    const consumption = (row: MixRowData) => {
      return (row.klVaoLo / totalGangMass) * 100; // %
    };

    const cons2580 = coke2580Rows.reduce((s, r) => s + consumption(r), 0);
    const cons1025 = coke1025Rows.reduce((s, r) => s + consumption(r), 0);
    const totalCons = cons2580 + cons1025;
    const k2oNa2o2580 = coke2580Rows.reduce((s, r) => s + this.getChem(r, 'k2o') + this.getChem(r, 'na2o'), 0);
    return totalCons * k2oNa2o2580 * 10;
  }
  private calcK2ONa2OFromPulverizedCoal(ctx: CalculationContextDto): number {
    // Lấy tiêu hao × (K2O + Na2O) × 10 của than phun
    const thanPhunRows = ctx.mixData.filter(r => (r.code || '').toLowerCase() === ORE_TYPE_CODES.thanphun);
    
    return thanPhunRows.reduce((sum, row) => {
      const k2o = this.getChem(row, 'k2o');
      const na2o = this.getChem(row, 'na2o');
      
      // Tiêu hao = KL vào lò / Tổng khối lượng Gang × 100
      const totalGangMass = ctx.gangData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
      if (totalGangMass <= 0) return sum;
      
      const tieuHao = (row.klVaoLo / totalGangMass) * 100;
      return sum + (tieuHao * (k2o + na2o) * 10);
    }, 0);
  }
  private calcTotalZnIntoBF(ctx: CalculationContextDto): number {
    // SUM( (tiêu hao của quặng khác loại 3) × Zn × 10 )
    const totalGangMass = ctx.gangData.reduce((sum, item) => sum + (Number(item.mass) || 0), 0);
    if (totalGangMass <= 0) return 0;

    const rows = ctx.mixData.filter(r => r.loaiQuang !== 3);
    const sumzn = rows.reduce((sum, row) => {
      const zn = this.getChem(row, 'zn');
      const tieuHao = (row.klNhan / totalGangMass) * 100; // %
      return sum + (tieuHao * zn * 10);
    }, 0);
    return sumzn * 1000;
  }
  private calcSlagMeltingTemp(_ctx: CalculationContextDto): number { return 0; }
}


