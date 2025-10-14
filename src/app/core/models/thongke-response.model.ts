export interface ThongKeFunctionResponse {
  id: number;
  code: string;
  ten: string;
  moTa: string;
  donVi: string;
  highlightClass?: string;
  isAutoCalculated: boolean;
  isActive: boolean;
}

export interface ThongKeResultResponse {
  iD_ThongKe_Function: number;
  functionCode: string;
  ten: string;
  donVi: string;
  giaTri: number;
  thuTu?: number;
  description?: string;
  highlightClass?: string;
  isAutoCalculated?: boolean;
}
