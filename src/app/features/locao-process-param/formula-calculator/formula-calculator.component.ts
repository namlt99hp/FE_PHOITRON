import { Component, inject, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable, startWith, switchMap, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormulaCalculatorData, FormulaParam, FormulaCalculatorResult, FormulaCalculatorContext, GangComposition, ArrayData } from '../../../core/models/formula-calculator.model';

@Component({
  selector: 'app-formula-calculator',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatAutocompleteModule,
    MatRadioModule,
    MatCheckboxModule,
  ],
  templateUrl: './formula-calculator.component.html',
  styleUrls: ['./formula-calculator.component.scss']
})
export class FormulaCalculatorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<FormulaCalculatorComponent>);

  // Hiển thị cho user bằng TÊN
  currentDisplayFormula = '';
  // Lưu trữ bằng ID để tránh conflict khi đổi tên
  private currentIdFormula = '';
  availableParams: FormulaParam[] = [];
  
  // Search functionality
  searchControl = new FormControl('');
  filteredParams$: Observable<FormulaParam[]> = new Observable();
  
  // New properties for Gang/Xỉ context (optional)
  context: FormulaCalculatorContext = FormulaCalculatorContext.ProcessParam;
  calculationMode: 'formula' | 'manual' = 'formula';
  
  constructor(@Inject(MAT_DIALOG_DATA) public dialogData: FormulaCalculatorData) {}

  ngOnInit(): void {
    // Initialize context (backward compatible)
    this.context = this.dialogData.context || FormulaCalculatorContext.ProcessParam;
    
    // Auto-set calculation mode to 'formula' for Ore context
    if (this.isOreContext) {
      this.calculationMode = 'formula'; // Always default to formula mode
    }
    
    this.loadAvailableParams();
    this.setupSearch();
    // Sau khi load xong sẽ convert formula
    setTimeout(() => {
      this.convertCurrentFormula();
    }, 100);
  }

  private convertCurrentFormula(): void {
    if (this.dialogData?.currentIdFormula) {
      this.currentIdFormula = this.dialogData.currentIdFormula;
      this.currentDisplayFormula = this.convertIdToName(this.currentIdFormula);
    }
  }

  private convertIdToName(idFormula: string): string {
    // Convert "ID_1/ID_2" thành "melieu/phutai" (hiển thị mã thay vì tên)
    return idFormula.replace(/ID_(\d+)/g, (match, idStr) => {
      const id = parseInt(idStr);
      const param = this.availableParams.find(p => p.id === id);
      return param ? param.code : `ID_${id}`;
    });
  }

  private loadAvailableParams(): void {
    // Sử dụng params từ dialogData hoặc mảng rỗng
    this.availableParams = this.dialogData?.availableParams || [];
  }

  // Context helper methods (backward compatible)
  get isOreContext(): boolean {
    return this.context === FormulaCalculatorContext.OreChemistry;
  }

  get isProcessParamContext(): boolean {
    return this.context === FormulaCalculatorContext.ProcessParam;
  }

  private setupSearch(): void {
    if (this.dialogData?.searchApi) {
      this.filteredParams$ = this.searchControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(value => {
          const searchTerm = typeof value === 'string' ? value : '';
          if (!searchTerm.trim()) {
            return new Promise<FormulaParam[]>(resolve => resolve([]));
          }
          return this.dialogData.searchApi!(searchTerm);
        })
      );
    } else {
      // Fallback to local filtering if no search API provided
      this.filteredParams$ = this.searchControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(value => {
          const searchTerm = typeof value === 'string' ? value : '';
          if (!searchTerm.trim()) {
            return new Promise<FormulaParam[]>(resolve => resolve([]));
          }
          return new Promise<FormulaParam[]>(resolve => {
            const filtered = this.availableParams.filter(param => 
              param.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
              param.ten.toLowerCase().includes(searchTerm.toLowerCase())
            );
            resolve(filtered);
          });
        })
      );
    }
  }

  displayFn = (param: FormulaParam | null): string => {
    return param ? `${param.code} - ${param.ten}` : '';
  }

  addSumFunction(): void {
    // Add SUM with opening parenthesis only
    this.currentDisplayFormula += 'SUM(';
    this.currentIdFormula += 'SUM(';
  }

  addSemicolon(): void {
    // Add semicolon separator for SUM function
    this.currentDisplayFormula += ';';
    this.currentIdFormula += ';';
  }

  addParam(paramId: number, paramCode: string): void {
    const param = this.availableParams.find(p => p.id === paramId);
    const paramCodeDisplay = param ? param.code : paramCode;
    
    // Hiển thị MÃ cho user (trực quan hơn)
    this.currentDisplayFormula += paramCodeDisplay;
    // Lưu ID để tránh conflict
    this.currentIdFormula += `ID_${paramId}`;
    
    // Clear search input after selection
    this.searchControl.setValue('');
  }

  addOperator(operator: string): void {
    this.currentDisplayFormula += operator;
    this.currentIdFormula += operator;
  }

  addNumber(number: string): void {
    this.currentDisplayFormula += number;
    this.currentIdFormula += number;
  }

  addDecimal(): void {
    this.currentDisplayFormula += '.';
    this.currentIdFormula += '.';
  }

  addFraction(): void {
    // Thêm dấu / để tạo phân số
    this.currentDisplayFormula += '/';
    this.currentIdFormula += '/';
  }

  clearFormula(): void {
    this.currentDisplayFormula = '';
    this.currentIdFormula = '';
  }

  removeLastChar(): void {
    this.currentDisplayFormula = this.currentDisplayFormula.slice(0, -1);
    this.currentIdFormula = this.currentIdFormula.slice(0, -1);
  }

  validateAndConfirm(): void {
    if (!this.currentDisplayFormula.trim()) {
      // Show error message for empty formula
      alert('Vui lòng nhập công thức');
      return;
    }
    
    // Validate cơ bản
    const isValid = this.validateFormula(this.currentIdFormula);
    if (isValid) {
      // Trả về kết quả chuẩn
      const result: FormulaCalculatorResult = {
        idFormula: this.currentIdFormula,
        displayFormula: this.currentDisplayFormula
      };

      // Add Ore specific fields
      if (this.isOreContext) {
        result.isCalculated = this.calculationMode === 'formula';
        result.dataSources = this.detectDataSources();
      }

      this.dialogRef.close(result);
    } else {
      // Show error message for invalid formula
      alert('Công thức không hợp lệ. Vui lòng kiểm tra lại.');
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  // Ore (Gang/Xỉ) specific methods
  onIsCalculatedChange(event: any): void {
    // Update calculation mode based on checkbox
    this.calculationMode = event.checked ? 'formula' : 'manual';
    
    // When switching to manual, clear formula
    if (this.calculationMode === 'manual') {
      this.currentDisplayFormula = '';
      this.currentIdFormula = '';
    }
  }

  addGangComponentReference(item: GangComposition): void {
    // Add Gang component reference (always mass/percentage from Gang)
    // Hiển thị bằng tên element cho user
    this.currentDisplayFormula += `G:${item.element}`;
    // Lưu ID để tránh conflict
    this.currentIdFormula += `G:ID_${item.tphhId}`;
  }

  addArrayReference(item: FormulaParam): void {
    // For Ore context: use A: prefix (external data)
    if (this.isOreContext) {
      // Hiển thị bằng mã cho user
      this.currentDisplayFormula += `A:${item.code}`;
      // Lưu ID để tránh conflict
      this.currentIdFormula += `A:ID_${item.id}`;
    } else {
      // For ProcessParam context: use code directly
      this.currentDisplayFormula += item.code;
      this.currentIdFormula += `ID_${item.id}`;
    }
    
    // Clear search input after selection
    this.searchControl.setValue('');
  }

  addCurrentComponentPercentage(): void {
    // Add reference to current component's percentage (when IsCalculated = false)
    const currentId = this.getCurrentComponentId();
    if (currentId) {
      // Tìm tên element từ gangData để hiển thị
      const currentComponent = this.dialogData.gangData?.find(item => item.tphhId === currentId);
      const elementName = currentComponent?.element || 'TỷLệ';
      
      // Hiển thị bằng tên element cho user
      this.currentDisplayFormula += `G:${elementName}_P`;
      // Lưu ID để tránh conflict
      this.currentIdFormula += `G:ID_${currentId}_P`;
    }
  }

  getCurrentComponentId(): number | null {
    // Get current component ID from dialog data
    return this.dialogData.currentComponentId || null;
  }

  private detectDataSources(): ('ore' | 'array' | 'both')[] {
    const hasOreRef = this.currentIdFormula.includes('G:ID_');
    const hasArrayRef = this.currentIdFormula.includes('A:ID_');
    
    if (hasOreRef && hasArrayRef) return ['both'];
    if (hasOreRef) return ['ore'];
    if (hasArrayRef) return ['array'];
    return ['ore']; // fallback
  }

  private validateFormula(formula: string): boolean {
    if (!formula.trim()) return false;
    
    // Kiểm tra cân bằng ngoặc tròn
    const openParens = (formula.match(/\(/g) || []).length;
    const closeParens = (formula.match(/\)/g) || []).length;
    if (openParens !== closeParens) return false;
    
    // Kiểm tra cân bằng ngoặc nhọn
    const openBraces = (formula.match(/\{/g) || []).length;
    const closeBraces = (formula.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) return false;
    
    // Kiểm tra các ký tự không hợp lệ
    const invalidChars = /[^0-9+\-*/().;ID_G:A:]/;
    if (invalidChars.test(formula)) return false;
    
    // Kiểm tra các pattern cơ bản
    // Không được bắt đầu hoặc kết thúc bằng operator
    if (/^[+\-*/]/.test(formula) || /[+\-*/]$/.test(formula)) return false;
    
    // Không được có 2 operator liên tiếp
    if (/[+\-*/]{2,}/.test(formula)) return false;
    
    return true;
  }

  private convertToIdBased(formula: string): string {
    // Formula này đến đã dùng ID_ format nên giữ nguyên
    return formula;
  }
}