export interface ValidatePlanRequest {
  planId: number;
}

export interface ComputePlanRequest {
  planId: number;
  outputMass_Ton: number;
  ngay_Tinh_Toan?: string; // ISO string
}

export interface ComparePlansRequest {
  planIds: number[];
  outputMass_Ton: number;
  ngay_Tinh_Toan?: string; // ISO string
}

export interface PlanValidationIssue {
  code: string;
  message: string;
  nodePath?: string | null;
}

export interface PlanValidationResult {
  isValid: boolean;
  issues: PlanValidationIssue[];
}

export interface LeafComposition {
  quangId: number;
  ma_Quang: string;
  ten_Quang: string;
  outputMass_Ton: number;
}

export interface ComputePlanResult {
  planId: number;
  ngay_Tinh_Toan: string;
  tPHH_OutputPercent: Record<string, number>;
  tong_Chi_Phi_1Tan: number;
  leafBreakdown: LeafComposition[];
}

export interface ComparePlansResult {
  plans: ComputePlanResult[];
  rankedBy?: string | null;
}


