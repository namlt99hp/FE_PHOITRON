import { QuangTableModel } from "./quang.model";

export type OreMode = 'MUA' | 'TRON';

export interface ChemicalOption {
  id: number;
  code: string;   // Fe, SiO2 ...
  name: string;
}

export interface OreOption {
  id: number;
  code: string;
  name: string;
  composition: Array<{ chemicalId: number; percent: number }>;
}

export interface OreMuaDto {
  kind: 'MUA';
  maQuang: string;
  tenQuang: string;
  gia: number | null;
  matKhiNung: number | null;
  ghiChu?: string | null;
  thanhPhan: Array<{ chemicalId: number; percent: number }>;
}

export interface OreTronDto {
  kind: 'TRON';
  maQuang: string;
  tenQuang: string;
  gia: number | null;
  ghiChu?: string | null;
  rangBuoc: Array<{ chemicalId: number; min: number | null; max: number | null }>;
  quangPhoi: Array<{ oreId: number; ratioPercent: number }>;
}

export type OreUpsertDto = OreMuaDto | OreTronDto;

export interface OreDialogData {
  mode: OreMode;                            // 'MUA' | 'TRON'
  chemicals: ChemicalOption[];              // danh mục TP hóa học
  sourceOres?: OreOption[];                 // danh sách quặng nguồn (cho TRỘN)
  initial?: Partial<OreUpsertDto>;          // dữ liệu edit (optional)
  title?: string;                           // tiêu đề dialog (optional)
}

export interface QuangMuaData{
  mode: OreMode; 
  quang: QuangTableModel
}