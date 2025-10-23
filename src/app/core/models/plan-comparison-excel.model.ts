export interface PlanComparisonExcelResponse {
  thieuKetSection: PlanComparisonExcelRow[];
  locaoSection: PlanComparisonExcelRow[];
  giaThanhGangSection: PlanComparisonExcelRow[];
  soSanhGiaThanhSection: PlanComparisonExcelRow[];
  planColumns: PlanComparisonExcelColumn[];
}

export interface PlanComparisonExcelRow {
  rowName: string;
  unit?: string;
  isBold: boolean;
  isSectionHeader: boolean;
  isSubSectionHeader: boolean;
  backgroundColor?: string;
  planValues: { [planId: number]: number | null };
  planTextValues: { [planId: number]: string | null };
}

export interface PlanComparisonExcelColumn {
  planId: number;
  planName: string;
  planCode: string;
}

