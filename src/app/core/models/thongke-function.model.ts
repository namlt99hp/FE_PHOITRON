export interface ThongKeFunctionModel {
  id: number;
  code: string;
  ten: string;
  moTa: string;
  donVi: string;
  isActive: boolean;
  highlightClass?: string;
  isAutoCalculated: boolean;
}

export interface ThongKeFunctionUpsertModel {
  id?: number;
  code: string;
  ten: string;
  moTa: string;
  donVi: string;
  isActive: boolean;
  highlightClass?: string;
  isAutoCalculated: boolean;
}

export interface PlanResultModel {
  id: number;
  id_ThongKe_Function: number;
  giaTri: number;
  thuTu?: number;
  thongKeFunction?: ThongKeFunctionModel;
}

export interface PlanResultsUpsertModel {
  PlanId: number;
  Items: Array<{
    Id_ThongKe_Function: number;
    GiaTri: number;
    ThuTu?: number;
  }>;
}
