export interface PaLuaChonCongThucCreateDto {
  id_Phuong_An: number;
  id_Quang_DauRa: number;
  id_Cong_Thuc_Phoi: number;
}

export interface PaLuaChonCongThucUpdateDto extends PaLuaChonCongThucCreateDto {
  id: number;
}

export interface PaLuaChonCongThucUpsertDto {
  id?: number | null;
  pA_LuaChon_CongThuc: PaLuaChonCongThucCreateDto;
}

export interface PaLuaChonCongThucResponse {
  id: number;
  id_Phuong_An: number;
  id_Quang_DauRa: number;
  id_Cong_Thuc_Phoi: number;
}


