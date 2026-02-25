export interface LoaiQuangTableModel {
  id: number;
  maLoaiQuang: string;
  tenLoaiQuang: string;
  moTa?: string | null;
  isActive: boolean;
  ngayTao?: string;
  nguoiTao?: number | null;
  ngaySua?: string | null;
  nguoiSua?: number | null;
}

export interface LoaiQuangCreateDto {
  maLoaiQuang: string;
  tenLoaiQuang: string;
  moTa?: string | null;
  isActive?: boolean;
  nguoiTao?: number | null;
}

export interface LoaiQuangUpdateDto extends LoaiQuangCreateDto {
  id: number;
}

export interface LoaiQuangUpsertDto {
  id?: number | null;
  loaiQuang: LoaiQuangCreateDto;
}

export interface LoQuangTableModel {
  id: number;
  maLoQuang: string;
  moTa?: string | null;
  isActive: boolean;
  ngayTao?: string;
  nguoiTao?: number | null;
  ngaySua?: string | null;
  nguoiSua?: number | null;
}

export interface LoQuangCreateDto {
  maLoQuang: string;
  moTa?: string | null;
  isActive?: boolean;
  nguoiTao?: number | null;
}

export interface LoQuangUpdateDto extends LoQuangCreateDto {
  id: number;
}

export interface LoQuangUpsertDto {
  id?: number | null;
  loQuang: LoQuangCreateDto;
}

