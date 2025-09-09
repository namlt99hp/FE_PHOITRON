import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { ChemVm } from '../../features/mix-quang-dialog/select-tphh-dialog/select-tphh-dialog.component';
import { OreVm } from '../../features/mix-quang-dialog/select-quang-dialog/select-quang-dialog.component';
import { UpsertAndConfirmDto, UpsertAndConfirmResult } from '../models/congthucphoi.model';

// Dạng dữ liệu hiển thị ở dialog phụ (đã dùng trong components)


@Injectable({
    providedIn: 'root'
})
export class MixOreService {
  private http = inject(HttpClient);
  private base = '/api'; // chỉnh theo backend của bạn

  // ==== API thật ====
  // upsertAndConfirm(payload: UpsertAndConfirmDto): Observable<UpsertAndConfirmResult> {
  //   return this.http.post<UpsertAndConfirmResult>(`${this.base}/cong-thuc/upsert-and-confirm`, payload);
  // }

  // Lấy header ore (nếu edit từ Ore)
  getOreHeader(id: number) {
    return this.http.get<{ MaQuang: string; TenQuang: string; Gia?: number | null; GhiChu?: string | null }>(`${this.base}/quang/${id}/header`);
  }

  // Lấy danh sách hoá học (chem)
//   getAllChemicals(): Observable<ChemVm[]> {
    // return of([
    //   { id: 1, code: 'Fe', name: 'Sắt (Fe)' },
    //   { id: 2, code: 'SiO2', name: 'Silic Dioxit (SiO₂)' },
    //   { id: 3, code: 'Al2O3', name: 'Nhôm Oxit (Al₂O₃)' },
    //   { id: 4, code: 'S', name: 'Lưu huỳnh (S)' },
    // ]);

//   }

  // Lấy danh sách quặng
//   getAllOres(): Observable<OreVm[]> {
//     // TODO: thay bằng API thực, ví dụ: GET /api/quang?type=mua
//     return of([
//       { id: 11, code: 'Q-A', name: 'Quặng A', price: 100 },
//       { id: 12, code: 'Q-B', name: 'Quặng B', price: 120 },
//       { id: 13, code: 'Q-C', name: 'Quặng C', price: 90 },
//     ]);
//   }

  // Trả về map: { [oreId]: { [chemId]: percent } }
  // getOreChemistryBatch(oreIds: number[], chemIds: number[]) {
    // TODO: thay bằng API thực, ví dụ: POST /api/quang/chemistry-batch
    // mock: ngẫu nhiên 10-70%
    // const map: Record<number, Record<number, number>> = {};
    // for (const oid of oreIds) {
    //   map[oid] = {};
    //   for (const cid of chemIds) map[oid][cid] = Math.round((10 + Math.random() * 60) * 100) / 100;
    // }
    // return of(map);
  // }
}
