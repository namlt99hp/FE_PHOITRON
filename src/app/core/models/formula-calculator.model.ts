export enum FormulaCalculatorContext {
  ProcessParam = 'processParam',
  OreChemistry = 'oreChemistry' // Unified for Gang and Xỉ
}

export interface FormulaParam {
  id: number;
  code: string;
  ten: string;
}

// Gang/Xỉ specific interfaces
export interface GangComposition {
  tphhId: number;
  element: string;
  mass?: number;
  percentage?: number;
  isCalculated?: boolean;
  calcFormula?: string;
}

export interface ArrayData {
  id: number;
  code: string;
  value?: number;
}

export interface FormulaCalculatorData {
  // Existing fields (backward compatible)
  currentIdFormula?: string;
  availableParams?: FormulaParam[];
  title?: string;
  searchApi?: (searchTerm: string) => Promise<FormulaParam[]>;
  searchPlaceholder?: string;
  
  // New optional fields for Gang/Xỉ context
  context?: FormulaCalculatorContext;
  currentIsCalculated?: boolean;
  currentComponentId?: number; // ID of the component being edited
  gangData?: GangComposition[];
  arrayData?: ArrayData[];
}

export interface FormulaCalculatorResult {
  idFormula: string;
  displayFormula: string;
  
  // New optional fields for Ore context
  isCalculated?: boolean;
  dataSources?: ('ore' | 'array' | 'both')[];
}
