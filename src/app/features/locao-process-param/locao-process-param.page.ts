import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LoCaoProcessParamService } from '../../core/services/locao-process-param.service';
import { LoCaoProcessParamModel } from '../../core/models/locao-process-param.model';
import { LoCaoProcessParamUpsertDialog } from './upsert-dialog/locao-process-param-upsert.dialog';
import { TableCommonComponent } from '../../shared/components/table-common/table-common.component';
import { TableColumn, TableQuery, TableResult } from '../../shared/components/table-common/table-types';
import { Observable, of } from 'rxjs';
import { FormulaConverterService } from '../../core/services/formula-converter.service';

@Component({
  selector: 'app-locao-process-param-page',
  standalone: true,
  imports: [CommonModule, TableCommonComponent, MatButtonModule, MatIconModule],
  templateUrl: './locao-process-param.page.html',
  styleUrls: ['./locao-process-param.page.scss']
})
export class LoCaoProcessParamPage implements OnInit {
  private svc = inject(LoCaoProcessParamService);
  private dialog = inject(MatDialog);
  private formulaConverter = inject(FormulaConverterService);
  @ViewChild(TableCommonComponent)
  table!: TableCommonComponent<LoCaoProcessParamModel>;

  // Cache params để convert nhanh
  private paramsCache: LoCaoProcessParamModel[] = [];

  columns: TableColumn<LoCaoProcessParamModel>[] = [
    { key: 'code', header: 'Mã' },
    { key: 'ten', header: 'Tên' },
    { key: 'donVi', header: 'Đơn vị' },
    { key: 'thuTu', header: 'Thứ tự', sortable: true },
    { key: 'isCalculated', header: 'Tự động tính', cell: row => row.isCalculated ? 'Có' : 'Không' },
    { key: 'calcFormula', header: 'Công thức', cell: row => this.convertFormulaToDisplay(row.calcFormula) },
  ];

  fetcher = (q: TableQuery): Observable<TableResult<LoCaoProcessParamModel>> => this.svc.searchPaged(q);

  ngOnInit(): void {
    // Load params để cache cho việc convert
    this.svc.searchPaged({ pageIndex: 0, pageSize: 1000 }).subscribe(result => {
      this.paramsCache = result.data;
    });
  }

  convertFormulaToDisplay(formula: string | null | undefined): string {
    if (!formula) return '-';
    
    // Convert "ID_1/ID_2" thành "Mẻ liệu/Phụ Tải" sử dụng cache
    return formula.replace(/ID_(\d+)/g, (match, idStr) => {
      const id = parseInt(idStr);
      const param = this.paramsCache.find(p => p.id === id);
      return param ? param.ten : match;
    });
  }

  onCreate() {
    const dlg = this.dialog.open(LoCaoProcessParamUpsertDialog, { width: '520px', data: null });
    dlg.afterClosed().subscribe((ok) => ok && ( this.table?.refresh()));
  }

  onEdit(row: LoCaoProcessParamModel) {
    this.svc.getById(row.id).subscribe(detail => {
      const dlg = this.dialog.open(LoCaoProcessParamUpsertDialog, { 
        width: '520px', 
        data: detail,
        // Pass search function to dialog
        panelClass: 'locao-process-param-dialog'
      });
      dlg.afterClosed().subscribe((ok) => ok && (this.table?.refresh()));
    });
  }

  // Removed formula-setup functionality - using hard-coded formulas instead
}


