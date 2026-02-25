import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  QuangKetQuaUpsertResponse,
  GangTemplateConfigResponse,
  GangDichConfigUpsertDto,
  GangDichConfigDetailResponse
} from '../models/quang.model';
import { ApiResponse } from '../models/http-response.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class QuangService {
  baseApi = `${environment.apiBaseUrl}/Quang`;
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  search(q: TableQuery & { idLoaiQuang?: number[] | null; isGangTarget?: boolean | null }): Observable<TableResult<QuangTableModel>> {
    const api = `${this.baseApi}/Search`;

    const body: any = {
      page: q.pageIndex,
      pageSize: q.pageSize,
      search: q.search ?? null,
      sortBy: q.sortBy ?? null,
      sortDir: q.sortDir ?? null,
      loaiQuang: q.idLoaiQuang ?? null, 
      isGangTarget: q.isGangTarget ?? null,
    };

    return this.http.post<ApiResponse<TableResult<QuangTableModel>>>(api, body).pipe(
      map((apiRes) => {
        if (apiRes.success && apiRes.data) {
          return {
            ...apiRes.data,
            data: apiRes.data.data.map((x: any) => ({
              id: x.id,
              maQuang: x.ma_Quang,
              tenQuang: x.ten_Quang,
              iD_LoaiQuang: x.iD_LoaiQuang,
              iD_LoQuang: x.iD_LoQuang ?? null,
              tenLoaiQuang: x.tenLoaiQuang ?? x.ten_LoaiQuang ?? null,
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
      items: Array<{ id: number; ma_Quang: string; ten_Quang: string; iD_LoaiQuang: number; gia_USD_1Tan: number; ty_Gia_USD_VND: number; gia_VND_1Tan: number; ti_Le_PhanTram: number; }>
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

  // create(dto: UpsertQuangDto): Observable<any> {
  //   const api = `${this.baseApi}/Create`;
  //   const creator = this.auth.getCurrentUserId();
  //   const payload = {
  //     ...dto,
  //     quang: dto.quang ? { ...dto.quang, nguoi_Tao: creator } : undefined
  //   } as any;
  //   return this.http.post<any>(api, payload);
  // }

  // update(dto: UpsertQuangDto & { id: number }): Observable<any> {
  //   const api = `${this.baseApi}/Update`;
  //   const creator = this.auth.getCurrentUserId();
  //   const payload = {
  //     ...dto,
  //     quang: dto.quang ? { ...dto.quang, nguoi_Tao: creator } : undefined
  //   } as any;
  //   return this.http.put<any>(api, payload);
  // }

  upsert(dto: QuangUpsertSnakeDto): Observable<any> {
    const api = `${this.baseApi}/Upsert`;
    const creator = this.auth.getCurrentUserId();
    const payload = {
      ...dto,
      quang: dto.quang ? { ...dto.quang, nguoi_Tao: creator } : undefined
    } as any;
    return this.http.post<any>(api, payload);
  }

  // softDelete(id: number): Observable<any> {
  //   const api = `${this.baseApi}/SoftDelete/${id}`;
  //   return this.http.delete<any>(api);
  // }

  delete(id: number): Observable<ApiResponse<object>> {
    const api = `${this.baseApi}/Delete/${id}`;
    return this.http.delete<ApiResponse<object>>(api);
  }

  deleteGangDich(gangDichId: number): Observable<ApiResponse<object>> {
    const api = `${this.baseApi}/DeleteGangDich/${gangDichId}`;
    return this.http.delete<ApiResponse<object>>(api);
  }

  // getByLoai(loaiQuang: number): Observable<QuangSelectItemModel[]> {
  //   const api = `${this.baseApi}/GetByLoai/${loaiQuang}`;
  //   return this.http.get<QuangSelectItemModel[]>(api);
  // }

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

  // setActive(id: number, isActive: boolean): Observable<any> {
  //   const api = `${this.baseApi}/SetActive/${id}/active/${isActive}`;
  //   return this.http.put<any>(api, {});
  // }

  // existsByCode(maQuang: string): Observable<{ exists: boolean }> {
  //   const api = `${this.baseApi}/ExistsByCode/${encodeURIComponent(maQuang)}`;
  //   return this.http.get<{ exists: boolean }>(api);
  // }


  // Legacy method - kept for backward compatibility
  upsertWithThanhPhan(dto: QuangUpsertWithThanhPhanDto): Observable<ApiResponse<{ id: number }>> {
    const api = `${this.baseApi}/UpsertWithThanhPhan`;
    const creator = this.auth.getCurrentUserId();
    const payload = { ...dto, nguoi_Tao: creator } as any;
    return this.http.post<ApiResponse<{ id: number }>>(api, payload);
  }


  // getGangAndSlagChemistryByPlan(planId: number): Observable<{ gang: QuangDetailResponse | null; slag: QuangDetailResponse | null }> {
  //   const api = `${this.baseApi}/GetGangAndSlagChemistryByPlan/plan/${planId}`;
  //   return this.http.get<ApiResponse<{ gang: QuangDetailResponse | null; slag: QuangDetailResponse | null }>>(api).pipe(
  //     map(res => {
  //       if (res.success && res.data) return res.data;
  //       throw new Error(res.message || 'Failed to load gang/slag chemistry by plan');
  //     })
  //   );
  // }

  // getLatestGangTarget(): Observable<QuangDetailResponse | null> {
  //   const api = `${this.baseApi}/GetLatestGangTarget`;
  //   return this.http.get<ApiResponse<QuangDetailResponse | null>>(api).pipe(
  //     map(res => {
  //       if (res.success) return res.data ?? null;
  //       return null;
  //     })
  //   );
  // }

  getGangTemplateConfig(gangId?: number | null): Observable<GangTemplateConfigResponse | null> {
    const api = `${this.baseApi}/GetGangTemplateConfig`;
    let params = new HttpParams();
    if (gangId && gangId > 0) {
      params = params.set('gangId', gangId.toString());
    }
    return this.http.get<ApiResponse<GangTemplateConfigResponse | null>>(api, {
      params: gangId && gangId > 0 ? params : undefined
    }).pipe(
      map(res => {
        if (res.success) return res.data ?? null;
        return null;
      })
    );
  }

  getGangDichDetailWithConfig(gangId: number): Observable<GangDichConfigDetailResponse> {
    const api = `${this.baseApi}/GetGangDichDetailWithConfig/${gangId}`;
    return this.http.get<ApiResponse<GangDichConfigDetailResponse>>(api).pipe(
      map(res => {
        if (res.success && res.data) {
          return res.data;
        }
        throw new Error(res.message || 'Không thể tải thông tin gang đích');
      })
    );
  }

  upsertGangDichWithConfig(dto: GangDichConfigUpsertDto): Observable<ApiResponse<{ id: number }>> {
    const api = `${this.baseApi}/UpsertGangDichWithConfig`;
    const creator = this.auth.getCurrentUserId();

    const payload: GangDichConfigUpsertDto = {
      gang: { ...dto.gang, nguoi_Tao: dto.gang.nguoi_Tao ?? creator },
      slag: dto.slag ? { ...dto.slag, nguoi_Tao: dto.slag.nguoi_Tao ?? creator } : null,
      templateConfig: dto.templateConfig ?? null,
    };

    return this.http.post<ApiResponse<{ id: number }>>(api, payload);
  }

  // Bundle for Locao (gang/slag + statistics)
  getLoCaoBundle(planId: number): Observable<{ gang: QuangDetailResponse | null; slag: QuangDetailResponse | null; statistics: any[] }> {
    const api = `${this.baseApi}/GetLoCaoBundle/plan/${planId}`;
    return this.http.get<ApiResponse<{ gang: QuangDetailResponse | null; slag: QuangDetailResponse | null; statistics: any[] }>>(api).pipe(
      map(res => {
        if (res.success && res.data) return res.data;
        throw new Error(res.message || 'Failed to load Lò cao bundle');
      })
    );
  }

  // Backward-compatible existing functions (kept, but consider migrating callers)
  // getDetail(id: number): Observable<QuangDetailResponse> {
  //   return this.getById(id);
  // }
  GetByListIds(ids: number[]): Observable<QuangSelectItemModel[]> {
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

  // cloneGangResult(idQuangDich: number): Observable<ApiResponse<{ idQuang: number }>> {
  //   return this.http.post<ApiResponse<{ idQuang: number }>>(`${this.baseApi}/CloneGangResult/${idQuangDich}`, {});
  // }

  // upsertQuang(payload: UpsertQuangDto): Observable<any> {
  //   const toSnake = (q: any): QuangCreateDto => ({
  //     ma_Quang: q.maQuang,
  //     ten_Quang: q.tenQuang,
  //     loai_Quang: q.loaiQuang ?? 0,
  //     dang_Hoat_Dong: true,
  //     ghi_Chu: q.ghiChu ?? null,
  //   });
  //   const mapped: QuangUpsertSnakeDto = {
  //     id: payload.id ?? null,
  //     quang: toSnake(payload.quang),
  //   };
  //   return this.upsert(mapped);
  // }

  getByIds(ids: number[]): Observable<QuangSelectItemModel[]> {
    if (!ids || ids.length === 0) {
      return of([]);
    }

    return this.http.post<any[]>(`${environment.apiBaseUrl}/api/Quang/LocaoGetByIds`, { ids }).pipe(
      map(apiRes => apiRes.map((x: any) => ({
        id: x.id,
        tenQuang: x.ten_Quang,
        maQuang: x.ma_Quang,
        loaiQue: x.iD_LoaiQuang,
        matKhiNung: x.mat_Khi_Nung ?? 0
      })) as QuangSelectItemModel[])
    );
  }

  upsertKetQuaWithThanhPhan(dto: QuangKetQuaUpsertDto): Observable<ApiResponse<QuangKetQuaUpsertResponse>> {
    const creator = this.auth.getCurrentUserId();
    const payload = { ...dto, nguoi_Tao: creator } as any;
    return this.http.post<ApiResponse<QuangKetQuaUpsertResponse>>(
      `${this.baseApi}/UpsertKetQuaWithThanhPhan`,
      payload
    );
  }

  checkExists(maQuang: string, tenQuang?: string | null, excludeId?: number | null): Observable<ApiResponse<{ exists: boolean }>> {
    const api = `${this.baseApi}/CheckExists`;
    const payload = {
      maQuang,
      tenQuang: tenQuang || null,
      excludeId: excludeId || null
    };
    return this.http.post<ApiResponse<{ exists: boolean }>>(api, payload);
  }
}