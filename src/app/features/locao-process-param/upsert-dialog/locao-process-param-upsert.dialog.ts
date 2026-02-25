import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LoCaoProcessParamModel, LoCaoProcessParamUpsertDto } from '../../../core/models/locao-process-param.model';
import { LoCaoProcessParamService } from '../../../core/services/locao-process-param.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { SelectQuangDialogComponent, OreVm } from '../../mix-quang-dialog/select-quang-dialog/select-quang-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { FormulaCalculatorComponent } from '../formula-calculator/formula-calculator.component';
import { FormulaCalculatorData, FormulaCalculatorResult, FormulaParam, FormulaCalculatorContext } from '../../../core/models/formula-calculator.model';
import { FormulaService } from '../../../core/services/formula.service';

@Component({
  selector: 'app-locao-process-param-upsert-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCheckboxModule,
    MatSelectModule,
    MatChipsModule,
  ],
  templateUrl: './locao-process-param-upsert.dialog.html',
  styleUrls: ['./locao-process-param-upsert.dialog.scss']
})
export class LoCaoProcessParamUpsertDialog {
  private fb = inject(FormBuilder);
  private svc = inject(LoCaoProcessParamService);
  private dlgRef = inject(MatDialogRef<LoCaoProcessParamUpsertDialog>);
  private dialog = inject(MatDialog);
  private formulaService = inject(FormulaService);

  form = this.fb.group({
    id: [0],
    code: ['', Validators.required],
    ten: ['', Validators.required],
    donVi: ['', Validators.required],
    scope: [2 as number | null],
    id_Quang_LienKet: [null as number | null],
    thuTu: [0, Validators.required],
    isCalculated: [false],
    calcFormula: [''],
    giaTriMacDinh: [null as number | null]
  });

  linkedOre?: { id: number; ma: string; ten: string } | null;
  availableParams: LoCaoProcessParamModel[] = [];
  constructor(@Inject(MAT_DIALOG_DATA) public data: LoCaoProcessParamModel | null) {
    // Load available params for formula conversion
    this.loadAvailableParams();
    
    if (data) {
      this.form.patchValue({
        id: data.id,
        code: data.code,
        ten: data.ten,
        donVi: data.donVi,
        scope: (data as any).scope ?? 2,
        id_Quang_LienKet: data.id_Quang_LienKet ?? null,
        thuTu: data.thuTu,
        isCalculated: data.isCalculated,
        calcFormula: data.calcFormula,
        giaTriMacDinh: data.giaTriMacDinh ?? null,
      });
      // Use linkedOre provided from BE detail if present
      const anyData = data as any;
      if (anyData && anyData.linkedOre) {
        // Ensure shape { id, ma, ten }
        const lo = anyData.linkedOre as any;
        this.linkedOre = { id: lo.id, ma: lo.ma ?? lo.code ?? '', ten: lo.ten ?? lo.name ?? '' };
      }
    }
    
    // Listen to scope changes to reset isCalculated when not LinkedOre
    this.form.get('scope')?.valueChanges.subscribe(scope => {
      if (scope !== 0) {
        // Reset isCalculated and calcFormula when scope is not LinkedOre
        this.form.patchValue({
          isCalculated: false,
          calcFormula: ''
        }, { emitEvent: false });
      }
    });
  }

  private loadAvailableParams(): void {
    this.svc.searchPaged({ 
      pageIndex: 0, 
      pageSize: 100, 
      sortBy: 'code',
      sortDir: 'asc'
    }).subscribe(result => {
      // Only show non-calculated params to avoid circular dependencies
      this.availableParams = result.data.filter(p => !p.isCalculated);
    });
  }


  openFormulaCalculator(): void {
    // Map LoCaoProcessParamModel to FormulaParam
    const formulaParams: FormulaParam[] = this.availableParams.map(param => ({
      id: param.id,
      code: param.code,
      ten: param.ten
    }));

    const dialogData: FormulaCalculatorData = {
      context: FormulaCalculatorContext.ProcessParam,
      title: 'Tạo công thức cho tham số',
      currentIdFormula: this.form.value.calcFormula || '',
      availableParams: formulaParams,
      searchApi: async (searchTerm: string) => {
        return new Promise((resolve) => {
          this.svc.searchPaged({
            pageIndex: 0,
            pageSize: 50,
            search: searchTerm,
            sortBy: 'code',
            sortDir: 'asc'
          }).subscribe(result => {
            const searchParams: FormulaParam[] = result.data
              .filter(p => !p.isCalculated) // Avoid circular dependencies
              .map(p => ({
                id: p.id,
                code: p.code,
                ten: p.ten
              }));
            resolve(searchParams);
          });
        });
      },
      searchPlaceholder: 'Tìm kiếm tham số quy trình...'
    };

    const dialogRef = this.dialog.open(FormulaCalculatorComponent, {
      width: '800px',
      height: 'auto',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: FormulaCalculatorResult | null) => {
      if (result) {
        // Lưu ID-based formula
        this.form.patchValue({ calcFormula: result.idFormula });
      }
    });
  }

  getDisplayFormula(): string {
    const formula = this.form.get('calcFormula')?.value || '';
    if (!formula) return '';
    
    // Map LoCaoProcessParamModel to FormulaParam for service
    const formulaParams: FormulaParam[] = this.availableParams.map(param => ({
      id: param.id,
      code: param.code,
      ten: param.ten
    }));
    
    // Use formula service to convert
    return this.formulaService.convertIdToDisplayFormula(formula, formulaParams);
  }

  selectLinkedOre(): void {
    const dialogRef = this.dialog.open(SelectQuangDialogComponent, {
      width: '80vw',
      height: '80vh',
      data: { 
        multiple: false,
        title: 'Chọn quặng liên kết'
      },
    });

    dialogRef.afterClosed().subscribe((ores: OreVm[] | null) => {
      const ore = (Array.isArray(ores) ? ores[0] : null) as (OreVm | null);
      if (!ore) return;
      this.linkedOre = { id: ore.id, ma: (ore as any).ma ?? ore.maQuang, ten: (ore as any).ten ?? ore.tenQuang };
      this.form.patchValue({ id_Quang_LienKet: ore.id });
    });
  }

  clearLinkedOre(): void {
    this.linkedOre = null;
    this.form.patchValue({ id_Quang_LienKet: null });
  }

  save() {
    const dto: LoCaoProcessParamUpsertDto = {
      id: this.form.value.id ?? 0,
      code: this.form.value.code!,
      ten: this.form.value.ten!,
      donVi: this.form.value.donVi!,
      scope: this.form.value.scope ?? null,
      id_Quang_LienKet: this.form.value.id_Quang_LienKet ?? null,
      thuTu: this.form.value.thuTu ?? 0,
      isCalculated: this.form.value.isCalculated ?? false,
      calcFormula: this.form.value.calcFormula || null,
      giaTriMacDinh: this.form.value.giaTriMacDinh ?? null,
    };
    this.svc.upsert(dto).subscribe(() => this.dlgRef.close(true));
  }

  cancel() {
    this.dlgRef.close(false);
  }
}