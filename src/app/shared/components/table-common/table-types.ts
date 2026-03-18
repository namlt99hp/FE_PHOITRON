export type SortDir = 'asc' | 'desc' | '';

// ===== Multi-search config =====
export interface SearchFieldOption {
  label: string;
  value: any;
}

export type SearchFieldType = 'input' | 'select' | 'date' | 'rangeDate' | 'autocomplete';

export interface SearchFieldConfig {
  /** key dùng làm định danh field */
  key: string;
  /** label hiển thị */
  label: string;
  /** loại field: 'input' | 'select' | 'date' | 'rangeDate' */
  type: SearchFieldType;
  /** options dành cho type = 'select' */
  options?: SearchFieldOption[];
  /** giá trị mặc định */
  defaultValue?: any;
  /** width của field, vd '180px' */
  width?: string;
  /**
   * Chỉ dùng cho type = 'rangeDate'.
   * Tên key đưa vào filters cho ngày bắt đầu (mặc định: `${key}Start`)
   */
  startKey?: string;
  /**
   * Chỉ dùng cho type = 'rangeDate'.
   * Tên key đưa vào filters cho ngày kết thúc (mặc định: `${key}End`)
   */
  endKey?: string;

  // ===== autocomplete =====
  /**
   * Chỉ dùng cho type = 'autocomplete'.
   * Hàm nhận search term, trả về Observable<any[]> danh sách gợi ý.
   */
  dataSource?: (searchTerm: string) => import('rxjs').Observable<any[]>;
  /** Hàm trả về text hiển thị trong input sau khi chọn (mặc định: item?.label ?? String(item)) */
  displayWith?: (item: any) => string;
  /** Hàm trả về value đưa vào filters (mặc định: item?.id ?? item) */
  valueWith?: (item: any) => any;
}

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
