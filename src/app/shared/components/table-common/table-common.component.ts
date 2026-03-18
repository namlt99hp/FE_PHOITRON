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
import { catchError, debounceTime, EMPTY, finalize, merge, of, startWith, switchMap, tap, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  DataFetcher,
  SearchFieldConfig,
  SortDir,
  TableColumn,
  TableQuery,
  TableResult,
} from './table-types';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
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

  /** cấu hình các field multi-search (input / select) */
  @Input() searchFields: SearchFieldConfig[] = [];

  readonly searchCtrl = new FormControl<string>('', { nonNullable: true });

  /** FormGroup chứa các control cho searchFields (input/select/date) */
  readonly searchForm = new FormGroup<Record<string, FormControl>>({});

  /** Map FormGroup riêng cho từng rangeDate field: key → FormGroup{start, end} */
  readonly rangeDateGroups = new Map<string, FormGroup>();

  /** FormControl text-input cho từng autocomplete field */
  readonly autocompleteControls = new Map<string, FormControl>();
  /** Options hiển thị trong dropdown — dùng signal để hoạt động với OnPush */
  readonly autocompleteOptionsMap = signal<Record<string, any[]>>({});
  /** Giá trị đã chọn (sau valueWith) để đưa vào filters */
  private readonly autocompleteSelectedValues = new Map<string, any>();

  /** bật/tắt cột actions */
  @Input() enableActions = true;

  /** bật/tắt từng action */
  @Input() showViewAction = true;
  @Input() showEditAction = true;
  @Input() showDeleteAction = true;
  @Input() showCloneAction = false;

  /** Custom text cho các actions */
  @Input() viewActionText = 'View';
  @Input() editActionText = 'Edit';
  @Input() deleteActionText = 'Delete';
  @Input() cloneActionText = 'Sao chép';

  /** Nếu truyền deleteHandler thì component sẽ tự confirm và gọi xoá. Nếu không, sẽ emit sự kiện delete */
  @Input() deleteHandler?: (row: T) => import('rxjs').Observable<void>;
  @Input() confirmDelete?: (row: T) => import('rxjs').Observable<boolean>;

  // ===== Outputs =====
  @Output() create = new EventEmitter<boolean>(false);
  @Output() view = new EventEmitter<T>();
  @Output() selectEdit = new EventEmitter<T>();
  @Output() delete = new EventEmitter<T>();
  @Output() clone = new EventEmitter<T>();
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
    // Build dynamic controls cho searchFields
    this.searchFields.forEach((field) => {
      if (field.type === 'rangeDate') {
        this.rangeDateGroups.set(
          field.key,
          new FormGroup({
            start: new FormControl<Date | null>(null),
            end: new FormControl<Date | null>(null),
          })
        );
      } else if (field.type === 'autocomplete') {
        const ctrl = new FormControl<any>(null);
        this.autocompleteControls.set(field.key, ctrl);

        ctrl.valueChanges
          .pipe(
            startWith(''),
            debounceTime(300),
            switchMap((val) => {
              const term = typeof val === 'string' ? val.trim() : '';
              return field.dataSource ? field.dataSource(term) : of([]);
            }),
            takeUntilDestroyed(this.destroyRef)
          )
          .subscribe((results) => {
            this.autocompleteOptionsMap.update((m) => ({ ...m, [field.key]: results }));
          });
      } else {
        this.searchForm.addControl(
          field.key,
          new FormControl(field.defaultValue ?? null)
        );
      }
    });

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
        // Interceptor will normalize API response. Still, map to TableResult here.
        return this.http.get<any>(this.apiUrl!, { params }).pipe(map((body: any) => this.normalizeToTableResult(body)));
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

  resetSearch(): void {
    this.searchCtrl.setValue('');
    this.searchFields.forEach((f) => {
      if (f.type === 'rangeDate') {
        this.rangeDateGroups.get(f.key)?.reset();
      } else if (f.type === 'autocomplete') {
        this.autocompleteControls.get(f.key)?.setValue(null);
        this.autocompleteSelectedValues.delete(f.key);
      } else {
        this.searchForm.get(f.key)?.setValue(f.defaultValue ?? null);
      }
    });
    if (this.paginator) this.paginator.pageIndex = 0;
    this.loadData();
  }

  getSearchControl(key: string): FormControl {
    return this.searchForm.get(key) as FormControl;
  }

  getRangeDateGroup(key: string): FormGroup {
    return this.rangeDateGroups.get(key)!;
  }

  getAutocompleteControl(key: string): FormControl {
    return this.autocompleteControls.get(key)!;
  }

  getAutocompleteOptions(key: string): any[] {
    return this.autocompleteOptionsMap()[key] ?? [];
  }

  displayAutocomplete(field: SearchFieldConfig): (item: any) => string {
    return (item: any) => {
      if (!item) return '';
      if (field.displayWith) return field.displayWith(item);
      return item?.label ?? item?.name ?? String(item);
    };
  }

  onAutocompleteSelected(field: SearchFieldConfig, item: any): void {
    const value = field.valueWith ? field.valueWith(item) : (item?.id ?? item);
    this.autocompleteSelectedValues.set(field.key, value);
    this.triggerSearch();
  }

  onAutocompleteClear(key: string): void {
    this.autocompleteControls.get(key)?.setValue(null);
    this.autocompleteSelectedValues.delete(key);
    this.triggerSearch();
  }

  // ===== Internals =====
  private loadData() {
    if (!this.fetcher) {
      this.errorMsg.set('Fetcher/API chưa được cấu hình.');
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set(null);

    // Gom giá trị searchForm (bỏ null/undefined/'')
    const extraFilters: Record<string, any> = {};
    this.searchFields.forEach((field) => {
      if (field.type === 'rangeDate') {
        const group = this.rangeDateGroups.get(field.key);
        const startVal: Date | null = group?.get('start')?.value ?? null;
        const endVal: Date | null = group?.get('end')?.value ?? null;
        const startKey = field.startKey ?? `${field.key}Start`;
        const endKey = field.endKey ?? `${field.key}End`;
        if (startVal) extraFilters[startKey] = this.toIsoDate(startVal);
        if (endVal) extraFilters[endKey] = this.toIsoDate(endVal);
      } else if (field.type === 'autocomplete') {
        const val = this.autocompleteSelectedValues.get(field.key);
        if (val !== null && val !== undefined) {
          extraFilters[field.key] = val;
        }
      } else {
        const val = this.searchForm.get(field.key)?.value;
        if (val !== null && val !== undefined && val !== '') {
          extraFilters[field.key] = val;
        }
      }
    });

    const q: TableQuery = {
      pageIndex: this.paginator?.pageIndex ? this.paginator?.pageIndex : 0,
      pageSize: this.paginator?.pageSize ?? this.defaultPageSize,
      sortBy: this.sort?.active ?? null,
      sortDir: (this.sort?.direction as SortDir) ?? '',
      search: (() => {
        const txt = (this.searchCtrl?.value ?? this.search ?? '').trim();
        return txt ? txt : null;
      })(),
      filters: Object.keys(extraFilters).length ? extraFilters : undefined,
    };

    this.fetcher(q)
      .pipe(
        map((res: any) => this.normalizeToTableResult(res)),
        catchError((err) => {
          this.errorMsg.set('Không tải được dữ liệu.');
          return of({ data: [], total: 0 } as TableResult<T>);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res: TableResult<T>) => {
        this.data.set(res?.data ?? []);
        this.total.set(res?.total ?? 0);
        this.loaded.emit(res as TableResult<T>);
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

  private normalizeToTableResult(input: any): TableResult<T> {
    // If already TableResult
    if (input && Array.isArray(input.data) && typeof input.total === 'number' && input.statusCode === undefined) {
      return input as TableResult<T>;
    }
    // If ApiResponse wrapping PagedResult
    if (input && typeof input.success === 'boolean' && input.data) {
      const paged = input.data;
      if (paged && Array.isArray(paged.data) && typeof paged.total === 'number') {
        return { data: paged.data, total: paged.total } as TableResult<T>;
      }
    }
    // Fallback: no data
    return { data: [], total: 0 } as TableResult<T>;
  }

  private toIsoDate(d: Date): string {
    // Format: YYYY-MM-DD
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

  onClone(row: T) {
    this.clone.emit(row);
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
