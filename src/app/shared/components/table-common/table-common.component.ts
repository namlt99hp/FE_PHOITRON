import {
  AsyncPipe,
  CommonModule,
  NgClass,
  NgTemplateOutlet,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  signal,
  computed,
  inject,
  AfterViewInit,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import {
  catchError,
  debounceTime,
  EMPTY,
  finalize,
  merge,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  DataFetcher,
  SortDir,
  TableColumn,
  TableQuery,
  TableResult,
} from './table-types';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';

export interface productsData {
  id: number;
  imagePath: string;
  uname: string;
  budget: number;
  priority: string;
}

@Component({
  selector: 'app-table-common',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatCardModule,
    MatMenuModule,
  ],
  templateUrl: './table-common.component.html',
  styleUrl: './table-common.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCommonComponent<T = any> implements OnInit, AfterViewInit {
  private http = inject(HttpClient);

  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  // ===== Inputs =====
  /** Mảng cột động */
  @Input({ required: true }) columns: TableColumn<T>[] = [];

  /** Data fetcher: (query) => Observable<TableResult<T>>; nếu không truyền mà có apiUrl thì component tự tạo fetcher mặc định */
  @Input() fetcher?: DataFetcher<T>;

  /** API url mặc định; sử dụng khi không truyền fetcher */
  @Input() apiUrl?: string;

  /** map tên query params khi gọi API mặc định */
  @Input() queryParamNames: {
    page: string;
    size: string;
    sortBy: string;
    sortDir: string;
  } = {
    page: 'page',
    size: 'size',
    sortBy: 'sortBy',
    sortDir: 'sortDir',
  };

  @Input() showCreateAction = true;
  @Input() tableTitle: string = '';
  /** page size options */
  @Input() pageSizeOptions: number[] = [10, 25, 50];

  /** page size mặc định */
  @Input() defaultPageSize = 10;

  /** bật/tắt search nội bộ */
  @Input() enableSearch = true;
  /** placeholder cho ô search */
  @Input() searchPlaceholder = 'Tìm kiếm';
  /** debounce thời gian nhập (ms) */
  @Input() searchDebounceMs = 300;

  /** search từ parent (optional). Nếu có, sẽ làm giá trị khởi tạo */
  @Input() search: string | null = null;

  readonly searchCtrl = new FormControl<string>('', { nonNullable: true });

  /** bật/tắt cột actions */
  @Input() enableActions = true;

  /** bật/tắt từng action */
  @Input() showViewAction = true;
  @Input() showEditAction = true;
  @Input() showDeleteAction = true;

  /** Nếu truyền deleteHandler thì component sẽ tự confirm và gọi xoá. Nếu không, sẽ emit sự kiện delete */
  @Input() deleteHandler?: (row: T) => import('rxjs').Observable<void>;
  @Input() confirmDelete?: (row: T) => import('rxjs').Observable<boolean>;

  // ===== Outputs =====
  @Output() create = new EventEmitter<boolean>(false);
  @Output() view = new EventEmitter<T>();
  @Output() selectEdit = new EventEmitter<T>();
  @Output() delete = new EventEmitter<T>();
  @Output() loaded = new EventEmitter<TableResult<T>>();

  // ===== ViewChild =====
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // ===== Signals state =====
  readonly data = signal<T[]>([]);
  readonly total = signal(0);
  readonly isLoading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly displayedColumns = computed(() => [
    '__stt',
    ...this.columns.filter((c) => c.key !== 'id').map((c) => c.key),
    ...(this.enableActions ? ['__actions'] : []),
  ]);

  ngOnInit(): void {
    if (!this.fetcher && this.apiUrl) {
      this.fetcher = (q: TableQuery) => {
        let params = new HttpParams()
          .set(this.queryParamNames.page, q.pageIndex)
          .set(this.queryParamNames.size, q.pageSize);
        if (q.sortBy)
          params = params.set(this.queryParamNames.sortBy, q.sortBy);
        if (q.sortDir)
          params = params.set(this.queryParamNames.sortDir, q.sortDir);
        if (q.search) params = params.set('search', q.search);
        if (q.filters) {
          Object.entries(q.filters).forEach(([k, v]) => {
            if (v !== undefined && v !== null)
              params = params.set(k, String(v));
          });
        }
        return this.http.get<TableResult<T>>(this.apiUrl!, { params });
      };
    }
  }

  ngAfterViewInit(): void {
    // Khi sort thay đổi -> reset về page đầu
    this.sort?.sortChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
      });

    // Gộp stream của sort, page để gọi API
    merge(this.sort?.sortChange ?? of(null), this.paginator?.page ?? of(null))
      .pipe(
        startWith(null),
        // chống spam
        debounceTime(0),
        tap(() => this.loadData()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  // ===== Public API =====
  /** Cho trang cha gọi refresh() khi cần */
  refresh(): void {
    if (this.paginator) this.paginator.pageIndex = this.paginator.pageIndex; // noop để kích hoạt stream
    this.loadData();
  }

  triggerSearch(): void {
    if (this.paginator) this.paginator.pageIndex = 0;
    this.loadData();
  }
  // ===== Internals =====
  private loadData() {
    if (!this.fetcher) {
      this.errorMsg.set('Fetcher/API chưa được cấu hình.');
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set(null);

    const q: TableQuery = {
      pageIndex: this.paginator?.pageIndex ? this.paginator?.pageIndex : 0,
      pageSize: this.paginator?.pageSize ?? this.defaultPageSize,
      sortBy: this.sort?.active ?? null,
      sortDir: (this.sort?.direction as SortDir) ?? '',
      search: (() => {
        const txt = (this.searchCtrl?.value ?? this.search ?? '').trim();
        return txt ? txt : null;
      })(),
    };

    this.fetcher(q)
      .pipe(
        catchError((err) => {
          this.errorMsg.set('Không tải được dữ liệu.');
          return of({ data: [], total: 0 } as TableResult<T>);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.data.set(res.data ?? []);
        this.total.set(res.total ?? 0);
        this.loaded.emit(res);
        this.isLoading.set(false);
      });
  }

  getCell(
    row: T,
    col: TableColumn<T>
  ): string | number | boolean | null | undefined {
    if (col.cell) return col.cell(row);
    return this.readByPath(row as any, col.key);
  }

  private readByPath(obj: any, path: string) {
    return path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);
  }

  // ===== Actions =====
  onCreate() {
    this.create.emit();
  }

  onView(row: T) {
    this.view.emit(row);
  }

  onEdit(row: T) {
    this.selectEdit.emit(row);
  }

  onDelete(row: T) {
    if (!this.deleteHandler) {
      // nếu không truyền handler, phát sự kiện ra ngoài
      this.delete.emit(row);
      return;
    }

    const confirm$ = this.confirmDelete ? this.confirmDelete(row) : of(true);

    confirm$
      .pipe(
        switchMap((ok) => {
          if (!ok) return EMPTY; // user bấm Huỷ → dừng
          this.isLoading.set(true); // chỉ bật loading khi đã xác nhận
          return this.deleteHandler!(row).pipe(
            catchError((err) => {
              alert('Xoá thất bại');
              return of(void 0);
            }),
            finalize(() => this.isLoading.set(false))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.refresh());
  }

  // 2) tính STT theo trang (0-based pageIndex)
  calcStt(i: number): number {
    const pageIndex = this.paginator?.pageIndex ?? 0;
    const pageSize = this.paginator?.pageSize ?? this.defaultPageSize;
    return pageIndex * pageSize + i + 1;
  }
}
