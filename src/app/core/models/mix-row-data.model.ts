export interface MixRowData {
  code?: string;
  tenQuang: string;
  loaiQuang: number;
  ratio: number;
  klVaoLo: number;
  tyLeHoiQuang: number;
  klNhan: number;
  chems: Record<string, number>;
}

export interface ProcessParamData {
  id: number;
  code: string;
  value: number;
  id_Quang_LienKet?: number | null;
  scope?: number | null;
  calcFormula?: string | null;
}
