import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { LoCaoProcessParamModel, LoCaoProcessParamUpsertDto } from '../models/locao-process-param.model';
import { LoCaoProcessParamResponse } from '../models/locao-process-param-response.model';
import { environment } from '../../../environments/environment';
import { TableQuery, TableResult } from '../../shared/components/table-common/table-types';

@Injectable({ providedIn: 'root' })
export class LoCaoProcessParamService {
  private http = inject(HttpClient);
  baseApi = `${environment.apiBaseUrl}/LoCaoProcessParam`;

  getAll(): Observable<LoCaoProcessParamModel[]> {
    const api = `${this.baseApi}/GetAll`;
    return this.http.get<any>(api).pipe(
      map((res: any) => res?.data ?? [])
    );
  }

  getById(id: number): Observable<any> {
    const api = `${this.baseApi}/GetById/${id}`;
    return this.http.get<any>(api).pipe(map(res => res?.data));
  }

  getConfiguredByPaId(paLuaChonCongThucId: number): Observable<LoCaoProcessParamResponse[]> {
    const api = `${this.baseApi}/GetConfiguredByPaId/${paLuaChonCongThucId}`;
    return this.http.get<any>(api).pipe(
      map((res: any) => (res?.data ?? []) as LoCaoProcessParamResponse[])
    );
  }

  searchPaged(q: TableQuery): Observable<TableResult<LoCaoProcessParamModel>> {
    const api = `${this.baseApi}/Search`;
    let params = new HttpParams()
      .set('page', (q.pageIndex + 1).toString())
      .set('pageSize', q.pageSize.toString());
    if (q.sortBy) params = params.set('sortBy', q.sortBy);
    if (q.sortDir) params = params.set('sortDir', q.sortDir);
    if (q.search) params = params.set('search', q.search);
    return this.http.get<any>(api, { params }).pipe(
      map((res: any) => {
        // ApiResponse<PagedResult<T>>
        const paged = res?.data;
        const data = paged?.data ?? [];
        const total = paged?.total ?? 0;
        return { data, total } as TableResult<LoCaoProcessParamModel>;
      })
    );
  }

  upsert(dto: LoCaoProcessParamUpsertDto): Observable<LoCaoProcessParamModel> {
    return this.http.post<LoCaoProcessParamModel>(`${this.baseApi}/Upsert`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseApi}/SoftDelete/${id}`);
  }

  configureProcessParamsForPlan(paLuaChonCongThucId: number, processParamIds: number[], thuTuParams: number[]): Observable<any> {
    const api = `${this.baseApi}/ConfigureProcessParamsForPlan`;
    return this.http.post<any>(api, {
      paLuaChonCongThucId,
      processParamIds,
      thuTuParams
    });
  }

  upsertValuesForPlan(paLuaChonCongThucId: number, items: { idProcessParam: number; giaTri: number; thuTuParam?: number | null }[]): Observable<any> {
    const api = `${this.baseApi}/UpsertValuesForPlan`;
    return this.http.post<any>(api, {
      paLuaChonCongThucId,
      items
    });
  }
}


