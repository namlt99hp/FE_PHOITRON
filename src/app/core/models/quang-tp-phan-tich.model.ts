export interface QuangTpPhanTichCreateDto {
  id_Quang: number;
  id_TPHH: number;
  gia_Tri_PhanTram: number;
  hieu_Luc_Tu: string; // ISO
  hieu_Luc_Den?: string | null; // ISO
  nguon_Du_Lieu?: string | null;
  ghi_Chu?: string | null;
}

export interface QuangTpPhanTichUpdateDto extends QuangTpPhanTichCreateDto {
  id: number;
}

export interface QuangTpPhanTichUpsertDto {
  id?: number | null;
  quang_TP_PhanTich: QuangTpPhanTichCreateDto;
}

export interface QuangTpPhanTichResponse {
  id: number;
  id_Quang: number;
  id_TPHH: number;
  gia_Tri_PhanTram: number;
  hieu_Luc_Tu: string;
  hieu_Luc_Den?: string | null;
  nguon_Du_Lieu?: string | null;
  ghi_Chu?: string | null;
}


