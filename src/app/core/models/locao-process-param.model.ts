export interface LoCaoProcessParamModel {
  id: number;
  code: string;
  ten: string;
  donVi: string;
  id_Quang_LienKet?: number | null;
  // 0=LinkedOre (use id_Quang_LienKet), 1=AllNonLoai3 (aggregate), 2=FormulaOnly
  scope?: number | null;
  thuTu: number;
  isCalculated: boolean | null;
  calcFormula?: string | null;
}

export interface LoCaoProcessParamUpsertDto {
  id?: number; // 0 or undefined => create
  code: string;
  ten: string;
  donVi: string;
  id_Quang_LienKet?: number | null;
  scope?: number | null;
  thuTu: number;
  isCalculated: boolean | null;
  calcFormula?: string | null;
}

// Scope definition for process parameters
export enum ProcessParamScope {
  LinkedOre = 0,
  AllNonLoai3 = 1,
  FormulaOnly = 2,
}


