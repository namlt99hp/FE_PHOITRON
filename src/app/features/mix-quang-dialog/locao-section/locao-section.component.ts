import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, map, distinctUntilChanged } from 'rxjs';
import { LoCaoProcessParamResponse } from '../../../core/models/locao-process-param-response.model';
import { LoCaoProcessParamService } from '../../../core/services/locao-process-param.service';
import { FormulaService } from '../../../core/services/formula.service';
import { AdaptiveNumberPipe } from '../../../core/pipes/adaptive-number.pipe';
import { HideZeroInputDirective } from '../../../core/directives/hide-zero-input.directive';

@Component({
  selector: 'app-mix-quang-locao-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdaptiveNumberPipe, HideZeroInputDirective],
  templateUrl: './locao-section.component.html',
  styleUrls: ['./locao-section.component.scss']
})
export class MixQuangLoCaoSectionComponent implements OnInit, OnDestroy {
  private locaoParamService = new LoCaoProcessParamService();
  private formulaService = new FormulaService();
  
  @Input() selectedChems: any[] = [];
  @Input() locaoControls: Map<number, {klVaoLo: FormControl<number | null>, tyLeHoiQuang: FormControl<number | null>}> | null = null;
  @Input() updateTrigger: number = 0; // Allows parent to trigger updates
  @Input() planId: number = 0; // Plan ID to load specific config
  
  @Output() processParamsChange = new EventEmitter<Array<{id: number, code: string, value: number, iD_Quang_LienKet?: number, scope?: number, calcFormula?: string}>>();
  @Output() oreKlVaoLoPatch = new EventEmitter<{ oreId: number; value: number }>();
  
  private destroy$ = new Subject<void>();
  private lastLoadedPlanId: number | null = null;
  private formChangesSub: any = null; // holds subscription to valueChanges to avoid leaks when rebuilding form

  // Process parameters data - load from database
  processParamsList: LoCaoProcessParamResponse[] = [];
  
  // Main form group for all parameters
  paramForm: FormGroup = new FormGroup({});

  constructor(private locaoProcessParamService: LoCaoProcessParamService) {}

  ngOnInit(): void {
    this.loadProcessParamsByPlan();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(): void {
    if (this.updateTrigger > 0) {
      // Handle update trigger from parent
    }
  }

  // Load process parameters for the current plan
  private loadProcessParamsByPlan(): void {
    if (!this.planId || this.planId === this.lastLoadedPlanId) {
      return;
    }

    this.locaoProcessParamService.getConfiguredByPaId(this.planId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((params: LoCaoProcessParamResponse[]) => {
        this.processParamsList = params;
        this.lastLoadedPlanId = this.planId;
        // Clear existing data
        // Create FormGroup with FormControls for each parameter
        const formControls: { [key: string]: FormControl } = {};
        
        params.forEach((param: LoCaoProcessParamResponse) => {
          // Khởi tạo control với giá trị đã lưu (giaTri) nếu có
          const initial = typeof param.giaTri === 'number' ? param.giaTri : 0;
          formControls[param.code] = new FormControl(initial);
        });
        
        // Create/Recreate FormGroup
        if (this.formChangesSub) {
          try { this.formChangesSub.unsubscribe(); } catch {}
          this.formChangesSub = null;
        }
        this.paramForm = new FormGroup(formControls);

        // Immediately emit current snapshot so parent can calculate
        const initialValues = this.paramForm.getRawValue() as { [key: string]: number };
        this.processParamsChange.emit(this.emitInputData(initialValues));

        // Subscribe to form value changes (debounced) and emit batch
        this.formChangesSub = this.paramForm.valueChanges.pipe(
          debounceTime(120),
          map(values => this.emitInputData(values)),
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
        ).subscribe(inputData => {
          this.processParamsChange.emit(inputData);
        });
      });
  }

  // Emit raw input data - no calculations here
  private emitInputData(formValues: { [key: string]: number }): Array<{id: number, code: string, value: number, iD_Quang_LienKet?: number, scope?: number, calcFormula?: string}> {
    const results: Array<{id: number, code: string, value: number, iD_Quang_LienKet?: number, scope?: number, calcFormula?: string}> = [];
    
    // Emit all params that have values
    this.processParamsList.forEach(param => {
      const value = formValues[param.code];
      if (value !== undefined && value !== null) {
        results.push({
          id: param.id,
          code: param.code,
          value: value,
          iD_Quang_LienKet: param.iD_Quang_LienKet ?? undefined,
          scope: param.scope,
          calcFormula: param.calcFormula || undefined
        });
      }
    });
    return results;
  }

  trackByParamId(index: number, param: LoCaoProcessParamResponse): number {
    return param.id;
  }
  // Kiểm tra xem param có phải self-referencing formula không
  isSelfReferencingFormula(param: LoCaoProcessParamResponse): boolean {
    // Tự động detect dựa vào công thức
    if (!param.calcFormula || !param.id) return false;
    return (this.formulaService as any).isSelfReferencing(param.calcFormula, param.id);
  }

  // Check if param should be disabled (has self-reference in formula)
  isParamDisabled(param: LoCaoProcessParamResponse): boolean {
    // Dựa vào response API để xử lý
    if (param.isCalculated === true && this.isSelfReferencingFormula(param) && param.iD_Quang_LienKet) {
      // Self-referencing formula có linked ore - disable input
      return true;
    }
    return false;
  }

  // Check if param should show input (instead of calculated span)
  shouldShowInput(param: LoCaoProcessParamResponse): boolean {
    // Dựa vào response API để xử lý
    if (param.isCalculated === true) {
      // Có công thức - chỉ show input nếu là self-referencing
      return this.isSelfReferencingFormula(param);
    } else {
      // Không có công thức - luôn show input
      return true;
    }
  }


  // Internal state to store calculated values for display
  private calculatedDisplayValues = new Map<string, number>();

  // Update calculated value for display (called from mix-quang-dialog)
  updateCalculatedValue(code: string, value: number): void {
    this.calculatedDisplayValues.set(code, value);
  }

  // Get calculated value for display
  getCalculatedDisplayValue(code: string): number {
    return this.calculatedDisplayValues.get(code) || 0;
  }

  // Expose current input snapshot for saving to PA_ProcessParamValue
  getCurrentParamInputs(): { idProcessParam: number; giaTri: number; thuTuParam?: number | null }[] {
    const out: { idProcessParam: number; giaTri: number; thuTuParam?: number | null }[] = [];
    for (const p of this.processParamsList) {
      let val = Number(this.paramForm.get(p.code)?.value ?? 0);
      // Nếu trường này hiển thị dạng tính toán (không có input), lấy từ calculatedDisplayValues
      if (!this.shouldShowInput(p)) {
        const calc = this.calculatedDisplayValues.get(p.code);
        if (typeof calc === 'number' && Number.isFinite(calc)) {
          val = calc;
        }
      }
      out.push({ idProcessParam: p.id, giaTri: val, thuTuParam: p.thuTuParam ?? p.thuTu ?? null });
    }
    return out;
  }

  // Expose current emit payload for parent to trigger initial calculation
  getCurrentEmitList(): Array<{id: number, code: string, value: number, iD_Quang_LienKet?: number, scope?: number, calcFormula?: string}> {
    const raw = this.paramForm.getRawValue() as { [key: string]: number };
    return this.emitInputData(raw);
  }
}