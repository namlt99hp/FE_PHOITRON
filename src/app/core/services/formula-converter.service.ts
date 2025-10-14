import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { LoCaoProcessParamService } from './locao-process-param.service';
import { LoCaoProcessParamModel } from '../models/locao-process-param.model';
import { QuangService } from './quang.service';
import { QuangSelectItemModel } from '../models/quang.model';

@Injectable({
  providedIn: 'root'
})
export class FormulaConverterService {
  private processParamService = inject(LoCaoProcessParamService);
  private quangService = inject(QuangService);
  
  // Cache để tránh load nhiều lần
  private paramsCache: LoCaoProcessParamModel[] | null = null;
  private quangCache: QuangSelectItemModel[] | null = null;

  /**
   * Convert formula từ ID sang TÊN để hiển thị cho user
   * VD: "ID_1/ID_2" -> "Mẻ liệu/Phụ Tải"
   */
  convertIdToName(formula: string | null | undefined): Observable<string> {
    if (!formula) return of('-');
    
    return this.getProcessParams().pipe(
      map(params => {
        return formula.replace(/ID_(\d+)/g, (match, idStr) => {
          const id = parseInt(idStr);
          const param = params.find(p => p.id === id);
          return param ? param.ten : match;
        });
      })
    );
  }

  /**
   * Convert TÊN sang ID để lưu vào database
   * VD: "Mẻ liệu/Phụ Tải" -> "ID_1/ID_2"
   */
  convertNameToId(nameFormula: string, availableParams: LoCaoProcessParamModel[]): string {
    let idFormula = nameFormula;
    availableParams.forEach(param => {
      // Thay thế tất cả occurrence của param.ten bằng ID_id tương ứng
      const regex = new RegExp(param.ten.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      idFormula = idFormula.replace(regex, `ID_${param.id}`);
    });
    return idFormula;
  }

  /**
   * Validate formula có hợp lệ không
  */
  validateFormula(formula: string): boolean {
    if (!formula.trim()) return false;
    
    // Check balance brackets
    const bracketCount = (formula.match(/\(/g) || []).length;
    const closeBracketCount = (formula.match(/\)/g) || []).length;
    if (bracketCount !== closeBracketCount) return false;
    
    // Check có ít nhất 1 ID param
    const hasParam = /ID_\d+/.test(formula);
    if (!hasParam) return false;
    
    return true;
  }

  /**
   * Parse formula để lấy danh sách param IDs
   */
  parseFormulaParams(formula: string): number[] {
    const matches = formula.match(/ID_(\d+)/g);
    if (!matches) return [];
    
    return matches.map(match => {
      const id = match.replace('ID_', '');
      return parseInt(id);
    });
  }

  /**
   * Lấy thông tin ore map từ param có ID_Quang_LienKet
   */
  getOreMappings(): Observable<Map<number, QuangSelectItemModel>> {
    return this.getProcessParams().pipe(
      switchMap(params => {
        const mappedParams = params.filter(p => p.id_Quang_LienKet);
        
        if (mappedParams.length === 0) {
          return of(new Map<number, QuangSelectItemModel>());
        }
        
        const oreIds = mappedParams.map(p => p.id_Quang_LienKet!);
        
        return this.quangService.getByIds(oreIds).pipe(
          map(ores => {
            const mapping = new Map<number, QuangSelectItemModel>();
            mappedParams.forEach(param => {
              const ore = ores.find(o => o.id === param.id_Quang_LienKet);
              if (ore) {
                mapping.set(param.id, ore);
              }
            });
            return mapping;
          })
        );
      })
    );
  }

  /**
   * Tính toán giá trị từ formula với các giá trị input
   * VD: formula="ID_1/ID_2", inputs={1: 100, 2: 50} -> result=2
   */
  calculateFormula(formula: string, inputs: Map<number, number>): number {
    try {
      // Replace ID_x với giá trị thực
      let expression = formula;
      inputs.forEach((value, id) => {
        const regex = new RegExp(`ID_${id}`, 'g');
        expression = expression.replace(regex, value.toString());
      });
      
      // Validate chỉ chứa số và operators hợp lệ
      const validChars = /^[0-9+\-*/\s().]+$/;
      if (!validChars.test(expression)) {
        throw new Error('Invalid characters in formula');
      }
      
      // Tính toán kết quả
      const result = Function('"use strict"; return (' + expression + ')')();
      return Number(result);
    } catch (error) {
      console.error('Error calculating formula:', error);
      return 0;
    }
  }

  /**
   * Cache và get process params
   */
  private getProcessParams(): Observable<LoCaoProcessParamModel[]> {
    if (this.paramsCache) {
      return of(this.paramsCache);
    }
    
    return this.processParamService.searchPaged({ pageIndex: 0, pageSize: 1000 }).pipe(
      map(result => {
        this.paramsCache = result.data;
        return this.paramsCache;
      })
    );
  }

  /**
   * Cache và get quang data
   */
  private getQuangData(): Observable<QuangSelectItemModel[]> {
    if (this.quangCache) {
      return of(this.quangCache);
    }
    
    // Simplified approach - không cần cache quang data phức tạp
    return of([]);
  }

  /**
   * Clear cache khi có thay đổi data
   */
  clearCache(): void {
    this.paramsCache = null;
    this.quangCache = null;
  }
}

