import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { ThongKeFunctionService } from '../../../core/services/thongke-function.service';
import { ThongKeFunctionModel, ThongKeFunctionUpsertModel } from '../../../core/models/thongke-function.model';
import { FUNCTION_MAPPING_LIST, FunctionMappingItem } from '../../../core/constants/function-mapping.constant';

@Component({
  selector: 'app-thongke-function-upsert-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule
  ],
  templateUrl: './thongke-function-upsert.dialog.html',
  styleUrls: ['./thongke-function-upsert.dialog.scss']
})
export class ThongKeFunctionUpsertDialog implements OnInit {
  form: FormGroup;
  isEdit = false;
  functionMappings: FunctionMappingItem[] = [];
  availableMappings: FunctionMappingItem[] = [];
  selectedMapping: FunctionMappingItem | null = null;
  usedFunctionCodes: string[] = [];
  isCodeLocked = false;

  constructor(
    private fb: FormBuilder,
    private svc: ThongKeFunctionService,
    private dialogRef: MatDialogRef<ThongKeFunctionUpsertDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { model: ThongKeFunctionModel | null }
  ) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      ten: ['', [Validators.required, Validators.maxLength(255)]],
      moTa: ['', [Validators.maxLength(1000)]],
      donVi: ['', [Validators.required, Validators.maxLength(50)]],
      // giữ giá trị mặc định cho backend, ẩn trên UI
      isActive: [true],
      highlightClass: [''],
      isAutoCalculated: [true],
      functionMappingId: [null]
    });
  }

  ngOnInit(): void {
    this.loadFunctionMappings();
    // this.loadUsedFunctionCodes();

    if (this.data.model) {
      this.isEdit = true;
      this.form.patchValue(this.data.model);
      // Load existing mapping if any
      this.loadExistingMapping();
      this.isCodeLocked = true;
    }
  }

  loadFunctionMappings(): void {
    this.functionMappings = FUNCTION_MAPPING_LIST;
    this.updateAvailableMappings();
  }


  updateAvailableMappings(): void {
    if (this.isEdit && this.data.model?.code) {
      // In edit mode, include the current function's code in available mappings
      this.availableMappings = this.functionMappings.filter(m =>
        !this.usedFunctionCodes.includes(m.functionCode) || m.functionCode === this.data.model!.code
      );
    } else {
      // In create mode, exclude all used function codes
      this.availableMappings = this.functionMappings.filter(m =>
        !this.usedFunctionCodes.includes(m.functionCode)
      );
    }
  }

  loadExistingMapping(): void {
    if (this.data.model?.code) {
      const mapping = this.functionMappings.find(m => m.functionCode === this.data.model!.code);
      if (mapping) {
        this.selectedMapping = mapping;
        this.form.patchValue({ functionMappingId: mapping.id });
      }
    }
  }

  onMappingChange(mappingId: string): void {
    const mapping = this.functionMappings.find(m => m.id === mappingId);
    if (mapping) {
      this.selectedMapping = mapping;
      // Auto-fill form fields based on selected mapping
      this.form.patchValue({
        code: mapping.functionCode,
        ten: mapping.ten || mapping.methodName,
        moTa: mapping.description
      });
      this.isCodeLocked = true;
    }
  }

  isMappingDisabled(mapping: FunctionMappingItem): boolean {
    if (this.isEdit && this.data.model?.code) {
      // In edit mode, only disable if it's used by another function
      return this.usedFunctionCodes.includes(mapping.functionCode) &&
        mapping.functionCode !== this.data.model.code;
    } else {
      // In create mode, disable if it's used by any function
      return this.usedFunctionCodes.includes(mapping.functionCode);
    }
  }

  onSubmit(): void {
    if (this.form.valid) {
      const model: ThongKeFunctionUpsertModel = this.form.value;

      // Use upsert method
      this.svc.upsertFunction(this.isEdit ? this.data.model!.id : null, model).subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error upserting function:', error);
          alert('Có lỗi xảy ra khi lưu hàm thống kê');
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
