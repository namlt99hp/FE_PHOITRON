import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { TableQuery, TableResult } from '../../shared/components/table-common/table-types';
import { QuangTpPhanTichCreateDto, QuangTpPhanTichResponse, QuangTpPhanTichUpdateDto, QuangTpPhanTichUpsertDto } from '../models/quang-tp-phan-tich.model';

@Injectable({ providedIn: 'root' })
export class QuangTpPhanTichService {
  private http = inject(HttpClient);
  private baseApi = `${environment.apiBaseUrl}/Quang_TP_PhanTich`;

  // search(q: TableQuery): Observable<TableResult<QuangTpPhanTichResponse>> {
  //   const api = `${this.baseApi}/Search`;
  //   return this.http.get<TableResult<QuangTpPhanTichResponse>>(api, {
  //     params: {
  //       page: q.pageIndex,
  //       pageSize: q.pageSize,
  //       search: q.search ?? '',
  //       sortBy: q.sortBy ?? '',
  //       sortDir: q.sortDir ?? '',
  //     } as any,
  //   });
  // }

  // getById(id: number): Observable<QuangTpPhanTichResponse> {
  //   const api = `${this.baseApi}/GetById/${id}`;
  //   return this.http.get<QuangTpPhanTichResponse>(api);
  // }

  // create(dto: QuangTpPhanTichCreateDto): Observable<any> {
  //   const api = `${this.baseApi}/Create`;
  //   return this.http.post<any>(api, dto);
  // }

  // update(dto: QuangTpPhanTichUpdateDto): Observable<any> {
  //   const api = `${this.baseApi}/Update`;
  //   return this.http.put<any>(api, dto);
  // }

  // upsert(dto: QuangTpPhanTichUpsertDto): Observable<any> {
  //   const api = `${this.baseApi}/Upsert`;
  //   return this.http.post<any>(api, dto);
  // }

  // softDelete(id: number): Observable<any> {
  //   const api = `${this.baseApi}/SoftDelete/${id}`;
  //   return this.http.delete<any>(api);
  // }

  // getByQuangAndDate(idQuang: number, ngayTinhISO: string): Observable<QuangTpPhanTichResponse[]> {
  //   const api = `${this.baseApi}/GetByQuangAndDate`;
  //   return this.http.get<QuangTpPhanTichResponse[]>(api, { params: { idQuang, ngayTinh: ngayTinhISO } as any });
  // }
}


