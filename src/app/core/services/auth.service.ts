import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

export interface MeResp {
  isAuthenticated: boolean;
  name?: string;
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


}
