import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ThongKeFunctionModel, ThongKeFunctionUpsertModel, PlanResultModel, PlanResultsUpsertModel } from '../models/thongke-function.model';
import { ThongKeFunctionResponse, ThongKeResultResponse } from '../models/thongke-response.model';

@Injectable({
  providedIn: 'root'
})
export class ThongKeFunctionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/Thongke`;

  searchFunctions(page: number = 1, pageSize: number = 20, search?: string, sortBy?: string, sortDir?: string): Observable<any> {
    const params: any = { page, pageSize };
    if (search) params.search = search;
    if (sortBy) params.sortBy = sortBy;
    if (sortDir) params.sortDir = sortDir;
    
    return this.http.get<any>(`${this.apiUrl}/Search`, { params });
  }

  getAllFunctions(): Observable<ThongKeFunctionResponse[]> {
    return this.http.get<any>(`${this.apiUrl}/GetAll`).pipe(
      map(response => response.data)
    );
  }

  getFunctionById(id: number): Observable<ThongKeFunctionResponse> {
    return this.http.get<any>(`${this.apiUrl}/GetById/${id}`).pipe(
      map(response => response.data)
    );
  }

  // createFunction(model: ThongKeFunctionUpsertModel): Observable<ThongKeFunctionModel> {
  //   return this.http.post<any>(`${this.apiUrl}/Upsert`, { 
  //     ...model, 
  //     ID: null,
  //     IsAutoCalculated: model.isAutoCalculated ?? true
  //   }).pipe(
  //     map(response => response.data)
  //   );
  // }

  // updateFunction(id: number, model: ThongKeFunctionUpsertModel): Observable<ThongKeFunctionModel> {
  //   return this.http.post<any>(`${this.apiUrl}/Upsert`, { 
  //     ...model, 
  //     ID: id,
  //     IsAutoCalculated: model.isAutoCalculated ?? true
  //   }).pipe(
  //     map(response => response.data)
  //   );
  // }

  deleteFunction(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/Delete/${id}`);
  }

  // Plan Results Management
  getResultsByPlanId(planId: number): Observable<ThongKeResultResponse[]> {
    return this.http.get<any>(`${this.apiUrl}/GetResultsByPlanId/${planId}`).pipe(
      map(response => response.data)
    );
  }

  upsertResultsForPlan(model: PlanResultsUpsertModel): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/UpsertResults`, model);
  }

  // Upsert function with ID support
  upsertFunction(id: number | null, model: ThongKeFunctionUpsertModel): Observable<ThongKeFunctionModel> {
    return this.http.post<any>(`${this.apiUrl}/Upsert`, { 
      ...model, 
      ID: id,
      IsAutoCalculated: model.isAutoCalculated ?? true
    }).pipe(
      map(response => response.data)
    );
  }
}
