export interface LoCaoProcessParamResponse {
  id: number;
  code: string;
  ten: string;
  donVi: string;
  iD_Quang_LienKet: number | null; // Field name từ API response
  scope: number;
  thuTu: number;
  da_Xoa: boolean;
  ngay_Tao: string;
  nguoi_Tao: string | null;
  isCalculated: boolean;
  calcFormula: string | null;
  giaTri?: number | null; // configured value from PA_ProcessParamValue
  thuTuParam?: number | null;
  giaTriMacDinh?: number | null; // default value from LoCao_ProcessParam
}

export enum ProcessParamScope {
  LinkedOre = 0,
  AllNonLoai3 = 1,
  FormulaOnly = 2,
}
