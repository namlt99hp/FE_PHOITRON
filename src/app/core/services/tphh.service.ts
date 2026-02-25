import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CongThucPhoiDetailRespone } from '../models/congthucphoi.model';
import {
  TableQuery,
  TableResult,
} from '../../shared/components/table-common/table-types';
import { TPHHCreateDto, TPHHSelectItemModel, TPHHTableModel, TPHHUpdateDto, TPHHUpsertDto } from '../models/tphh.model';
import { ApiResponse, HttpResponseModel } from '../models/http-response.model';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ThanhPhanHoaHocService {
  baseApi = `${environment.apiBaseUrl}/TP_HoaHoc`;
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  search(q: TableQuery): Observable<TableResult<TPHHTableModel>> {
    const api = `${this.baseApi}/Search`;
    return this.http.get<ApiResponse<TableResult<TPHHTableModel>>>(api, {
      params: {
        page: q.pageIndex,
        pageSize: q.pageSize, 
        search: q.search ?? '',
        sortBy: q.sortBy ?? '',
        sortDir: q.sortDir ?? '',
      } as any,
    }).pipe(
      map((apiRes) => {
        if (apiRes.success && apiRes.data) {
          return apiRes.data;
        }
        return { data: [], total: 0 } as TableResult<TPHHTableModel>;
      })
    );
  }

  getById(id: number): Observable<TPHHTableModel> {
    const api = `${this.baseApi}/GetById/${id}`;
    return this.http.get<ApiResponse<TPHHTableModel>>(api).pipe(map((res) => (res?.data as TPHHTableModel)));
  }

  create(dto: TPHHCreateDto): Observable<any> {
    const api = `${this.baseApi}/Create`;
    const creator = this.auth.getCurrentUserId();
    const payload = { ...dto, nguoi_Tao: creator } as any;
    return this.http.post<any>(api, payload);
  }

  update(dto: TPHHUpdateDto): Observable<HttpResponseModel> {
    const api = `${this.baseApi}/Update`;
    const creator = this.auth.getCurrentUserId();
    const payload = { ...dto, nguoi_Tao: creator } as any;
    return this.http.put<HttpResponseModel>(api, payload);
  }

  upsert(dto: TPHHUpsertDto): Observable<HttpResponseModel<{ id: number }>> {
    const api = `${this.baseApi}/Upsert`;
    // upsert wraps create/update at BE; include creator in inner create model if present
    const creator = this.auth.getCurrentUserId();
    const payload = {
      ...dto,
      tP_HoaHoc: dto.tp_HoaHoc ? { ...dto.tp_HoaHoc, nguoi_Tao: creator } : undefined
    } as any;
    return this.http.post<HttpResponseModel<{ id: number }>>(api, payload);
  }

  delete(id: number): Observable<HttpResponseModel> {
    const api = `${this.baseApi}/Delete/${id}`;
    return this.http.delete<HttpResponseModel>(api);
  }

  // Backward compatible wrappers
  getDetail(id: number): Observable<TPHHTableModel> {
    return this.getById(id);
  }
  
  GetByListIds(ids: number[]): Observable<TPHHSelectItemModel[]> {
    const api = `${this.baseApi}/GetByListIds`;
    return this.http.post<TPHHSelectItemModel[]>(api, ids);
  }

  getDefaultChems(): Observable<TPHHTableModel[]> {
    const api = `${this.baseApi}/GetDefaultChems`;
    return this.http.get<ApiResponse<TPHHTableModel[]>>(api).pipe(
      map((res) => {
        if (res.success && res.data) {
          return res.data;
        }
        return [];
      })
    );

  }
}

