import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { 
  TableQuery,
  TableResult,
} from '../../shared/components/table-common/table-types';
import {
  QuangDetailResponse, 
  QuangSelectItemModel, 
  QuangTableModel, 
  ThanhPhanQuangDto, 
  UpsertQuangDto, 
  QuangUpsertSnakeDto, 
  QuangCreateDto,
  QuangUpsertWithThanhPhanResponse,
  QuangUpsertWithThanhPhanDto,
  QuangKetQuaUpsertDto,
  QuangKetQuaUpsertResponse
} from '../models/quang.model';
import { ApiResponse } from '../models/http-response.model';

@Injectable({ providedIn: 'root' })
export class QuangService {
  baseApi = `${environment.apiBaseUrl}/Quang`;
  private http = inject(HttpClient);

  search(q: TableQuery & { loaiQuang?: number | null }): Observable<TableResult<QuangTableModel>> {
    const api = `${this.baseApi}/Search`;
    return this.http.get<ApiResponse<TableResult<QuangTableModel>>>(api, {
      params: {
        page: q.pageIndex,
        pageSize: q.pageSize,
        search: q.search ?? '',
        sortBy: q.sortBy ?? '',
        sortDir: q.sortDir ?? '',
        loaiQuang: q.loaiQuang ?? '',
      } as any,
    }).pipe(
      map((apiRes) => {
        if (apiRes.success && apiRes.data) {
          return {
            ...apiRes.data,
            data: apiRes.data.data.map((x: any) => ({
              id: x.id,
              maQuang: x.ma_Quang,
              tenQuang: x.ten_Quang,
              loaiQuang: x.loai_Quang,
              gia: x.gia_USD_1Tan ?? 0,
              giaUSD: x.gia_USD_1Tan ?? 0,
              giaVND: x.gia_VND_1Tan ?? 0,
              tyGia: x.ty_Gia_USD_VND ?? 0,
              ngayTyGia: x.ngay_Ty_Gia?.toString?.() ?? x.ngay_Ty_Gia ?? null,
              ghiChu: x.ghi_Chu ?? undefined,
              ngayTao: x.ngay_Tao,
              iD_NguoiTao: x.nguoi_Tao ?? undefined,
              ngaySua: x.ngay_Sua ?? undefined,
              iD_NguoiSua: x.nguoi_Sua ?? undefined,
              matKhiNung: x.mat_Khi_Nung ?? 0,
              tien_Te: x.tien_Te ?? '',
            })) as QuangTableModel[],
          };
        }
        return { data: [], total: 0 } as TableResult<QuangTableModel>;
      })
    ); 
  }

  // Batch: get formulas by output ore ids
  getFormulasByOutputOreIds(outputOreIds: number[]) {
    const api = `${environment.apiBaseUrl}/Quang/GetFormulasByOutputOreIds`;
    return this.http.post<ApiResponse<Array<{
      outputOreId: number;
      congThucPhoiId: number;
      ma_Cong_Thuc: string;
      ten_Cong_Thuc: string;
      ngay_Tao: string;
      items: Array<{ id: number; ma_Quang: string; ten_Quang: string; loai_Quang: number; gia_USD_1Tan: number; ty_Gia_USD_VND: number; gia_VND_1Tan: number; ti_Le_PhanTram: number; }>
    }>>>(api, outputOreIds).pipe(map(res => res.data ?? []));
  }

  // New endpoints aligned with backend controller
  getById(id: number): Observable<QuangDetailResponse> {
    const api = `${this.baseApi}/GetDetailById/${id}`;
    return this.http.get<ApiResponse<QuangDetailResponse>>(api).pipe(
      map((res) => {
        if (res.success && res.data) {
          return res.data;
        }
        throw new Error(res.message || 'Failed to fetch Quang by ID');
      })
    );
  }

  create(dto: UpsertQuangDto): Observable<any> {
    const api = `${this.baseApi}/Create`;
    return this.http.post<any>(api, dto);
  }

  update(dto: UpsertQuangDto & { id: number }): Observable<any> {
    const api = `${this.baseApi}/Update`;
    return this.http.put<any>(api, dto);
  }

  upsert(dto: QuangUpsertSnakeDto): Observable<any> {
    const api = `${this.baseApi}/Upsert`;
    return this.http.post<any>(api, dto);
  }

  softDelete(id: number): Observable<any> {
    const api = `${this.baseApi}/SoftDelete/${id}`;
    return this.http.delete<any>(api);
  }

  getByLoai(loaiQuang: number): Observable<QuangSelectItemModel[]> {
    const api = `${this.baseApi}/GetByLoai/${loaiQuang}`;
    return this.http.get<QuangSelectItemModel[]>(api);
  }

  getActive(): Observable<QuangSelectItemModel[]> {
    const api = `${this.baseApi}/GetActive/active`;
    return this.http.get<ApiResponse<QuangSelectItemModel[]>>(api).pipe(
      map((res) => {
        if (res.success && res.data) {
          return res.data;
        }
        return [];
      })
    );
  }

  setActive(id: number, isActive: boolean): Observable<any> {
    const api = `${this.baseApi}/SetActive/${id}/active/${isActive}`;
    return this.http.put<any>(api, {});
  }

  existsByCode(maQuang: string): Observable<{ exists: boolean }> {
    const api = `${this.baseApi}/ExistsByCode/${encodeURIComponent(maQuang)}`;
    return this.http.get<{ exists: boolean }>(api);
  }


  // Legacy method - kept for backward compatibility
  upsertWithThanhPhan(dto: QuangUpsertWithThanhPhanDto): Observable<ApiResponse<{ id: number }>> {
    const api = `${this.baseApi}/UpsertWithThanhPhan`;
    return this.http.post<ApiResponse<{ id: number }>>(api, dto);
  }


  getGangAndSlagChemistryByPlan(planId: number): Observable<{ gang: QuangDetailResponse | null; slag: QuangDetailResponse | null }>{
    const api = `${this.baseApi}/GetGangAndSlagChemistryByPlan/plan/${planId}`;
    return this.http.get<ApiResponse<{ gang: QuangDetailResponse | null; slag: QuangDetailResponse | null }>>(api).pipe(
      map(res => {
        if (res.success && res.data) return res.data;
        throw new Error(res.message || 'Failed to load gang/slag chemistry by plan');
      })
    );
  }

  // Bundle for Locao (gang/slag + statistics)
  getLoCaoBundle(planId: number): Observable<{ gang: QuangDetailResponse | null; slag: QuangDetailResponse | null; statistics: any[] }>{
    const api = `${this.baseApi}/GetLoCaoBundle/plan/${planId}`;
    return this.http.get<ApiResponse<{ gang: QuangDetailResponse | null; slag: QuangDetailResponse | null; statistics: any[] }>>(api).pipe(
      map(res => {
        if (res.success && res.data) return res.data;
        throw new Error(res.message || 'Failed to load Lò cao bundle');
      })
    );
  }

  // Backward-compatible existing functions (kept, but consider migrating callers)
  getDetail(id: number): Observable<QuangDetailResponse>{
    return this.getById(id);
  }
  GetByListIds(ids: number[]): Observable<QuangSelectItemModel[]>{
    // No direct API; fallback to client filter using getActive()
    return this.getActive().pipe(
      map(allQuangs => allQuangs.filter(q => ids.includes(q.id)))
    );
  }
  getOreChemistryBatch(id_Quangs: number[]): Observable<any[]> {
    return this.http.post<ApiResponse<any[]>>(`${this.baseApi}/GetOreChemistryBatch`, id_Quangs).pipe(
      map((res) => {
        if (res.success && res.data) {
          return res.data;
        }
        return [];
      })
    );
  }

  cloneGangResult(idQuangDich: number): Observable<ApiResponse<{ idQuang: number }>> {
		return this.http.post<ApiResponse<{ idQuang: number }>>(`${this.baseApi}/CloneGangResult/${idQuangDich}`, {});
	}

  upsertQuang(payload: UpsertQuangDto): Observable<any>{
    const toSnake = (q: any): QuangCreateDto => ({
      ma_Quang: q.maQuang,
      ten_Quang: q.tenQuang,
      loai_Quang: q.loaiQuang ?? 0,
      dang_Hoat_Dong: true,
      ghi_Chu: q.ghiChu ?? null,
    });
    const mapped: QuangUpsertSnakeDto = {
      id: payload.id ?? null,
      quang: toSnake(payload.quang),
    };
    return this.upsert(mapped);
  }

  /**
   * Get multiple quangs by IDs for mapping purposes
   */
  getByIds(ids: number[]): Observable<QuangSelectItemModel[]> {
    if (!ids || ids.length === 0) {
      return of([]);
    }
    
    return this.http.post<any[]>(`${environment.apiBaseUrl}/api/Quang/LocaoGetByIds`, { ids }).pipe(
      map(apiRes => apiRes.map((x: any) => ({
        id: x.id,
        tenQuang: x.ten_Quang,
        maQuang: x.ma_Quang,
        loaiQue: x.loai_Quang,
        matKhiNung: x.mat_Khi_Nung ?? 0
      })) as QuangSelectItemModel[])
    );
  }

  /**
   * Upsert Gang/Xỉ result ores with plan mapping
   */
  upsertKetQuaWithThanhPhan(dto: QuangKetQuaUpsertDto): Observable<ApiResponse<QuangKetQuaUpsertResponse>> {
    return this.http.post<ApiResponse<QuangKetQuaUpsertResponse>>(
      `${this.baseApi}/UpsertKetQuaWithThanhPhan`, 
      dto
    );
  }
}
