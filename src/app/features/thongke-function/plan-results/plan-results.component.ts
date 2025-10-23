import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ThongKeFunctionService } from '../../../core/services/thongke-function.service';
import { ThongKeFunctionModel, PlanResultModel } from '../../../core/models/thongke-function.model';
import { ThongKeFunctionResponse, ThongKeResultResponse } from '../../../core/models/thongke-response.model';

@Component({
  selector: 'app-plan-results',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatPaginatorModule,
    MatTooltipModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './plan-results.component.html',
  styleUrls: ['./plan-results.component.scss']
})
export class PlanResultsComponent implements OnInit, OnDestroy {
  planId: number = 0;
  planName: string = '';
  private dialogData: { planId: number; planName: string } | null = inject(MAT_DIALOG_DATA, { optional: true });
  private dialogRef = inject(MatDialogRef<PlanResultsComponent>, { optional: true });
  private snack = inject(MatSnackBar);

  private destroy$ = new Subject<void>();
  private thongKeService = inject(ThongKeFunctionService);

  // Search and pagination
  searchControl = new FormControl('');
  currentPage = 0;
  pageSize = 15;
  totalCount = 0;

  // Available functions (left side)
  availableFunctions: ThongKeFunctionResponse[] = [];
  availableColumns: string[] = ['select', 'description', 'unit'];

  // Selected functions (right side)
  selectedResults: ThongKeResultResponse[] = [];
  selectedColumns: string[] = ['description', 'unit', 'actions'];

  ngOnInit(): void {
    // Initialize from dialog data if opened as a dialog
    if (this.dialogData) {
      this.planId = this.dialogData.planId;
      this.planName = this.dialogData.planName;
    }
    this.setupSearchSubscription();
    // Load selected first to pre-check available list
    this.loadSelectedResults(() => this.loadAvailableFunctions());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchSubscription(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 0;
        this.loadAvailableFunctions();
      });
  }

  loadAvailableFunctions(): void {
    const searchTerm = this.searchControl.value || '';
    
    this.thongKeService.searchFunctions(
      this.currentPage + 1, // Convert to 1-based
      this.pageSize,
      searchTerm
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        // Map response data to ThongKeFunctionResponse format (API returns { total, page, pageSize, data: [...] })
        const items = response?.data.data ?? response?.Data ?? [];
        console.log(items);
        this.availableFunctions = (items || []).map((item: any) => ({
          id: item.id,
          code: item.code,
          ten: item.ten,
          moTa: item.moTa,
          donVi: item.donVi,
          highlightClass: item.highlightClass,
          isAutoCalculated: item.isAutoCalculated,
          isActive: item.isActive
        }));
        this.totalCount = response?.total ?? 0;
      },
      error: (error) => {
        console.error('Error loading available functions:', error);
        this.availableFunctions = [];
        this.totalCount = 0;
      }
    });
  }

  loadSelectedResults(after?: () => void): void {
    this.thongKeService.getResultsByPlanId(this.planId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results: any) => {
        // Map response data to ThongKeResultResponse format
        const items = results?.data ?? results ?? [];
        this.selectedResults = (items || []).map((item: any) => ({
          id_ThongKe_Function: item.iD_ThongKe_Function ?? item.id_ThongKe_Function,
          functionCode: item.functionCode,
          ten: item.ten,
          donVi: item.donVi,
          giaTri: item.giaTri,
          thuTu: item.thuTu,
          description: item.moTa ?? item.description ?? '',
          highlightClass: item.highlightClass
        }));
        // Sắp xếp theo ThuTu nếu có
        this.selectedResults.sort((a, b) => (a.thuTu ?? Number.MAX_SAFE_INTEGER) - (b.thuTu ?? Number.MAX_SAFE_INTEGER));
      },
      error: (error) => {
        console.error('Error loading selected results:', error);
        this.selectedResults = [];
      },
      complete: () => after && after()
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAvailableFunctions();
  }

  isSelected(functionId: number): boolean {
    return this.selectedResults.some(result => (result.iD_ThongKe_Function ?? (result as any).id_ThongKe_Function) === functionId);
  }

  toggleSelection(func: ThongKeFunctionResponse): void {
    // legacy handler (still used in some places). Toggle selection
    this.onAvailableToggle(func, !this.isSelected(func.id));
  }

  onAvailableToggle(func: ThongKeFunctionResponse, checked: boolean): void {
    if (checked) {
      if (!this.selectedResults.some(r => (r.iD_ThongKe_Function ?? (r as any).id_ThongKe_Function) === func.id)) {
        const newResult: ThongKeResultResponse = {
          iD_ThongKe_Function: func.id,
          functionCode: func.code,
          ten: func.ten,
          donVi: func.donVi,
          giaTri: 0,
          description: func.moTa,
          highlightClass: func.highlightClass
        };
        this.selectedResults = [...this.selectedResults, newResult];
      }
    } else {
      this.selectedResults = this.selectedResults.filter(r => (r.iD_ThongKe_Function ?? (r as any).id_ThongKe_Function) !== func.id);
      this.selectedResults = [...this.selectedResults];
    }
  }

  removeFromSelection(result: ThongKeResultResponse): void {
    const targetId = (result as any).iD_ThongKe_Function ?? (result as any).id_ThongKe_Function;
    if (targetId == null) return;
    this.selectedResults = this.selectedResults.filter(r => ((r as any).iD_ThongKe_Function ?? (r as any).id_ThongKe_Function) !== targetId);
    this.selectedResults = [...this.selectedResults];
  }

  moveUp(result: ThongKeResultResponse): void {
    const targetId = (result as any).iD_ThongKe_Function ?? (result as any).id_ThongKe_Function;
    const idx = this.selectedResults.findIndex(r => ((r as any).iD_ThongKe_Function ?? (r as any).id_ThongKe_Function) === targetId);
    if (idx > 0) {
      [this.selectedResults[idx - 1], this.selectedResults[idx]] = [this.selectedResults[idx], this.selectedResults[idx - 1]];
      this.reindexThuTu();
    }
  }

  moveDown(result: ThongKeResultResponse): void {
    const targetId = (result as any).iD_ThongKe_Function ?? (result as any).id_ThongKe_Function;
    const idx = this.selectedResults.findIndex(r => ((r as any).iD_ThongKe_Function ?? (r as any).id_ThongKe_Function) === targetId);
    if (idx >= 0 && idx < this.selectedResults.length - 1) {
      [this.selectedResults[idx + 1], this.selectedResults[idx]] = [this.selectedResults[idx], this.selectedResults[idx + 1]];
      this.reindexThuTu();
    }
  }

  private reindexThuTu(): void {
    this.selectedResults = this.selectedResults.map((r, i) => ({ ...r, thuTu: i + 1 }));
  }

  onValueChange(result: ThongKeResultResponse, newValue: string): void {
    const numericValue = parseFloat(newValue);
    if (!isNaN(numericValue)) {
      result.giaTri = numericValue;
    }
  }

  saveResults(): void {
    const items = this.selectedResults.map((result, idx) => ({
      Id_ThongKe_Function: (result as any).iD_ThongKe_Function ?? (result as any).id_ThongKe_Function,
      GiaTri: result.giaTri,
      ThuTu: result.thuTu ?? idx + 1
    }));

    const payload = {
      PlanId: this.planId,
      Items: items
    };

    console.log('Upsert payload:', payload);

    this.thongKeService.upsertResultsForPlan(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snack.open('Lưu cấu hình thống kê thành công', 'Đóng', { duration: 1500, panelClass: ['snack-success'] });
        if (this.dialogRef) {
          this.dialogRef.close(true);
        }
      },
      error: (error) => {
        console.error('Error saving results:', error);
        this.snack.open('Lưu cấu hình thống kê thất bại', 'Đóng', { duration: 2000, panelClass: ['snack-error'] });
        if (this.dialogRef) {
          this.dialogRef.close(false);
        }
      }
    });
  }

  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close(false);
    }
  }
}
