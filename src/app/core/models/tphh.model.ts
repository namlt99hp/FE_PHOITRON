export interface TPHHTableModel{
    id: number;
    ma_TPHH: string;
    ten_TPHH: string;
    don_Vi?: string | null;
    thu_Tu?: number | null;
    ghi_Chu?: string | null;
    ngay_Tao?: string;
    nguoi_Tao?: number | null;
    da_Xoa?: boolean;
}

export interface TPHHCreateDto{
    ma_TPHH: string;
    ten_TPHH: string;
    don_Vi?: string | null;
    thu_Tu?: number | null;
    ghi_Chu?: string | null;
    nguoi_Tao?: number | null;
}

export interface TPHHUpdateDto extends TPHHCreateDto{
    id: number;
}

export interface TPHHUpsertDto {
    id?: number | null;
    tp_HoaHoc: TPHHCreateDto;
}

export interface TPHHSelectItemModel{
    id: number;
    ma_TPHH: string;
    ten_TPHH: string
}