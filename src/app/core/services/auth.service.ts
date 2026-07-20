import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../models/http-response.model';

export interface MeResp {
  isAuthenticated: boolean;
  name?: string;
}

export interface LoginResponse {
  // ID_TaiKhoan chỉ có khi đăng nhập qua luồng cũ (không có ở luồng IronTracking)
  ID_TaiKhoan?: number;
  TenTaiKhoan: string;
  HoVaTen: string;
  ChuKy?: string;
  PhongBan_API?: string | null;
  TenPhongBan?: string | null;
  TenNganPhongBan?: string | null;
  ID_PhongBan?: number | null;
  ID_PhanXuong?: number | null;
  Xuong_API?: string | null;
  ChucVu?: string | null;
  Email?: string | null;
  Token?: string;
  RefreshToken?: string;
  // Đánh dấu bản ghi user này được đăng nhập qua luồng nào
  AuthSource: 'iron' | 'legacy';
}

// Interface cho data từ API response (camelCase từ backend) - luồng cũ
interface LoginResponseData {
  iD_TaiKhoan: number;
  tenTaiKhoan: string;
  hoVaTen: string;
  chuKy: string;
  phongBan_API?: string | null;
  tenPhongBan?: string | null;
  tenNganPhongBan?: string | null;
  iD_PhongBan?: number | null;
  iD_PhanXuong?: number | null;
  xuong_API?: string | null;
}

// Response từ IronTracking gateway - luồng mới
interface IronLoginResponseData {
  success: boolean;
  error: string;
  token: string;
  refreshToken: string;
  maNV: string;
  hoTen: string;
  phongBan: string;
  maPhongBan: number | null;
  chucVu: string;
  email: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentRolesSubject = new BehaviorSubject<string[]>(['admin']); // default role
  currentRoles$ = this.currentRolesSubject.asObservable();

  private http = inject(HttpClient);

  loginUrl = environment.loginUrl;
  logoutUrl = environment.logoutUrl;

  me() {
    return this.http.get<MeResp>(`${environment.apiBaseUrl}/me`, { withCredentials: true })
      .pipe(
        map(r => ({ ok: !!r.isAuthenticated, name: r.name })),
        catchError(() => of({ ok: false, name: undefined }))
      );
  }

  gotoLogin() {
    const returnUrl = encodeURIComponent(location.href);
    window.location.href = `${this.loginUrl}?returnUrl=${returnUrl}`;
  }

  logoutMvc() {
    window.location.href = environment.logoutUrl + '?returnUrl=' + encodeURIComponent(location.origin);
  }

  getRoles(): string[] {
    return this.currentRolesSubject.value;
  }

  loginAs(role: 'user' | 'admin' | 'manager') {
    if (role === 'admin') this.currentRolesSubject.next(['admin']);
    else if (role === 'manager') this.currentRolesSubject.next(['manager']);
    else this.currentRolesSubject.next(['user']);
  }

  /**
   * Đăng nhập: ưu tiên luồng IronTracking (mới). Nếu luồng mới báo lỗi
   * (success:false hoặc lỗi HTTP/network) thì tự động fallback sang luồng cũ (/Authen/login).
   * Nếu luồng cũ cũng lỗi thì lỗi đó được ném ra cho component xử lý như bình thường.
   */
  login(username: string, password: string) {
    return this.loginIron(username, password).pipe(
      switchMap((ironUser) => ironUser ? of(ironUser) : this.loginLegacy(username, password))
    );
  }

  /** Luồng mới (IronTracking gateway). Trả về null nếu thất bại để login() fallback sang luồng cũ. */
  private loginIron(username: string, password: string) {
    return this.http.post<ApiResponse<IronLoginResponseData>>(environment.ironAuthUrl, {
      userName: username,
      password,
    }).pipe(
      map((response) => {
        const data = response.data;
        if (!data || !data.success) return null;

        const userData: LoginResponse = {
          TenTaiKhoan: data.maNV,
          HoVaTen: data.hoTen,
          PhongBan_API: data.phongBan,
          TenPhongBan: data.phongBan,
          ID_PhongBan: data.maPhongBan,
          ChucVu: data.chucVu,
          Email: data.email,
          Token: data.token,
          RefreshToken: data.refreshToken,
          AuthSource: 'iron',
        };

        this.persistUser(userData);
        return userData;
      }),
      catchError(() => of(null))
    );
  }

  /** Luồng cũ (backend nội bộ /Authen/login). */
  private loginLegacy(username: string, password: string) {
    const url = `${environment.apiBaseUrl}/Authen/login`;
    return this.http.post<ApiResponse<LoginResponseData>>(url, { username, password }).pipe(
      map((response: ApiResponse<LoginResponseData>) => {
        // Extract chỉ phần data từ response
        const data = response.data;
        if (!data) {
          throw new Error('Không có dữ liệu từ server');
        }

        // Map từ camelCase (API) sang PascalCase (interface)
        const userData: LoginResponse = {
          ID_TaiKhoan: data.iD_TaiKhoan,
          TenTaiKhoan: data.tenTaiKhoan,
          HoVaTen: data.hoVaTen,
          ChuKy: data.chuKy,
          PhongBan_API: data.phongBan_API,
          TenPhongBan: data.tenPhongBan,
          TenNganPhongBan: data.tenNganPhongBan,
          ID_PhongBan: data.iD_PhongBan,
          ID_PhanXuong: data.iD_PhanXuong,
          Xuong_API: data.xuong_API,
          AuthSource: 'legacy',
        };

        this.persistUser(userData);
        return userData;
      })
    );
  }

  private persistUser(userData: LoginResponse) {
    localStorage.setItem('phoitron_user', JSON.stringify(userData));
    this.currentRolesSubject.next(['admin']);
  }

  getCurrentUser(): LoginResponse | null {
    const raw = localStorage.getItem('phoitron_user');
    if (!raw) return null;
    try { return JSON.parse(raw) as LoginResponse; } catch { return null; }
  }

  getCurrentUserId(): number | undefined {
    return this.getCurrentUser()?.ID_TaiKhoan ?? undefined;
  }

  logout() {
    // Xóa thông tin user khỏi localStorage
    localStorage.removeItem('phoitron_user');
    // Reset roles
    this.currentRolesSubject.next([]);
    // Redirect về trang login
    window.location.href = '/login';
  }
}
