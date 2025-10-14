export interface QuangGiaLichSuCreateDto {
  id_Quang: number;
  don_Gia_1Tan: number;
  hieu_Luc_Tu: string; // ISO
  tien_Te?: string;
  hieu_Luc_Den?: string | null; // ISO or null
  ghi_Chu?: string | null;
}

export interface QuangGiaLichSuUpdateDto extends QuangGiaLichSuCreateDto {
  id: number;
}

export interface QuangGiaLichSuUpsertDto {
  id?: number | null;
  quang_Gia_LichSu: QuangGiaLichSuCreateDto;
}

export interface QuangGiaLichSuResponse {
  id: number;
  id_Quang: number;
  don_Gia_1Tan: number;
  tien_Te: string;
  hieu_Luc_Tu: string;
  hieu_Luc_Den?: string | null;
  ghi_Chu?: string | null;
}


