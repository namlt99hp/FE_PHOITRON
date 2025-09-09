import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import {
  TableQuery,
  TableResult,
} from '../../shared/components/table-common/table-types';
import { QuangDetailResponse, QuangSelectItemModel, QuangTableModel, ThanhPhanQuangDto, UpsertQuangDto } from '../models/quang.model';

@Injectable({ providedIn: 'root' })
export class QuangService {
  baseApi = `${environment.apiBaseUrl}/Quang`;
  private http = inject(HttpClient);

  search(q: TableQuery): Observable<TableResult<QuangTableModel>> {
    const api = `${this.baseApi}/Search`;
    return this.http.get<TableResult<QuangTableModel>>(api, {
      params: {
        page: q.pageIndex,
        pageSize: q.pageSize,
        search: q.search ?? '',
        sortBy: q.sortBy ?? '',
        sortDir: q.sortDir ?? '',
      } as any,
    });
  }

  getDetail(id: number): Observable<QuangDetailResponse>{
    const api = `${this.baseApi}/GetDetailQuang`;
    return this.http.get<QuangDetailResponse>(api,{params: {id: id}});
  }

  GetByListIds(ids: number[]): Observable<QuangSelectItemModel[]>{
    const api = `${this.baseApi}/GetByListIds`;
    return this.http.post<QuangSelectItemModel[]>(api,ids);
  }

  getOreChemistryBatch(id_Quangs: number[]): Observable<QuangDetailResponse[]> {
    const api = `${this.baseApi}/GetOreChemistryBatch`;
    return this.http.post<QuangDetailResponse[]>(api, id_Quangs);
  }

  upsertQuang(payload: UpsertQuangDto): Observable<any>{
    const api = `${this.baseApi}/UpsertQuangMua`;
    return this.http.post<any>(api,payload);
  }
}
