export interface PhuongAnPhoiCreateDto {
  ten_Phuong_An: string;
  id_Quang_Dich: number;
  ngay_Tinh_Toan: string; // ISO
  phien_Ban?: number;
  trang_Thai?: number;
  muc_Tieu?: number | null;
  ghi_Chu?: string | null;
  createdBy?: number | null;
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

// Thiêu Kết section models
export interface ThieuKetOreComponentDto {
  oreId: number;
  maQuang: string;
  tenQuang: string;
  tiLePhanTram: number;
}

export interface ThieuKetSectionDto {
  components: ThieuKetOreComponentDto[];
  /** Chỉ các quặng con của quặng phối trong công thức thiêu kết (do BE trả về). */
  childComponents?: ThieuKetOreComponentDto[] | null;
  tK_TIEU_HAO_QTK?: number | null;
  tK_SIO2_QTK?: number | null;
  tK_TFE?: number | null;
  tK_R2?: number | null;
  tK_PHAM_VI_VAO_LO?: number | null;
  tK_COST?: number | null;
}

export interface PlanThieuKetSectionDto {
  planId: number;
  ten_Phuong_An: string;
  ngay_Tinh_Toan?: string | null;
  components: ThieuKetOreComponentDto[];
  tK_TIEU_HAO_QTK?: number | null;
  tK_SIO2_QTK?: number | null;
  tK_TFE?: number | null;
  tK_R2?: number | null;
  tK_PHAM_VI_VAO_LO?: number | null;
  tK_COST?: number | null;
}

// Lò Cao section models
export interface LoCaoOreComponentDto {
  oreId: number;
  maQuang: string;
  tenQuang: string;
  tiLePhanTram: number;
  loaiQuang?: number; // Loại quặng (5 = Quặng sống)
}

export interface LoCaoSectionDto {
  components: LoCaoOreComponentDto[];
  lC_SAN_LUONG_GANG?: number | null;
  lC_TIEU_HAO_QUANG?: number | null;
  lC_COKE_25_80?: number | null;
  lC_COKE_10_25?: number | null;
  lC_THAN_PHUN?: number | null;
  lC_TONG_NHIEU_LIEU?: number | null;
  lC_XUAT_LUONG_XI?: number | null;
  lC_R2?: number | null;
  lC_TONG_KLK_VAO_LO?: number | null;
  lC_TONG_ZN_VAO_LO?: number | null;
  lC_PHAM_VI_VAO_LO?: number | null;
  lC_TI_TRONG_GANG?: number | null;
  lC_MN_TRONG_GANG?: number | null;
  /** Tổng chi phí = giá quặng đầu ra Lò cao (cùng giá lưu khi phối trong mix). */
  tongChiPhi?: number | null;
}

export interface PlanLoCaoSectionDto {
  planId: number;
  ten_Phuong_An: string;
  ngay_Tinh_Toan?: string | null;
  components: LoCaoOreComponentDto[];
  lC_SAN_LUONG_GANG?: number | null;
  lC_TIEU_HAO_QUANG?: number | null;
  lC_COKE_25_80?: number | null;
  lC_COKE_10_25?: number | null;
  lC_THAN_PHUN?: number | null;
  lC_TONG_NHIEU_LIEU?: number | null;
  lC_XUAT_LUONG_XI?: number | null;
  lC_R2?: number | null;
  lC_TONG_KLK_VAO_LO?: number | null;
  lC_TONG_ZN_VAO_LO?: number | null;
  lC_PHAM_VI_VAO_LO?: number | null;
  lC_TI_TRONG_GANG?: number | null;
  lC_MN_TRONG_GANG?: number | null;
}

// Bảng chi phí LoCao DTO - đơn giản cho render
export interface BangChiPhiLoCaoDto {
  tenQuang: string;
  tieuhao: number | null;
  lineType: string;
  loaiQuang?: number | null;
}

// Combined DTO for both sections
export interface PlanSectionDto {
  planId: number;
  ten_Phuong_An: string;
  ngay_Tinh_Toan?: string | null;
  thieuKet?: ThieuKetSectionDto | null;
  loCao?: LoCaoSectionDto | null;
  bangChiPhiLoCao?: BangChiPhiLoCaoDto[] | null;
}

/** Quặng liên quan đến các phương án của gang đích (Giá đầu vào summary), trừ loại 2, 4, 7. */
export interface RelatedOreForSummaryDto {
  id: number;
  maQuang: string;
  tenQuang: string;
  idLoaiQuang: number;
  giaUsd?: number | null;
  giaVnd?: number | null;
  tyGia?: number | null;
  ngayTyGia?: string | null;
}
