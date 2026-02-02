import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { TableQuery, TableResult } from '../../shared/components/table-common/table-types';
import { PaLuaChonCongThucCreateDto, PaLuaChonCongThucResponse, PaLuaChonCongThucUpdateDto, PaLuaChonCongThucUpsertDto } from '../models/pa-lua-chon-cong-thuc.model';

@Injectable({ providedIn: 'root' })
export class PaLuaChonCongThucService {
  private http = inject(HttpClient);
  private baseApi = `${environment.apiBaseUrl}/PA_LuaChon_CongThuc`;

  // search(q: TableQuery): Observable<TableResult<PaLuaChonCongThucResponse>> {
  //   const api = `${this.baseApi}/Search`;
  //   return this.http.get<TableResult<PaLuaChonCongThucResponse>>(api, {
  //     params: {
  //       page: q.pageIndex,
  //       pageSize: q.pageSize,
  //       search: q.search ?? '',
  //       sortBy: q.sortBy ?? '',
  //       sortDir: q.sortDir ?? '',
  //     } as any,
  //   });
  // }

  // searchAdvanced(q: TableQuery & { idPhuongAn?: number; idQuangDauRa?: number; idCongThucPhoi?: number }): Observable<TableResult<PaLuaChonCongThucResponse>> {
  //   const api = `${this.baseApi}/SearchAdvanced`;
  //   return this.http.get<TableResult<PaLuaChonCongThucResponse>>(api, {
  //     params: {
  //       page: q.pageIndex,
  //       pageSize: q.pageSize,
  //       idPhuongAn: q['idPhuongAn'] ?? '',
  //       idQuangDauRa: q['idQuangDauRa'] ?? '',
  //       idCongThucPhoi: q['idCongThucPhoi'] ?? '',
  //       search: q.search ?? '',
  //       sortBy: q.sortBy ?? '',
  //       sortDir: q.sortDir ?? '',
  //     } as any,
  //   });
  // }

  // getById(id: number): Observable<PaLuaChonCongThucResponse> {
  //   const api = `${this.baseApi}/GetById/${id}`;
  //   return this.http.get<PaLuaChonCongThucResponse>(api);
  // }

  // create(dto: PaLuaChonCongThucCreateDto): Observable<any> {
  //   const api = `${this.baseApi}/Create`;
  //   return this.http.post<any>(api, dto);
  // }

  // update(dto: PaLuaChonCongThucUpdateDto): Observable<any> {
  //   const api = `${this.baseApi}/Update`;
  //   return this.http.put<any>(api, dto);
  // }

  // upsert(dto: PaLuaChonCongThucUpsertDto): Observable<any> {
  //   const api = `${this.baseApi}/Upsert`;
  //   return this.http.post<any>(api, dto);
  // }

  // softDelete(id: number): Observable<any> {
  //   const api = `${this.baseApi}/SoftDelete/${id}`;
  //   return this.http.delete<any>(api);
  // }

  // getByPhuongAn(idPhuongAn: number): Observable<any[]> {
  //   const api = `${this.baseApi}/GetByPhuongAn/${idPhuongAn}`;
  //   return this.http.get<any[]>(api);
  // }

  // validateNoCircularDependency(idPhuongAn: number): Observable<{ isValid: boolean; message: string }> {
  //   const api = `${this.baseApi}/ValidateNoCircularDependency/${idPhuongAn}`;
  //   return this.http.get<{ isValid: boolean; message: string }>(api);
  // }
}


