export interface GangTableModel {
    id: number;
    maGang: string;
    tenGang: string;
    ghiChu?: string;
    ngayTao: string;
    iD_NguoiTao?: number;
    ngaySua?: string;
    iD_NguoiSua?: number;
  }
  
export interface UpsertGangDto {
  id?: number | null;
  gang: GangCreateDto;
}

export interface GangCreateDto {
  ma_Gang: string;
  ten_Gang: string;
  dang_Hoat_Dong?: boolean;
  ghi_Chu?: string | null;
}

export interface GangUpdateDto extends GangCreateDto {
  id: number;
}

export interface GangDetailResponse {
  id: number;
  ma_Gang: string;
  ten_Gang: string;
  dang_Hoat_Dong: boolean;
  da_Xoa: boolean;
  ghi_Chu?: string | null;
  ngay_Tao: string;
  nguoi_Tao?: number | null;
  ngay_Sua?: string | null;
  nguoi_Sua?: number | null;
}