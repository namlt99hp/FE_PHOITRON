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
  tien_Te: string;
}

export interface QuangResponse {
  id: number;
  ma_Quang: string;
  ten_Quang: string;
  loai_Quang: number;
  mat_Khi_Nung?: number | null;
  dang_Hoat_Dong: boolean;
  da_Xoa: boolean;
  ghi_Chu?: string | null;
  ngay_Tao: string;
  nguoi_Tao?: number | null;
  ngay_Sua?: string | null;
  nguoi_Sua?: number | null;
  gia_USD_1Tan?: number | null;
  gia_VND_1Tan?: number | null;
  ty_Gia_USD_VND?: number | null;
  ngay_Chon_TyGia?: string | null;
  tien_Te?: string | null;
  // legacy camelCase for existing UI code
  maQuang?: string;
  tenQuang?: string;
  gia?: number | null;
  ghiChu?: string | null;
  ngayTao?: string | null;
  iD_NguoiTao?: number | null;
  ngaySua?: string | null;
  iD_NguoiSua?: number | null;
  matKhiNung?: number | null;
  loaiQuang?: number | null;
  id_CongThucPhoi?: number | null;
  id_Quang_Gang?: number | null;
}

export interface TPHHOfQuangResponse {
  id: number;
  ma_TPHH: string;
  ten_TPHH?: string | null;
  phanTram?: number | null;
  calcFormula?: string | null;
  isCalculated?: boolean | null;
}

export interface QuangDetailResponse {
  quang: QuangResponse;
  tP_HoaHocs: TPHHOfQuangResponse[];
  giaHienTai?: QuangGiaDto | null;
}

export interface QuangSelectItemModel {
  id: number;
  maQuang: string;
  tenQuang: string;
  gia?: number;
  gia_USD_1Tan?: number | null;
  ty_Gia_USD_VND?: number | null;
  gia_VND_1Tan?: number | null;
  ngay_Chon_TyGia?: string | null;
  matKhiNung: number;
}

export interface QuangCreateDto {
  ma_Quang: string;
  ten_Quang: string;
  loai_Quang: number;
  dang_Hoat_Dong?: boolean;
  ghi_Chu?: string | null;
}

export interface ThanhPhanQuangDto {
  iD_TPHH: number;
  phanTram: number;
}

export interface QuangUpdateDto extends QuangCreateDto {
  id: number;
}

export interface QuangUpsertSnakeDto {
  id?: number | null;
  quang: QuangCreateDto;
}

// Legacy FE DTOs (camelCase) kept for backward compatibility in UI code
export interface QuangDto {
  maQuang: string;
  tenQuang: string;
  ghiChu?: string | null;
  loaiQuang?: number;
}

export interface UpsertQuangDto {
  id?: number | null;
  quang: QuangDto;
  thanhPhan?: ThanhPhanQuangDto[];
}

// New DTOs for UpsertWithThanhPhan API
export interface QuangThanhPhanHoaHocDto {
  ID_TPHH: number;
  Gia_Tri_PhanTram: number;
  ThuTuTPHH?: number;
  KhoiLuong?: number | null;
  CalcFormula?: string | null;
  IsCalculated?: boolean;
}

export interface QuangGiaDto {
  gia_USD_1Tan: number;
  ty_Gia_USD_VND: number;
  gia_VND_1Tan: number;
  ngay_Chon_TyGia: string; // ISO
}

export enum LoaiQuang {
  Mua = 0,
  Tron = 1,
  Gang = 2,
  Khac = 3,
}

// Unified DTO for all ore types (0=Thô, 1=Trung gian, 2=Gang, 3=Khác, 4=Xỉ)
export interface QuangUpsertWithThanhPhanDto {
  id?: number | null;
  ma_Quang: string;
  ten_Quang: string;
  loai_Quang: number; // 0=Thô, 1=Trung gian, 2=Gang, 3=Khác, 4=Xỉ
  mat_Khi_Nung?: number | null;
  dang_Hoat_Dong?: boolean;
  ghi_Chu?: string | null;
  thanhPhanHoaHoc: QuangThanhPhanHoaHocDto[];
  gia?: QuangGiaDto | null; // Required for loai_Quang = 0 (purchased ore)
  id_Quang_Gang?: number | null; // For linking slag to pig iron (loai_Quang = 4)
}

export interface QuangUpsertWithThanhPhanResponse {
  id: number;
  message: string;
}

export interface QuangKetQuaUpsertDto {
  id?: number | null;
  ma_Quang: string;
  ten_Quang: string;
  loai_Quang: 2 | 4; // 2=Gang, 4=Xỉ
  thanhPhanHoaHoc: QuangThanhPhanHoaHocDto[];
  id_PhuongAn: number; // Required plan ID for mapping
  dang_Hoat_Dong?: boolean;
  ghi_Chu?: string | null;
  id_Quang_Gang?: number | null; // For Xỉ: link to Gang
}

export interface QuangKetQuaUpsertResponse {
  id: number;
  message: string;
}
