export interface PhuongAnPhoiCreateDto {
  ten_Phuong_An: string;
  id_Quang_Dich: number;
  ngay_Tinh_Toan: string; // ISO
  phien_Ban?: number;
  trang_Thai?: number;
  muc_Tieu?: number | null;
  ghi_Chu?: string | null;
}

export interface PhuongAnPhoiUpdateDto extends PhuongAnPhoiCreateDto {
  id: number;
}

export interface PhuongAnPhoiUpsertDto {
  id?: number | null;
  phuong_An_Phoi: PhuongAnPhoiCreateDto;
}

export interface PhuongAnPhoiResponse {
  id: number;
  ten_Phuong_An: string;
  id_Quang_Dich: number;
  phien_Ban: number;
  trang_Thai: number;
  ngay_Tinh_Toan: string;
  muc_Tieu?: number | null;
  ghi_Chu?: string | null;
  createdAt: string;
  createdBy?: number | null;
  updatedAt?: string | null;
  updatedBy?: number | null;
}


