export interface QuangTableModel {
  id: number;
  maQuang: string;
  tenQuang: string;
  gia: number;
  ghiChu?: string;
  ngayTao: string;
  iD_NguoiTao?: number;
  ngaySua?: string;
  iD_NguoiSua?: number;
  matKhiNung: number;
}

export interface QuangResponse {
  id: number;
  maQuang: string;
  tenQuang?: string | null;
  gia?: number | null;
  ghiChu?: string | null;
  ngayTao?: string | null;
  iD_NguoiTao?: number | null;
  ngaySua?: string | null;
  iD_NguoiSua?: number | null;
}

export interface TPHHOfQuangResponse {
  id: number;
  ma_TPHH: string;
  ten_TPHH?: string | null;
  phanTram?: number | null;
}

export interface QuangDetailResponse {
  quang: QuangResponse;
  tP_HoaHocs: TPHHOfQuangResponse[];
}

export interface QuangSelectItemModel {
  id: number;
  maQuang: string;
  tenQuang: string;
  gia?: number;
  matKhiNung: number;
}

export interface QuangDto {
  maQuang: string;
  tenQuang: string;
  gia?: number | null;
  matKhiNung: number | null;
  ghiChu?: string | null;
}

export interface ThanhPhanQuangDto {
  iD_TPHH: number;
  phanTram: number;
}

export interface UpsertQuangDto {
  id?: number | null;
  quang: QuangDto;
  thanhPhan: ThanhPhanQuangDto[];
}
