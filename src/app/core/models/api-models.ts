// ===== API Response Models =====

// Base response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// ===== Phuong An Phoi API Models =====

export interface PhuongAnPhoiBasicInfo {
  id: number;
  ten_Phuong_An: string;
  ngay_Tinh_Toan: string;
}

export interface PhuongAnPhoiWithFormulasResponse {
  planId: number;
  ten_Phuong_An: string;
  ngay_Tinh_Toan: string;
  formulas: CongThucPhoiDetailMinimal[];
  quangKetQua?: QuangKetQuaInfo[];
}

export interface QuangKetQuaInfo {
  id_Quang: number;
  loaiQuang: number;
  ma_Quang: string;
  ten_Quang: string;
}

// ===== Cong Thuc Phoi API Models =====

export interface CongThucPhoiBasic {
  id: number;
  ma: string;
  ten?: string;
  ghiChu?: string;
}

export interface QuangDauRaBasic {
  id: number;
  ma_Quang: string;
  ten_Quang: string;
  tP_HoaHocs?: TPHHValue[];
}

export interface TPHHValue {
  id: number;
  ma_TPHH: string;
  ten_TPHH: string;
  phanTram: number;
  thuTuTPHH?: number; // Thứ tự hiển thị TPHH trong quặng
}

export interface ChiTietQuangChem {
  id_Quang: number;
  ten_Quang: string;
  ti_Le_Phan_Tram: number;
  tP_HoaHocs: TPHHValue[];
  loai_Quang?: number;
  gia_USD_1Tan?: number;
  ty_Gia_USD_VND?: number;
  gia_VND_1Tan?: number;
  // Milestone-specific fields
  khau_Hao?: number | null;
  ti_Le_KhaoHao?: number | null;
  kL_VaoLo?: number | null;
  ti_Le_HoiQuang?: number | null;
  kL_Nhan?: number | null;
}

export interface RangBuocTPHHValue {
  id_TPHH: number;
  ma_TPHH: string;
  ten_TPHH: string;
  min_PhanTram?: number;
  max_PhanTram?: number;
}

export interface CongThucPhoiDetailMinimal {
  congThuc: CongThucPhoiBasic;
  quangDauRa: QuangDauRaBasic;
  chiTietQuang: ChiTietQuangChem[];
  rangBuocTPHH: RangBuocTPHHValue[];
  milestone?: number;
}

// ===== Mix API Models =====

export interface MixRequestDto {
  CongThucPhoi: {
    ID?: number | null;
    ID_Phuong_An?: number;
    Ma_Cong_Thuc: string;
    Ten_Cong_Thuc: string;
    Ghi_Chu?: string | null;
    Ngay_Tao?: string;
  };
  Milestone?: number | null;
  ChiTietQuang: Array<{
    ID_Quang: number;
    Ti_Le_PhanTram: number;
    // Milestone-specific fields:
    // ThieuKet
    Khau_Hao?: number | null;
    Ti_Le_KhaoHao?: number | null;
    // LoCao
    KL_VaoLo?: number | null;
    Ti_Le_HoiQuang?: number | null;
    KL_Nhan?: number | null;
    TP_HoaHocs?: Array<{
      Id: number;
      PhanTram: number;
      ThuTuTPHH?: number;
    }>;
  }>;
  RangBuocTPHH: Array<{
    ID_TPHH: number;
    Min_PhanTram?: number | null;
    Max_PhanTram?: number | null;
  }>;
  QuangThanhPham: {
    Ma_Quang: string;
    Ten_Quang: string;
    Loai_Quang: number;
    Mat_Khi_Nung?: number | null;
    ThanhPhanHoaHoc: Array<{
      ID_TPHH: number;
      Gia_Tri_PhanTram: number;
      ThuTuTPHH?: number;
    }>;
  };
}

export interface MixResponseDto {
  idQuangOut: number;
}

// ===== Clone API Models =====

export interface ClonePlanRequestDto {
  sourcePlanId: number;
  newPlanName: string;
  resetRatiosToZero?: boolean;
  copySnapshots?: boolean;
  copyDates?: boolean;
  copyStatuses?: boolean;
}

export interface CloneMilestonesRequestDto {
  sourcePlanId: number;
  targetPlanId?: number;
  cloneItems: Array<{
    milestone?: number;
    formulaIds?: number[];
  }>;
  resetRatiosToZero?: boolean;
  copySnapshots?: boolean;
  copyDates?: boolean;
}

export interface CloneResponseDto {
  id: number;
}

// ===== Get Detail API Models =====

export interface CongThucPhoiDetailResponse {
  congThuc: CongThucPhoiBasic;
  quangDauRa: QuangDauRaBasic;
  chiTietQuang: ChiTietQuangChem[];
  rangBuocTPHH: RangBuocTPHHValue[];
  milestone?: number;
  bangChiPhi?: Array<{
    iD_CongThucPhoi: number;
    iD_Quang: number | null;
    lineType: string;
    tieuhao: number | null;
    donGiaVND: number | null;
    donGiaUSD: number;
  }>;
}

// ===== Get Formulas By Plan API Models =====

export interface FormulaBasic {
  id: number;
  ma_Cong_Thuc: string;
  ten_Cong_Thuc?: string;
  id_Quang_Dau_Ra: number;
  ten_Quang_Dau_Ra?: string;
}

export interface PhuongAnPhoiWithFormulasBasicResponse {
  planId: number;
  ten_Phuong_An: string;
  ngay_Tinh_Toan: string;
  milestone: number;
  formulas: FormulaBasic[];
}

// ===== Delete API Models =====

export interface DeleteResponseDto {
  success: boolean;
  message: string;
}
