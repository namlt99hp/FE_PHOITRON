import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject,
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
import { MixOreService } from '../../../core/services/mix-quang.service';
import { ThanhPhanHoaHocService } from '../../../core/services/tphh.service';
import { TPHHTableModel } from '../../../core/models/tphh.model';
import { ApiResponse } from '../../../core/models/http-response.model';
import {
  TableQuery,
  TableResult,
} from '../../../shared/components/table-common/table-types';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';

export interface ChemVm {
  id: number;
  ma_TPHH: string;
  ten_TPHH: string;
  phanTram?: number;
}

@Component({
  selector: 'app-select-tphh-dialog',
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
    MatPaginatorModule
  ],
  templateUrl: './select-tphh-dialog.component.html',
  styleUrl: './select-tphh-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectTphhDialogComponent {
  private dlgRef = inject(MatDialogRef<SelectTphhDialogComponent>);
  private tphhService = inject(ThanhPhanHoaHocService);
  public dataFiltered: ChemVm[] = [];
  constructor(@Inject(MAT_DIALOG_DATA) public data: { preselectedIds?: number[] } | null) {}

  cols = ['sel', 'code', 'name'] as const;
  q = new FormControl<string>('', { nonNullable: true });

  searchPayload: TableQuery = {
    pageIndex: 0,
    pageSize: 10,
    search: ''
  }
   
  total = signal(0);
  loading = signal(false);

  private q$ = new BehaviorSubject<string>('');
  private page$ = new BehaviorSubject<{ index: number; size: number }>({ index: 0, size: this.searchPayload.pageSize });

  // cache để trả lại object đầy đủ khi confirm (kể cả đã chọn ở trang khác)
  private cache = new Map<number, ChemVm>();
  selectedIds = new Set<number>();

  rows$: Observable<ChemVm[]> = combineLatest([
    this.q$.pipe(debounceTime(300), distinctUntilChanged(), startWith('')),
    this.page$
  ]).pipe(
    tap(() => this.loading.set(true)),
    switchMap(([q, { index, size }]) => {
      this.searchPayload = {
        pageIndex: index,
        pageSize: size,
        search: q
      }
      return this.tphhService.search(this.searchPayload).pipe(
        tap((res: TableResult<TPHHTableModel>) => {
          this.total.set(res.total);
        }),
        map((res: TableResult<TPHHTableModel>) => {
          return res.data.map(item => ({
            id: item.id,
            ma_TPHH: item.ma_TPHH,
            ten_TPHH: item.ten_TPHH || '',
            phanTram: 0 // Default value for new selections
          }));
        }),
        catchError(() => of([] as ChemVm[])),
      )
    }),
    tap(list => { list.forEach((x: ChemVm) => this.cache.set(x.id, x)); }),
    tap(() => this.loading.set(false))
  );

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    // preselect ids nếu có
    if (this.data?.preselectedIds?.length) {
      this.selectedIds = new Set(this.data.preselectedIds);
    }
    // input search -> push stream
    this.q.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ).subscribe(v => {
      this.searchPayload.pageIndex = 0;                    // reset trang khi search
      this.q$.next(v ?? '');
      this.page$.next({ index: 0, size: this.searchPayload.pageSize });
    });

    // initial trigger
    this.q$.next('');
  }

  onPage(e: PageEvent) {
    this.searchPayload.pageIndex = e.pageIndex;
    this.searchPayload.pageSize  = e.pageSize;
    this.page$.next({ index: this.searchPayload.pageIndex, size: this.searchPayload.pageSize });
  }

  toggle(row: ChemVm) {
    if (this.selectedIds.has(row.id)) this.selectedIds.delete(row.id);
    else this.selectedIds.add(row.id);
  }

  close() { this.dlgRef.close(); }

  confirm() {
    const ids = Array.from(this.selectedIds);
    // build kết quả từ cache; nếu thiếu (chưa từng nhìn thấy trên UI), gọi API by-ids để bù
    const missing = ids.filter(id => !this.cache.has(id));
    if (missing.length === 0) {
      const out = ids.map(id => this.cache.get(id)!);
      this.dlgRef.close(out);
      return;
    }

    // Fetch missing items by calling getById for each missing ID
    const missingRequests = missing.map(id => this.tphhService.getById(id));
    
    // Use combineLatest to wait for all requests to complete
    combineLatest(missingRequests).subscribe((results: TPHHTableModel[]) => {
      results.forEach((item: TPHHTableModel) => {
        const chemVm: ChemVm = {
          id: item.id,
          ma_TPHH: item.ma_TPHH,
          ten_TPHH: item.ten_TPHH || '',
          phanTram: 0
        };
        this.cache.set(item.id, chemVm);
      });
      
      const out = ids.map(id => this.cache.get(id)!).filter(Boolean);
      this.dlgRef.close(out);
    });
  }

  isChecked(id: number) { return this.selectedIds.has(id); }
  trackById = (index: number, r: ChemVm) => r?.id ?? index;
}
