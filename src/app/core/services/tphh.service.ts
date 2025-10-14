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

@Injectable({ providedIn: 'root' })
export class ThanhPhanHoaHocService {
  baseApi = `${environment.apiBaseUrl}/TP_HoaHoc`;
  private http = inject(HttpClient);

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
    return this.http.post<any>(api, dto);
  }

  update(dto: TPHHUpdateDto): Observable<HttpResponseModel> {
    const api = `${this.baseApi}/Update`;
    return this.http.put<HttpResponseModel>(api, dto);
  }

  upsert(dto: TPHHUpsertDto): Observable<HttpResponseModel<{ id: number }>> {
    const api = `${this.baseApi}/Upsert`;
    return this.http.post<HttpResponseModel<{ id: number }>>(api, dto);
  }

  softDelete(id: number): Observable<HttpResponseModel> {
    const api = `${this.baseApi}/SoftDelete/${id}`;
    return this.http.delete<HttpResponseModel>(api);
  }

  // Backward compatible wrappers
  getDetail(id: number): Observable<TPHHTableModel> {
    return this.getById(id);
  }
  delete(id: number): Observable<HttpResponseModel> {
    return this.softDelete(id);
  }

  GetByListIds(ids: number[]): Observable<TPHHSelectItemModel[]> {
    const api = `${this.baseApi}/GetByListIds`;
    return this.http.post<TPHHSelectItemModel[]>(api, ids);
  }
}
