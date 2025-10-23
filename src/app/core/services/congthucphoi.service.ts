import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CongThucPhoiDetailRespone, CongThucPhoiTableModel, UpsertAndConfirmDto, UpsertAndConfirmResult, Cong_Thuc_PhoiCreateDto, Cong_Thuc_PhoiResponse, Cong_Thuc_PhoiUpdateDto, Cong_Thuc_PhoiUpsertDto } from '../models/congthucphoi.model';
import {
  TableQuery,
  TableResult,
} from '../../shared/components/table-common/table-types';

@Injectable({ providedIn: 'root' })
export class CongThucPhoiService {
  baseApi = `${environment.apiBaseUrl}/Cong_Thuc_Phoi`;
  private http = inject(HttpClient);

  search(q: TableQuery): Observable<TableResult<CongThucPhoiTableModel>> {
    const api = `${this.baseApi}/Search`;
    return this.http
      .get<TableResult<any>>(api, {
        params: {
          page: q.pageIndex,
          pageSize: q.pageSize,
          search: q.search ?? '',
          sortBy: q.sortBy ?? '',
          sortDir: q.sortDir ?? '',
        } as any,
      })
      .pipe(
        map((res) => ({
          ...res,
          data: (res.data ?? []).map((x: any) => ({
            id: x.id,
            maCongThuc: x.ma_Cong_Thuc,
            tenCongThuc: x.ten_Cong_Thuc ?? '',
            tongPhanTram: undefined,
            ghiChu: x.ghi_Chu ?? undefined,
            ngayTao: x.hieu_Luc_Tu,
            iD_NguoiTao: undefined,
            ngaySua: x.hieu_Luc_Den ?? undefined,
            iD_NguoiSua: undefined,
          })) as CongThucPhoiTableModel[],
        }))
      );
  }

  getById(id: number): Observable<CongThucPhoiDetailRespone> {
    const api = `${this.baseApi}/GetById/${id}`;
    return this.http.get<CongThucPhoiDetailRespone>(api);
  }

  create(dto: Cong_Thuc_PhoiCreateDto): Observable<any> {
    const api = `${this.baseApi}/Create`;
    return this.http.post<any>(api, dto);
  }

  update(dto: Cong_Thuc_PhoiUpdateDto): Observable<any> {
    const api = `${this.baseApi}/Update`;
    return this.http.put<any>(api, dto);
  }

  upsert(dto: Cong_Thuc_PhoiUpsertDto): Observable<any> {
    const api = `${this.baseApi}/Upsert`;
    return this.http.post<any>(api, dto);
  }

  softDelete(id: number): Observable<any> {
    const api = `${this.baseApi}/SoftDelete/${id}`;
    return this.http.delete<any>(api);
  }

  getByQuangDauRa(idQuangDauRa: number): Observable<any[]> {
    const api = `${this.baseApi}/GetByQuangDauRa/${idQuangDauRa}`;
    return this.http.get<any[]>(api);
  }

  existsByCode(maCongThuc: string): Observable<{ exists: boolean }> {
    const api = `${this.baseApi}/ExistsByCode/${encodeURIComponent(maCongThuc)}`;
    return this.http.get<{ exists: boolean }>(api);
  }

  getActive(): Observable<any[]> {
    const api = `${this.baseApi}/GetActive`;
    return this.http.get<any[]>(api);
  }

  // Backward compatibility
  getDetail(id: number): Observable<CongThucPhoiDetailRespone>{
    return this.getById(id);
  }
  upsertAndConfirm(payload: UpsertAndConfirmDto){
    const api = `${this.baseApi}/UpsertAndConfirm`;
    return this.http.post<UpsertAndConfirmResult>(api, payload);
  }

  deleteCongThucPhoi(id: number): Observable<any> {
    const api = `${this.baseApi}/DeleteCongThucPhoi/${id}`;
    return this.http.delete<any>(api);
  }
}
