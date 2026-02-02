import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ComparePlansRequest, ComparePlansResult, ComputePlanRequest, ComputePlanResult, PlanValidationResult, ValidatePlanRequest } from '../models/planning.model';

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private http = inject(HttpClient);
  private baseApi = `${environment.apiBaseUrl}/Planning`;

  // validate(req: ValidatePlanRequest): Observable<PlanValidationResult> {
  //   const api = `${this.baseApi}/Validate`;
  //   return this.http.post<PlanValidationResult>(api, req);
  //   }

  // compute(req: ComputePlanRequest): Observable<ComputePlanResult> {
  //   const api = `${this.baseApi}/Compute`;
  //   return this.http.post<ComputePlanResult>(api, req);
  // }

  // compare(req: ComparePlansRequest): Observable<ComparePlansResult> {
  //   const api = `${this.baseApi}/Compare`;
  //   return this.http.post<ComparePlansResult>(api, req);
  // }
}


