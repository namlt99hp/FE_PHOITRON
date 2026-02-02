import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../models/http-response.model';

export interface MeResp {
  isAuthenticated: boolean;
  name?: string;
}

export interface LoginResponse {
  ID_TaiKhoan: number;
  TenTaiKhoan: string;
  HoVaTen: string;
  ChuKy: string;
  PhongBan_API?: string | null;
  TenPhongBan?: string | null;
  TenNganPhongBan?: string | null;
  ID_PhongBan?: number | null;
  ID_PhanXuong?: number | null;
  Xuong_API?: string | null;
}

// Interface cho data từ API response (camelCase từ backend)
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

  login(username: string, password: string) {
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
        };
        
        // Lưu chỉ phần data vào localStorage
        localStorage.setItem('phoitron_user', JSON.stringify(userData));
        this.currentRolesSubject.next(['admin']);
        
        return userData;
      })
    );
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
