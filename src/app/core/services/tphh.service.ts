import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CongThucPhoiDetailRespone } from '../models/congthucphoi.model';
import {
  TableQuery,
  TableResult,
} from '../../shared/components/table-common/table-types';
import { TPHHDto, TPHHSelectItemModel, TPHHTableModel } from '../models/tphh.model';
import { HttpResponseModel } from '../models/http-response.model';

@Injectable({ providedIn: 'root' })
export class ThanhPhanHoaHocService {
  baseApi = `${environment.apiBaseUrl}/TPHH`;
  private http = inject(HttpClient);

  search(q: TableQuery): Observable<TableResult<TPHHTableModel>> {
    const api = `${this.baseApi}/Search`;
    return this.http.get<TableResult<TPHHTableModel>>(api, {
      params: {
        page: q.pageIndex,
        pageSize: q.pageSize,
        search: q.search ?? '',
        sortBy: q.sortBy ?? '',
        sortDir: q.sortDir ?? '',
      } as any,
    });
  }

  getDetail(id: number): Observable<TPHHTableModel> {
    const api = `${this.baseApi}/Get/${id}`;
    return this.http.get<TPHHTableModel>(api);
  }

  create(dto: TPHHDto): Observable<any> {
    const api = `${this.baseApi}/Create`;
    return this.http.post<any>(api, dto);
  }

  update(dto: TPHHDto): Observable<HttpResponseModel> {
    const api = `${this.baseApi}/Update/${dto.id}`;
    return this.http.put<HttpResponseModel>(api, dto);
  }

  delete(id: number): Observable<HttpResponseModel> {
    const api = `${this.baseApi}/Delete/${id}`;
    return this.http.delete<HttpResponseModel>(api);
  }

  GetByListIds(ids: number[]): Observable<TPHHSelectItemModel[]> {
    const api = `${this.baseApi}/GetByListIds`;
    return this.http.post<TPHHSelectItemModel[]>(api, ids);
  }
}
