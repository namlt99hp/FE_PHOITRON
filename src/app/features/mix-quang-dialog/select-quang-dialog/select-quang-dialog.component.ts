import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { QuangService } from '../../../core/services/quang.service';
import { TableQuery } from '../../../shared/components/table-common/table-types';
import { QuangSelectItemModel } from '../../../core/models/quang.model';
import { LoaiQuangEnum } from '../../../core/enums/loaiquang.enum';

export interface OreVm {
  id: number;
  maQuang: string;
  tenQuang: string;
  loaiQuang?: number; // Loại quặng: 0=Mua, 1=Tron, 2=Gang, 3=Khac
  gia?: number | null; // legacy
  giaUSD?: number | null;
  tyGia?: number | null;
  giaVND?: number | null;
  ngayTyGia?: string | null;
  matKhiNung?: number;
  tiLePhoi?: number; // tỷ lệ phối (khi load từ công thức)
  thuTu?: number; // Thứ tự khi chọn quặng
}

@Component({
  selector: 'app-select-quang-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatPaginatorModule,
  ],
  templateUrl: './select-quang-dialog.component.html',
  styleUrl: './select-quang-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectQuangDialogComponent implements OnInit {
  private dlgRef = inject(MatDialogRef<SelectQuangDialogComponent>);
  private quangService = inject(QuangService);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { preselectedIds?: number[]; multiple?: boolean,  outputLoaiQuang?: number} | null
  ) {}

  cols = ['sel', 'code', 'name', 'price'] as const;
  q = new FormControl<string>('', { nonNullable: true });

  searchPayload: TableQuery = {
    pageIndex: 0,
    pageSize: 10,
    search: '',
  };

  total = signal(0);
  loading = signal(false);

  private q$ = new BehaviorSubject<string>('');
  private page$ = new BehaviorSubject<{ index: number; size: number }>({
    index: 0,
    size: this.searchPayload.pageSize,
  });

  private cache = new Map<number, OreVm>();
  selectedIds = new Set<number>();

  rows$: Observable<OreVm[]> = combineLatest([
    this.q$.pipe(debounceTime(300), distinctUntilChanged(), startWith('')),
    this.page$,
  ]).pipe(
    tap(() => this.loading.set(true)),
    switchMap(([q, { index, size }]) => {
      const payload: any = this.searchPayload = {
        pageIndex: index,
        pageSize: size,
        search: q,
      } as any;
      // Lọc theo ID_LoaiQuang (idLoaiQuang) để QuangService.search map sang body.loaiQuang đúng chuẩn
      payload.idLoaiQuang = [
        LoaiQuangEnum.Mua,
        LoaiQuangEnum.Tron,
        LoaiQuangEnum.NhienLieu,
        LoaiQuangEnum.QuangCo,
        // LoaiQuangEnum.QuangPA
      ];
      if(this.data?.outputLoaiQuang !== LoaiQuangEnum.Tron) {
        payload.idLoaiQuang.push(LoaiQuangEnum.QuangPA);
        payload.idLoaiQuang.push(LoaiQuangEnum.QuangVeVien);
      }
      return this.quangService.search(payload).pipe(
        tap((res) => this.total.set(res.total)),
        map((res) => res.data),
        catchError(() => of([] as OreVm[]))
      );
    }),
    tap((list: any) => {
      list.forEach((x: any) => {
        // Map dữ liệu từ search sang OreVm format
        const oreVm: OreVm = {
          id: x.id,
          maQuang: x.maQuang || x.ma_Quang || '',
          tenQuang: x.tenQuang || x.ten_Quang || '',
          loaiQuang: x.loaiQuang ?? x.iD_LoaiQuang,
          gia: x.gia ?? null,
          giaUSD: x.giaUSD ?? x.gia_USD_1Tan ?? null,
          tyGia: x.tyGia ?? x.ty_Gia_USD_VND ?? null,
          giaVND: x.giaVND ?? x.gia_VND_1Tan ?? null,
          ngayTyGia: x.ngayTyGia ?? x.ngay_Ty_Gia ?? x.ngay_Chon_TyGia ?? null,
          matKhiNung: x.matKhiNung ?? x.mat_Khi_Nung ?? 0,
          tiLePhoi: x.tiLePhoi,
          thuTu: x.thuTu
        };
        this.cache.set(x.id, oreVm);
      });
    }),
    tap(() => this.loading.set(false))
  );

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    if (this.data?.preselectedIds?.length) {
      this.selectedIds = new Set(this.data.preselectedIds);
      // Load dữ liệu cho các quặng đã chọn trước đó vào cache
      this.quangService.GetByListIds(Array.from(this.selectedIds)).subscribe((list: QuangSelectItemModel[]) => {
        list.forEach((x: QuangSelectItemModel) => {
          // Map QuangSelectItemModel sang OreVm
          const oreVm: OreVm = {
            id: x.id,
            maQuang: x.maQuang,
            tenQuang: x.tenQuang,
            loaiQuang: (x as any).iD_LoaiQuang ?? (x as any).loaiQuang,
            gia: x.gia ?? null,
            giaUSD: x.gia_USD_1Tan ?? null,
            tyGia: x.ty_Gia_USD_VND ?? null,
            giaVND: x.gia_VND_1Tan ?? null,
            ngayTyGia: x.ngay_Chon_TyGia ?? null,
            matKhiNung: x.matKhiNung ?? 0,
            tiLePhoi: (x as any).tiLePhoi,
            thuTu: (x as any).thuTu
          };
          this.cache.set(x.id, oreVm);
        });
      });
    }
    this.q.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((v) => {
        this.searchPayload.pageIndex = 0;
        this.q$.next(v ?? '');
        this.page$.next({ index: 0, size: this.searchPayload.pageSize });
      });
    this.q$.next('');
  }

  onPage(e: PageEvent) {
    this.searchPayload.pageIndex = e.pageIndex;
    this.searchPayload.pageSize = e.pageSize;
    this.page$.next({ index: this.searchPayload.pageIndex, size: this.searchPayload.pageSize });
  }

  toggle(row: OreVm) {
    const multi = this.data?.multiple !== false; // default multi
    if (!multi) {
      this.selectedIds.clear();
      this.selectedIds.add(row.id);
      return;
    }
    if (this.selectedIds.has(row.id)) this.selectedIds.delete(row.id);
    else this.selectedIds.add(row.id);
  }

  isChecked(id: number) {
    return this.selectedIds.has(id);
  }

  close() {
    this.dlgRef.close();
  }

  confirm() {
    const ids = Array.from(this.selectedIds);
    const missing = ids.filter((id) => !this.cache.has(id));
    if (missing.length === 0) {
      // Thêm thứ tự (thuTu) dựa trên thứ tự trong selectedIds
      const out = ids.map((id, index) => ({ ...this.cache.get(id)!, thuTu: index + 1 }));
      this.enrichWithCurrentPrice(out).then((enriched) => this.dlgRef.close(enriched));
      return;
    }
    this.quangService.GetByListIds(missing).subscribe((list: QuangSelectItemModel[]) => {
      list.forEach((x: QuangSelectItemModel) => {
        // Map QuangSelectItemModel sang OreVm
        const oreVm: OreVm = {
          id: x.id,
          maQuang: x.maQuang,
          tenQuang: x.tenQuang,
          loaiQuang: (x as any).iD_LoaiQuang ?? (x as any).loaiQuang,
          gia: x.gia ?? null,
          giaUSD: x.gia_USD_1Tan ?? null,
          tyGia: x.ty_Gia_USD_VND ?? null,
          giaVND: x.gia_VND_1Tan ?? null,
          ngayTyGia: x.ngay_Chon_TyGia ?? null,
          matKhiNung: x.matKhiNung ?? 0,
          tiLePhoi: (x as any).tiLePhoi,
          thuTu: (x as any).thuTu
        };
        this.cache.set(x.id, oreVm);
      });
      // Thêm thứ tự (thuTu) dựa trên thứ tự trong selectedIds
      const out = ids.map((id, index) => ({ ...this.cache.get(id)!, thuTu: index + 1 })).filter(Boolean);
      this.enrichWithCurrentPrice(out).then((enriched) => this.dlgRef.close(enriched));
    });
  }

  private async enrichWithCurrentPrice(rows: OreVm[]): Promise<OreVm[]> {
    // API search đã trả đầy đủ; không cần xử lý thêm
    return rows;
  }

  trackById = (index: number, r: OreVm) => r?.id ?? index;
}
