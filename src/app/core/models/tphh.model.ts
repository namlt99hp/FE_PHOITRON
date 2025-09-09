export interface TPHHTableModel{
    id: number;
    ma_TPHH: string;
    ten_TPHH: string
    ghiChu?: string
    ngayTao: string;
    iD_NguoiTao?: number;
    ngaySua?: string; 
    iD_NguoiSua?: number;
}

export interface TPHHDto{
    id?: number;
    ma_TPHH: string;
    ten_TPHH: string
    ghiChu?: string;
}

export interface TPHHSelectItemModel{
    id: number;
    ma_TPHH: string;
    ten_TPHH: string
}