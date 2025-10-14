import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  CongThucPhoiDetailResponse,
  DeleteResponseDto
} from '../models/api-models';

export interface PhuongAnPhoiCreateDto {
  Ten_Phuong_An: string;
  ID_Quang_Dich: number;
  Ngay_Tinh_Toan: string; // ISO
  Phien_Ban?: number;
  Trang_Thai?: number; // 0-2
  Muc_Tieu?: number | null;
  Ghi_Chu?: string | null;
}

export interface PhuongAnPhoiUpsertDto {
  ID: number | null;
  Phuong_An_Phoi: PhuongAnPhoiCreateDto;
}

@Injectable({ providedIn: 'root' })
export class PhuongAnPhoiService {
  private http = inject(HttpClient);
  private baseApi = `${environment.apiBaseUrl}/Phuong_An_Phoi`;

  upsert(dto: PhuongAnPhoiUpsertDto): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(`${this.baseApi}/Upsert`, dto);
  }

  softDelete(id: number): Observable<ApiResponse<DeleteResponseDto>> {
    return this.http.delete<ApiResponse<DeleteResponseDto>>(`${this.baseApi}/SoftDelete/${id}`);
  }

  delete(id: number): Observable<ApiResponse<DeleteResponseDto>> {
    return this.http.delete<ApiResponse<DeleteResponseDto>>(`${this.baseApi}/Delete/${id}`);
  }

  getByQuangDich(idQuangDich: number): Observable<ApiResponse<PhuongAnPhoiBasicInfo[]>> {
    return this.http.get<ApiResponse<PhuongAnPhoiBasicInfo[]>>(`${this.baseApi}/GetByQuangDich/quang-dich/${idQuangDich}`);
  }

  mix(dto: MixRequestDto): Observable<ApiResponse<MixResponseDto>> {
    return this.http.post<ApiResponse<MixResponseDto>>(`${this.baseApi}/Mix`, dto);
  }

  mixStandalone(dto: MixRequestDto): Observable<ApiResponse<MixResponseDto>> {
    return this.http.post<ApiResponse<MixResponseDto>>(`${this.baseApi}/MixStandalone`, dto);
  }

  getCongThucPhoiDetail(congThucPhoiId: number): Observable<ApiResponse<CongThucPhoiDetailResponse>> {
    return this.http.get<ApiResponse<CongThucPhoiDetailResponse>>(`${this.baseApi}/GetCongThucPhoiDetail/${congThucPhoiId}`);
  }

  getFormulasByPlan(idPhuongAn: number): Observable<ApiResponse<PhuongAnPhoiWithFormulasBasicResponse>> {
    return this.http.get<ApiResponse<PhuongAnPhoiWithFormulasBasicResponse>>(`${this.baseApi}/GetFormulasByPlan/${idPhuongAn}`);
  }

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

  cloneMilestones(dto: CloneMilestonesRequestDto): Observable<ApiResponse<CloneResponseDto>> {
    return this.http.post<ApiResponse<CloneResponseDto>>(`${this.baseApi}/CloneMilestones`, dto);
  }

  deletePlanWithRelatedData(planId: number): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(`${this.baseApi}/DeletePlanWithRelatedData/${planId}`);
  }

}

