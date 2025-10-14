import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { TableQuery, TableResult } from '../../shared/components/table-common/table-types';
import { QuangGiaLichSuCreateDto, QuangGiaLichSuResponse, QuangGiaLichSuUpdateDto, QuangGiaLichSuUpsertDto } from '../models/quang-gia-lich-su.model';

@Injectable({ providedIn: 'root' })
export class QuangGiaLichSuService {
  private http = inject(HttpClient);
  private baseApi = `${environment.apiBaseUrl}/Quang_Gia_LichSu`;

  search(q: TableQuery): Observable<TableResult<QuangGiaLichSuResponse>> {
    const api = `${this.baseApi}/Search`;
    return this.http.get<TableResult<QuangGiaLichSuResponse>>(api, {
      params: {
        page: q.pageIndex,
        pageSize: q.pageSize,
        search: q.search ?? '',
        sortBy: q.sortBy ?? '',
        sortDir: q.sortDir ?? '',
      } as any,
    });
  }

  getById(id: number): Observable<QuangGiaLichSuResponse> {
    const api = `${this.baseApi}/GetById/${id}`;
    return this.http.get<QuangGiaLichSuResponse>(api);
  }

  create(dto: QuangGiaLichSuCreateDto): Observable<any> {
    const api = `${this.baseApi}/Create`;
    return this.http.post<any>(api, dto);
  }

  update(dto: QuangGiaLichSuUpdateDto): Observable<any> {
    const api = `${this.baseApi}/Update`;
    return this.http.put<any>(api, dto);
  }

  upsert(dto: QuangGiaLichSuUpsertDto): Observable<any> {
    const api = `${this.baseApi}/Upsert`;
    return this.http.post<any>(api, dto);
  }

  softDelete(id: number): Observable<any> {
    const api = `${this.baseApi}/SoftDelete/${id}`;
    return this.http.delete<any>(api);
  }

  getByQuang(idQuang: number): Observable<QuangGiaLichSuResponse[]> {
    const api = `${this.baseApi}/GetByQuang/${idQuang}`;
    return this.http.get<QuangGiaLichSuResponse[]>(api);
  }

  getGiaByQuangAndDate(idQuang: number, ngayTinhISO: string): Observable<number | null> {
    const api = `${this.baseApi}/GetGiaByQuangAndDate`;
    return this.http.get<number | null>(api, { params: { idQuang, ngayTinh: ngayTinhISO } as any });
  }
}


