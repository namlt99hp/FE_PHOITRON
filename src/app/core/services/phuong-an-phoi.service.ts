import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/http-response.model';
import {
  PhuongAnPhoiBasicInfo,
  PhuongAnPhoiWithFormulasResponse,
  PhuongAnPhoiWithFormulasBasicResponse,
  MixRequestDto,
  MixResponseDto,
  ClonePlanRequestDto,
  CloneMilestonesRequestDto,
  CloneResponseDto,
  CloneGangWithAllPlansRequestDto,
  CongThucPhoiDetailResponse,
  DeleteResponseDto
} from '../models/api-models';
import { PlanComparisonExcelResponse } from '../models/plan-comparison-excel.model';
import { PlanThieuKetSectionDto, PlanSectionDto, RelatedOreForSummaryDto } from '../models/phuong-an-phoi.model';
import { AuthService } from './auth.service';

export interface PhuongAnPhoiCreateDto {
  Ten_Phuong_An: string;
  ID_Quang_Dich: number;
  Ngay_Tinh_Toan: string; // ISO
  Phien_Ban?: number;
  Trang_Thai?: number; // 0-2
  Muc_Tieu?: number | null;
  Ghi_Chu?: string | null;
  CreatedBy?: number | null; // align BE
}

export interface PhuongAnPhoiUpsertDto {
  ID: number | null;
  Phuong_An_Phoi: PhuongAnPhoiCreateDto;
}

@Injectable({ providedIn: 'root' })
export class PhuongAnPhoiService {
  private http = inject(HttpClient);
  private baseApi = `${environment.apiBaseUrl}/Phuong_An_Phoi`;
  private auth = inject(AuthService);

  upsert(dto: PhuongAnPhoiUpsertDto): Observable<ApiResponse<{ id: number }>> {
    const creator = this.auth.getCurrentUserId();
    const payload: PhuongAnPhoiUpsertDto = {
      ...dto,
      Phuong_An_Phoi: { ...dto.Phuong_An_Phoi, CreatedBy: creator ?? null }
    };
    return this.http.post<ApiResponse<{ id: number }>>(`${this.baseApi}/Upsert`, payload);
  }

  // softDelete(id: number): Observable<ApiResponse<DeleteResponseDto>> {
  //   return this.http.delete<ApiResponse<DeleteResponseDto>>(`${this.baseApi}/SoftDelete/${id}`);
  // }

  // delete(id: number): Observable<ApiResponse<DeleteResponseDto>> {
  //   return this.http.delete<ApiResponse<DeleteResponseDto>>(`${this.baseApi}/Delete/${id}`);
  // }

  getByQuangDich(idQuangDich: number): Observable<ApiResponse<PhuongAnPhoiBasicInfo[]>> {
    return this.http.get<ApiResponse<PhuongAnPhoiBasicInfo[]>>(`${this.baseApi}/GetByQuangDich/quang-dich/${idQuangDich}`);
  }

  // mix(dto: MixRequestDto): Observable<ApiResponse<MixResponseDto>> {
  //   const creator = this.auth.getCurrentUserId();
  //   const payload = { ...dto, nguoi_Tao: creator } as any;
  //   return this.http.post<ApiResponse<MixResponseDto>>(`${this.baseApi}/Mix`, payload);
  // }

  mixWithCompleteData(dto: any): Observable<ApiResponse<MixResponseDto>> {
    const creator = this.auth.getCurrentUserId();
    const payload = { ...dto, nguoi_Tao: creator } as any;
    return this.http.post<ApiResponse<MixResponseDto>>(`${this.baseApi}/MixWithCompleteData`, payload);
  }

  mixStandalone(dto: MixRequestDto): Observable<ApiResponse<MixResponseDto>> {
    const creator = this.auth.getCurrentUserId();
    const payload = { ...dto, nguoi_Tao: creator } as any;
    return this.http.post<ApiResponse<MixResponseDto>>(`${this.baseApi}/MixStandalone`, payload);
  }

  // getCongThucPhoiDetail(congThucPhoiId: number): Observable<ApiResponse<CongThucPhoiDetailResponse>> {
  //   return this.http.get<ApiResponse<CongThucPhoiDetailResponse>>(`${this.baseApi}/GetCongThucPhoiDetail/${congThucPhoiId}`);
  // }

  // getFormulasByPlan(idPhuongAn: number): Observable<ApiResponse<PhuongAnPhoiWithFormulasBasicResponse>> {
  //   return this.http.get<ApiResponse<PhuongAnPhoiWithFormulasBasicResponse>>(`${this.baseApi}/GetFormulasByPlan/${idPhuongAn}`);
  // }

  getFormulasByPlanWithDetails(idPhuongAn: number): Observable<ApiResponse<PhuongAnPhoiWithFormulasResponse>> {
    return this.http.get<ApiResponse<PhuongAnPhoiWithFormulasResponse>>(`${this.baseApi}/GetFormulasByPlanWithDetails/${idPhuongAn}`);
  }

  getDetailMinimal(congThucPhoiId: number): Observable<ApiResponse<CongThucPhoiDetailResponse>> {
    return this.http.get<ApiResponse<CongThucPhoiDetailResponse>>(`${this.baseApi}/GetDetailMinimal/${congThucPhoiId}`);
  }

  // ===== Clone APIs =====
  clonePlan(dto: ClonePlanRequestDto): Observable<ApiResponse<CloneResponseDto>> {
    return this.http.post<ApiResponse<CloneResponseDto>>(`${this.baseApi}/ClonePlan`, dto);
  }

  cloneGangWithAllPlans(dto: CloneGangWithAllPlansRequestDto): Observable<ApiResponse<{ clonedCount: number }>> {
    return this.http.post<ApiResponse<{ clonedCount: number }>>(`${this.baseApi}/CloneGangWithAllPlans`, dto);
  }

  // cloneMilestones(dto: CloneMilestonesRequestDto): Observable<ApiResponse<CloneResponseDto>> {
  //   return this.http.post<ApiResponse<CloneResponseDto>>(`${this.baseApi}/CloneMilestones`, dto);
  // }

  deletePlanWithRelatedData(planId: number): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(`${this.baseApi}/DeletePlanWithRelatedData/${planId}`);
  }

  // getPlanComparisonExcelByGangDich(gangDichId: number): Observable<ApiResponse<PlanComparisonExcelResponse>> {
  //   return this.http.get<ApiResponse<PlanComparisonExcelResponse>>(`${this.baseApi}/GetPlanComparisonExcelByGangDich/${gangDichId}`);
  // }

  // Combined sections for all plans under a gang target
  getPlanSectionsByGangDich(gangDichId: number, includeThieuKet: boolean = true, includeLoCao: boolean = true): Observable<ApiResponse<PlanSectionDto[]>> {
    const params = new HttpParams()
      .set('includeThieuKet', includeThieuKet.toString())
      .set('includeLoCao', includeLoCao.toString());
    
    return this.http.get<ApiResponse<PlanSectionDto[]>>(`${this.baseApi}/GetPlanSectionsByGangDich/gang-dich/${gangDichId}`, { params });
  }

  /** Danh sách quặng liên quan đến các phương án của gang đích (Giá đầu vào), trừ loại 2, 4, 7. */
  getRelatedOresByGangDich(gangDichId: number): Observable<ApiResponse<RelatedOreForSummaryDto[]>> {
    return this.http.get<ApiResponse<RelatedOreForSummaryDto[]>>(`${this.baseApi}/GetRelatedOresByGangDich/gang-dich/${gangDichId}`);
  }

}

