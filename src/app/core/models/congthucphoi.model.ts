import { QuangResponse } from "./quang.model";

export interface CongThucPhoiTableModel{
    id: number;
    maCongThuc: string;
    tenCongThuc: string
    tongPhanTram?: number;
    ghiChu?: string
    ngayTao: string;
    iD_NguoiTao?: number;
    ngaySua?: string; 
    iD_NguoiSua?: number;
}


// Công thức phối cơ bản
export interface CongThucPhoiResponse {
  id: number;
  maCongThuc: string;
  tenCongThuc: string;
  tongPhanTram: number | null;
  ghiChu: string | null;
  ngayTao: string | null;      
  iD_NguoiTao: number | null;
  ngaySua: string | null;
  iD_NguoiSua: number | null;
}

// Thành phần hóa học trong công thức phối
export interface TPHHOfCongThucResponse {
  iD_TPHH: number;
  ma_TPHH: string;
  ten_TPHH: string | null;
  min_PhanTram: number | null;
  max_PhanTram: number | null;
}

// Thành phần hóa học của quặng (chứa % thực tế)
export interface TPHHOfQuangReponse {
  id: number;
  ma_TPHH: string;
  ten_TPHH: string | null;
  phanTram: number;
}

// Quặng trong công thức phối
export interface CongThucQuangResponse {
  id: number;
  maQuang: string;
  tenQuang: string | null;
  matKhiNung: number | null;
  tiLePhoi: number | null;
  tP_HoaHocs: TPHHOfQuangReponse[];
}

export interface CongThucPhoiDetailRespone {
  quangNeo: QuangResponse;
  congThuc: CongThucPhoiResponse;
  tphHs: TPHHOfCongThucResponse[];
  quangs: CongThucQuangResponse[];
}


// ====== DTO cho API Upsert & Confirm (1 call) ======

export interface QuangInputDto {
  ID_Quang: number;       // quặng nguồn
  TiLePhoi: number;       // tỉ lệ phối (không bắt buộc tổng = 100)
}

export interface RangBuocTPHHsDto {
  ID_TPHH: number;        // thành phần hoá học
  Min_PhanTram?: number | null;
  Max_PhanTram?: number | null;
}

export interface CongThucPhoiUpsertDto {
  ID?: number | null;                 // null => tạo mới; có ID => update
  ID_QuangNeo?: number | null;        // neo (tuỳ chọn)
  MaCongThuc: string;
  TenCongThuc: string;
  GhiChu?: string | null;
  TongPhanTram?: number | null;
  QuangInputs: QuangInputDto[];         // danh sách quặng nguồn + tỉ lệ phối
  RangBuocTPHHs?: RangBuocTPHHsDto[] | null; // (tuỳ chọn) min-max theo TPHH
}

export interface QuangTron {
  MaQuang: string;
  TenQuang: string;
  Gia?: number | null;
  GhiChu?: string | null;
  MatKhiNung?: number | null; // mất khi nung
}

export interface OreChemItemDto {
  ID_TPHH: number;
  PhanTram: number;                   // % TPHH đã tính ở FE
}

export interface UpsertAndConfirmDto {
  CongThucPhoi: CongThucPhoiUpsertDto;
  Quang: QuangTron;
  KetQuaTPHHtItems: OreChemItemDto[];  // snapshot %TPHH đầu ra (FE tính)
}

export interface UpsertAndConfirmResult {
  FormulaId: number;
  OreId: number;
}

// ====== (Tùy chọn) Nếu bạn vẫn dùng các API tách rời ======

export interface UpsertCongThucDto {
  ID?: number | null;
  ID_QuangNeo?: number | null;
  MaCongThuc: string;
  TenCongThuc: string;
  GhiChu?: string | null;
  Inputs: QuangInputDto[];
}

export interface UpsertResult {
  FormulaId: number;
}

export interface ConfirmToOreDto {
  FormulaId: number;
  MaQuang: string;
  TenQuang: string;
  Gia?: number | null;
  GhiChu?: string | null;
  Components: OreChemItemDto[]; // %TPHH đã tính
}

export interface ConfirmOreResult {
  OreId: number;
}

// ====== ViewModel dùng để edit/so sánh trên FE ======

export interface FormulaInputVm {
  ID_Quang: number;
  MaQuang: string;
  TenQuang: string;
  Gia?: number | null;
  TiLePhoi: number;
}

export interface CongThucEditVm {
  ID: number;
  ID_QuangNeo?: number | null;
  MaCongThuc: string;
  TenCongThuc: string;
  GhiChu?: string | null;
  Inputs: FormulaInputVm[];
}

export interface FormulaSummaryVm {
  ID: number;
  MaCongThuc: string;
  TenCongThuc: string;
  ProducedCount: number;                   // số lô đã sản xuất từ công thức này
  LastProducedAt?: string | null;          // ISO string (DateTimeOffset) từ BE
}

export interface NeoDashboardVm {
  ID_QuangNeo: number;
  MaQuangNeo?: string | null;
  TenQuangNeo?: string | null;
  Formulas: FormulaSummaryVm[];
}

// ====== BE-aligned DTOs/Responses for basic CRUD ======

export interface Cong_Thuc_PhoiCreateDto {
  id_Quang_DauRa: number;
  ma_Cong_Thuc: string;
  hieu_Luc_Tu: string; // ISO
  ten_Cong_Thuc?: string | null;
  he_So_Thu_Hoi: number; // decimal
  chi_Phi_Cong_Doạn_1Tan: number; // decimal
  phien_Ban?: number;
  trang_Thai?: number;
  hieu_Luc_Den?: string | null; // ISO
  ghi_Chu?: string | null;
}

export interface Cong_Thuc_PhoiUpdateDto extends Cong_Thuc_PhoiCreateDto {
  id: number;
}

export interface Cong_Thuc_PhoiUpsertDto {
  id?: number | null;
  cong_Thuc_Phoi: Cong_Thuc_PhoiCreateDto;
}

export interface Cong_Thuc_PhoiResponse {
  id: number;
  id_Quang_DauRa: number;
  ma_Cong_Thuc: string;
  ten_Cong_Thuc?: string | null;
  he_So_Thu_Hoi: number;
  chi_Phi_Cong_Doạn_1Tan: number;
  phien_Ban: number;
  trang_Thai: number;
  hieu_Luc_Tu: string;
  hieu_Luc_Den?: string | null;
  ghi_Chu?: string | null;
}