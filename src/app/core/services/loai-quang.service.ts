import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ApiResponse, HttpResponseModel } from '../models/http-response.model';
import { TableQuery, TableResult } from '../../shared/components/table-common/table-types';
import {
  LoaiQuangCreateDto,
  LoaiQuangTableModel,
  LoaiQuangUpdateDto,
  LoaiQuangUpsertDto,
  LoQuangCreateDto,
  LoQuangTableModel,
  LoQuangUpdateDto,
  LoQuangUpsertDto,
} from '../models/loai-quang.model';

@Injectable({ providedIn: 'root' })
export class LoaiQuangService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseApi = `${environment.apiBaseUrl}/LoaiQuang`;

  search(q: TableQuery): Observable<TableResult<LoaiQuangTableModel>> {
    const api = `${this.baseApi}/Search`;
    return this.http
      .get<ApiResponse<TableResult<LoaiQuangTableModel>>>(api, {
        params: {
          page: q.pageIndex,
          pageSize: q.pageSize,
          search: q.search ?? '',
          sortBy: q.sortBy ?? '',
          sortDir: q.sortDir ?? '',
        } as any,
      })
      .pipe(
        map((res) => {
          if (res.success && res.data) {
            return res.data;
          }
          return { data: [], total: 0 } as TableResult<LoaiQuangTableModel>;
        })
      );
  }

  getById(id: number): Observable<LoaiQuangTableModel> {
    const api = `${this.baseApi}/GetById/${id}`;
    return this.http
      .get<ApiResponse<LoaiQuangTableModel>>(api)
      .pipe(map((res) => res.data as LoaiQuangTableModel));
  }

  upsert(dto: LoaiQuangUpsertDto): Observable<HttpResponseModel<{ id: number }>> {
    const api = `${this.baseApi}/Upsert`;
    const creator = this.auth.getCurrentUserId();
    const payload = {
      ...dto,
      loaiQuang: dto.loaiQuang ? { ...dto.loaiQuang, nguoiTao: creator } : undefined,
    } as any;
    return this.http.post<HttpResponseModel<{ id: number }>>(api, payload);
  }

  delete(id: number): Observable<HttpResponseModel> {
    const api = `${this.baseApi}/Delete/${id}`;
    return this.http.delete<HttpResponseModel>(api);
  }
}

@Injectable({ providedIn: 'root' })
export class LoQuangService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseApi = `${environment.apiBaseUrl}/LoQuang`;

  search(q: TableQuery): Observable<TableResult<LoQuangTableModel>> {
    const api = `${this.baseApi}/Search`;
    return this.http
      .get<ApiResponse<TableResult<LoQuangTableModel>>>(api, {
        params: {
          page: q.pageIndex,
          pageSize: q.pageSize,
          search: q.search ?? '',
          sortBy: q.sortBy ?? '',
          sortDir: q.sortDir ?? '',
        } as any,
      })
      .pipe(
        map((res) => {
          if (res.success && res.data) {
            return res.data;
          }
          return { data: [], total: 0 } as TableResult<LoQuangTableModel>;
        })
      );
  }

  getById(id: number): Observable<LoQuangTableModel> {
    const api = `${this.baseApi}/GetById/${id}`;
    return this.http
      .get<ApiResponse<LoQuangTableModel>>(api)
      .pipe(map((res) => res.data as LoQuangTableModel));
  }

  upsert(dto: LoQuangUpsertDto): Observable<HttpResponseModel<{ id: number }>> {
    const api = `${this.baseApi}/Upsert`;
    const creator = this.auth.getCurrentUserId();
    const payload = {
      ...dto,
      loQuang: dto.loQuang ? { ...dto.loQuang, nguoiTao: creator } : undefined,
    } as any;
    return this.http.post<HttpResponseModel<{ id: number }>>(api, payload);
  }

  delete(id: number): Observable<HttpResponseModel> {
    const api = `${this.baseApi}/Delete/${id}`;
    return this.http.delete<HttpResponseModel>(api);
  }
  
}

