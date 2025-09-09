import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CongThucPhoiDetailRespone, CongThucPhoiTableModel, UpsertAndConfirmDto, UpsertAndConfirmResult } from '../models/congthucphoi.model';
import {
  TableQuery,
  TableResult,
} from '../../shared/components/table-common/table-types';

@Injectable({ providedIn: 'root' })
export class CongThucPhoiService {
  baseApi = `${environment.apiBaseUrl}/CongThucPhoi`;
  private http = inject(HttpClient);

  search(q: TableQuery): Observable<TableResult<CongThucPhoiTableModel>> {
    const api = `${this.baseApi}/Search`;
    return this.http.get<TableResult<CongThucPhoiTableModel>>(api, {
      params: {
        page: q.pageIndex,
        pageSize: q.pageSize,
        search: q.search ?? '',
        sortBy: q.sortBy ?? '',
        sortDir: q.sortDir ?? '',
      } as any,
    });
  }

  getDetail(id: number): Observable<CongThucPhoiDetailRespone>{
    const api = `${this.baseApi}/GetDetail`;
    return this.http.get<CongThucPhoiDetailRespone>(api,{params: {id: id}});
  }

  upsertAndConfirm(payload: UpsertAndConfirmDto){
    const api = `${this.baseApi}/UpsertAndConfirm`;
    return this.http.post<UpsertAndConfirmResult>(api, payload);
  }
}
