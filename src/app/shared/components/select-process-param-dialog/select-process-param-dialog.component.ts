import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoCaoProcessParamModel } from '../../../core/models/locao-process-param.model';
import { LoCaoProcessParamService } from '../../../core/services/locao-process-param.service';

export interface SelectProcessParamDialogData {
  planId?: number;
  planName?: string;
  templateMode?: boolean;
  initialSelection?: Array<{
    id: number;
    thuTu: number;
    code?: string;
    ten?: string;
    donVi?: string;
  }>;
}

export interface ProcessParamWithOrder extends LoCaoProcessParamModel {
  selected: boolean;
  thuTu: number; // Order in the selection list
}

@Component({
  selector: 'app-select-process-param-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './select-process-param-dialog.component.html',
  styleUrls: ['./select-process-param-dialog.component.scss']
})
export class SelectProcessParamDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private locaoProcessParamService = inject(LoCaoProcessParamService);
  private dialogRef = inject(MatDialogRef<SelectProcessParamDialogComponent>);

  form = this.fb.group({
    search: ['']
  });

  allProcessParams: ProcessParamWithOrder[] = [];
  filteredParams: ProcessParamWithOrder[] = [];
  selectedParams: ProcessParamWithOrder[] = [];
  loading = false;
  private nextOrder = 1;
  templateMode = false;
  confirmButtonLabel = 'Lưu cấu hình';

  constructor(@Inject(MAT_DIALOG_DATA) public data: SelectProcessParamDialogData) { }

  ngOnInit(): void {
    this.templateMode = !!this.data?.templateMode;
    this.confirmButtonLabel = this.templateMode ? 'Xác nhận' : 'Lưu cấu hình';
    this.loadProcessParams();

    // Subscribe to search changes
    this.form.get('search')?.valueChanges.subscribe(searchTerm => {
      this.filterParams(searchTerm || '');
    });
  }

  private loadProcessParams(): void {
    this.loading = true;
    this.locaoProcessParamService.getAll().subscribe(allParams => {
      this.allProcessParams = allParams.map(param => ({
        ...param,
        selected: false,
        thuTu: 0
      }));

      if (this.templateMode) {
        const initialMap = new Map<number, { thuTu: number }>();
        (this.data.initialSelection ?? []).forEach(item => {
          initialMap.set(item.id, { thuTu: item.thuTu });
        });

        this.allProcessParams.forEach(param => {
          const matched = initialMap.get(param.id);
          if (matched) {
            param.selected = true;
            param.thuTu = matched.thuTu && matched.thuTu > 0 ? matched.thuTu : this.nextOrder++;
          }
        });

        const maxOrder = this.allProcessParams
          .filter(p => p.selected)
          .reduce((max, p) => Math.max(max, p.thuTu || 0), 0);
        this.nextOrder = maxOrder + 1;

        this.updateSelectedList();
        this.filterParams(this.form.value.search || '');
        this.loading = false;
        return;
      }

      if (this.data.planId == null) {
        this.updateSelectedList();
        this.filterParams(this.form.value.search || '');
        this.loading = false;
        return;
      }

      // Load current configuration for this plan
      this.locaoProcessParamService.getConfiguredByPaId(this.data.planId).subscribe(configuredParams => {
        // Map configured params by ID for quick lookup
        const configuredMap = new Map<number, { thuTuParam?: number | null }>();
        configuredParams.forEach(c => {
          configuredMap.set(c.id, { thuTuParam: c.thuTuParam });
        });

        this.allProcessParams.forEach(param => {
          const configured = configuredMap.get(param.id);
          if (configured) {
            param.selected = true;
            // Lấy thuTu từ cấu hình phương án, nếu không có thì dùng nextOrder
            param.thuTu = configured.thuTuParam && configured.thuTuParam > 0
              ? configured.thuTuParam
              : this.nextOrder++;
          }
        });

        // Cập nhật nextOrder dựa trên thuTu lớn nhất
        const maxOrder = this.allProcessParams
          .filter(p => p.selected)
          .reduce((max, p) => Math.max(max, p.thuTu || 0), 0);
        this.nextOrder = maxOrder + 1;

        this.updateSelectedList();
        this.filterParams(this.form.value.search || '');
        this.loading = false;
      });
    });
  }

  private filterParams(searchTerm: string): void {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredParams = [...this.allProcessParams];
      return;
    }

    this.filteredParams = this.allProcessParams.filter(param =>
      param.ten.toLowerCase().includes(term) ||
      param.code.toLowerCase().includes(term) ||
      param.donVi.toLowerCase().includes(term)
    );
  }

  toggleParamSelection(param: ProcessParamWithOrder): void {
    param.selected = !param.selected;

    if (param.selected) {
      param.thuTu = this.nextOrder++;
    } else {
      // Remove from selection order and reorder remaining
      const removedOrder = param.thuTu;
      this.selectedParams
        .filter(p => p.thuTu > removedOrder)
        .forEach(p => p.thuTu--);
      param.thuTu = 0;
      this.nextOrder--;
    }

    this.updateSelectedList();
  }

  private updateSelectedList(): void {
    this.selectedParams = this.allProcessParams
      .filter(p => p.selected)
      .sort((a, b) => a.thuTu - b.thuTu);
  }

  moveUp(param: ProcessParamWithOrder): void {
    const index = this.selectedParams.findIndex(p => p.id === param.id);
    if (index > 0) {
      const temp = param.thuTu;
      param.thuTu = this.selectedParams[index - 1].thuTu;
      this.selectedParams[index - 1].thuTu = temp;

      this.updateSelectedList();
    }
  }

  moveDown(param: ProcessParamWithOrder): void {
    const index = this.selectedParams.findIndex(p => p.id === param.id);
    if (index < this.selectedParams.length - 1) {
      const temp = param.thuTu;
      param.thuTu = this.selectedParams[index + 1].thuTu;
      this.selectedParams[index + 1].thuTu = temp;

      this.updateSelectedList();
    }
  }

  removeFromSelection(param: ProcessParamWithOrder): void {
    this.toggleParamSelection(param);
  }

  clearAll(): void {
    this.allProcessParams.forEach(param => {
      param.selected = false;
      param.thuTu = 0;
    });
    this.selectedParams = [];
    this.nextOrder = 1;
  }

  confirm(): void {
    if (this.templateMode || this.data.planId == null) {
      const items = this.selectedParams.map((p, index) => ({
        id: p.id,
        thuTu: p.thuTu && p.thuTu > 0 ? p.thuTu : index + 1,
        code: p.code,
        ten: p.ten,
        donVi: p.donVi
      }));
      this.dialogRef.close({ items });
      return;
    }

    const processParamIds = this.selectedParams.map(p => p.id);
    const thuTuParams = this.selectedParams.map(p => p.thuTu);

    this.locaoProcessParamService.configureProcessParamsForPlan(
      this.data.planId,
      processParamIds,
      thuTuParams
    ).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error configuring process params:', error);
        alert('Có lỗi xảy ra khi cấu hình tham số quy trình');
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  trackById(index: number, item: ProcessParamWithOrder): number {
    return item.id;
  }
}
