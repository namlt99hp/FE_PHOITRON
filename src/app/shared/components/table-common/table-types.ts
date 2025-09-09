export type SortDir = 'asc' | 'desc' | '';

export interface TableColumn<T = any> {
  /** property key (cho phép 'a.b.c') hoặc bất kỳ string */
  key: string;
  /** tiêu đề cột */
  header: string;
  /** có cho sort không */
  sortable?: boolean;
  /** format hiển thị; nếu không truyền sẽ lấy theo key */
  cell?: (row: T) => string | number | boolean | null | undefined;
  /** style phụ trợ */
  width?: string;
  align?: 'start' | 'center' | 'end';
  sticky?: 'start' | 'end';
}

export interface TableQuery {
  pageIndex: number;
  pageSize: number;
  sortBy?: string | null;
  sortDir?: SortDir;
  /** tuỳ chọn tìm kiếm/lọc nếu cần về sau */
  search?: string | null;
  filters?: Record<string, any>;
}

export interface TableResult<T = any> {
  data: T[];
  total: number;
}

export type DataFetcher<T = any> = (
  query: TableQuery
) => import('rxjs').Observable<TableResult<T>>;
