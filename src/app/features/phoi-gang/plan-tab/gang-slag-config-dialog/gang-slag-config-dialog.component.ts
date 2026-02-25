import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { QuangService } from '../../../../core/services/quang.service';
import { LoaiQuangEnum } from '../../../../core/enums/loaiquang.enum';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuangUpsertWithThanhPhanDto, QuangThanhPhanHoaHocDto } from '../../../../core/models/quang.model';
import { SelectTphhDialogComponent } from '../../../mix-quang-dialog/select-tphh-dialog/select-tphh-dialog.component';
import { FormulaCalculatorComponent } from '../../../locao-process-param/formula-calculator/formula-calculator.component';
import { FormulaCalculatorData, FormulaCalculatorResult, FormulaCalculatorContext, FormulaParam } from '../../../../core/models/formula-calculator.model';
import { ThanhPhanHoaHocService } from '../../../../core/services/tphh.service';

export interface GangSlagConfigDialogData {
    quangId: number | null;
    loaiQuang: number; // LoaiQuangEnum.Gang = 2, LoaiQuangEnum.Xi = 4
    planId?: number;
    idQuangGang?: number | null;
}

@Component({
    selector: 'app-gang-slag-config-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatFormFieldModule,
        MatInputModule,
        MatCardModule,
        MatTooltipModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './gang-slag-config-dialog.component.html',
    styleUrls: ['./gang-slag-config-dialog.component.scss']
})
export class GangSlagConfigDialogComponent {
    private quangService = inject(QuangService);
    private snack = inject(MatSnackBar);
    private dialogRef = inject(MatDialogRef<GangSlagConfigDialogComponent>);
    private dialog = inject(MatDialog);
    private tphhService = inject(ThanhPhanHoaHocService);
    
    // Expose enum for template
    readonly LoaiQuangEnum = LoaiQuangEnum;

    loading = signal(false);
    config = signal<{
        quang: any;
        tpHoaHocs: Map<number, {
            phanTram: FormControl<number | null>;
            calcFormula?: string;
            displayFormula?: string;
            isCalculated?: boolean;
            ma_TPHH?: string;
            ten_TPHH?: string;
        }>;
    } | null>(null);

    constructor(@Inject(MAT_DIALOG_DATA) public data: GangSlagConfigDialogData) {
        if (data.quangId) {
            this.loadConfig(data.quangId);
        }
    }

    private loadConfig(quangId: number) {
        this.loading.set(true);
        this.quangService.getById(quangId).subscribe({
            next: (res) => {
                if (!res?.quang) {
                    this.snack.open('Không tìm thấy thông tin quặng', 'Đóng', { duration: 2000 });
                    this.loading.set(false);
                    return;
                }

                const tpHoaHocsMap = new Map<number, {
                    phanTram: FormControl<number | null>;
                    calcFormula?: string;
                    displayFormula?: string;
                    isCalculated?: boolean;
                    ma_TPHH?: string;
                    ten_TPHH?: string;
                }>();

                (res.tP_HoaHocs || []).forEach(tphh => {
                    tpHoaHocsMap.set(tphh.id, {
                        phanTram: new FormControl<number | null>(tphh.phanTram ?? 0),
                        calcFormula: tphh.calcFormula || undefined,
                        displayFormula: tphh.calcFormula || undefined,
                        isCalculated: tphh.isCalculated || false,
                        ma_TPHH: tphh.ma_TPHH,
                        ten_TPHH: tphh.ten_TPHH || undefined
                    });
                });

                // Sử dụng id_Quang_Gang từ data (đã được truyền vào dialog)
                // Nếu data không có, dùng từ response
                let quangData = { ...res.quang };
                quangData.id_Quang_Gang = this.data.idQuangGang;

                this.config.set({
                    quang: quangData,
                    tpHoaHocs: tpHoaHocsMap
                });

                this.loading.set(false);
            },
            error: (err) => {
                this.snack.open('Không thể tải cấu hình: ' + (err.message || 'Lỗi không xác định'), 'Đóng', { duration: 3000 });
                this.loading.set(false);
            }
        });
    }

    getTpHoaHocs() {
        const config = this.config();
        if (!config) return [];
        return Array.from(config.tpHoaHocs.entries()).map(([id, value]) => ({
            id,
            ma_TPHH: value.ma_TPHH || '',
            ten_TPHH: value.ten_TPHH || '',
            phanTram: value.phanTram,
            calcFormula: value.calcFormula,
            displayFormula: value.displayFormula,
            isCalculated: value.isCalculated
        }));
    }

    editTpHoaHocs() {
        const config = this.config();
        if (!config) return;

        const dlg = this.dialog.open(SelectTphhDialogComponent, {
            width: '750px',
            data: { preselectedIds: Array.from(config.tpHoaHocs.keys()) }
        });

        dlg.afterClosed().subscribe((list: { id: number; ma_TPHH: string; ten_TPHH?: string }[] | undefined) => {
            if (!list) return;

            const next = new Map(config.tpHoaHocs);
            const selectedIds = new Set(list.map(c => c.id));

            // Thêm TPHH mới
            for (const c of list) {
                if (!next.has(c.id)) {
                    next.set(c.id, {
                        phanTram: new FormControl<number | null>(0),
                        calcFormula: undefined,
                        displayFormula: undefined,
                        isCalculated: false,
                        ma_TPHH: c.ma_TPHH,
                        ten_TPHH: c.ten_TPHH
                    });
                } else {
                    // Giữ lại thông tin hiện có
                    const existing = next.get(c.id)!;
                    existing.ma_TPHH = c.ma_TPHH;
                    existing.ten_TPHH = c.ten_TPHH;
                }
            }

            // Xóa TPHH không còn được chọn
            for (const id of Array.from(next.keys())) {
                if (!selectedIds.has(id)) {
                    next.delete(id);
                }
            }

            this.config.set({
                quang: config.quang,
                tpHoaHocs: next
            });
        });
    }

    save() {
        const config = this.config();
        if (!config || !this.data.quangId) return;

        const thanhPhanHoaHoc: QuangThanhPhanHoaHocDto[] = [];
        config.tpHoaHocs.forEach((value, tphhId) => {
            thanhPhanHoaHoc.push({
                ID_TPHH: tphhId,
                Gia_Tri_PhanTram: value.phanTram.value ?? 0,
                CalcFormula: value.calcFormula,
                IsCalculated: value.isCalculated || false
            });
        });

        const dto: QuangUpsertWithThanhPhanDto = {
            id: this.data.quangId,
            ma_Quang: config.quang.ma_Quang,
            ten_Quang: config.quang.ten_Quang,
            id_LoaiQuang: this.data.loaiQuang,
            dang_Hoat_Dong: true,
            ghi_Chu: config.quang.ghi_Chu ?? null,
            thanhPhanHoaHoc: thanhPhanHoaHoc,
            gia: null,
            id_Quang_Gang: config.quang.id_Quang_Gang,
            saveAsTemplate: false,
            templateConfig: null
        };


        this.quangService.upsertWithThanhPhan(dto).subscribe({
            next: (res) => {
                if (res?.success) {
                    this.snack.open('Lưu cấu hình thành công', 'Đóng', { duration: 2000 });
                    this.dialogRef.close(true);
                } else {
                    this.snack.open('Lưu cấu hình thất bại: ' + (res?.message || 'Lỗi không xác định'), 'Đóng', { duration: 3000 });
                }
            },
            error: (err) => {
                this.snack.open('Lưu cấu hình thất bại: ' + (err.message || 'Lỗi không xác định'), 'Đóng', { duration: 3000 });
            }
        });
    }

    openFormulaCalculator(item: { id: number; ma_TPHH: string; ten_TPHH?: string }) {
        const config = this.config();
        if (!config) return;

        const availableParams: FormulaParam[] = Array.from(config.tpHoaHocs.keys()).map(id => {
            const tphh = config.tpHoaHocs.get(id)!;
            return {
                id: id,
                code: tphh.ma_TPHH || '',
                ten: tphh.ten_TPHH || tphh.ma_TPHH || '',
            };
        });

        const currentCtrl = config.tpHoaHocs.get(item.id);
        const dialogData: FormulaCalculatorData = {
            context: FormulaCalculatorContext.OreChemistry,
            title: `Thiết lập công thức cho ${item.ma_TPHH}`,
            currentIdFormula: currentCtrl?.calcFormula || '',
            currentIsCalculated: currentCtrl?.isCalculated || false,
            currentComponentId: item.id,
            availableParams,
            searchApi: async (searchTerm: string) => new Promise((resolve) => {
                this.tphhService.search({
                    pageIndex: 0,
                    pageSize: 50,
                    search: searchTerm,
                    sortBy: 'code',
                    sortDir: 'asc'
                }).subscribe(result => {
                    const searchParams: FormulaParam[] = result.data.map(p => ({
                        id: p.id,
                        code: p.ma_TPHH,
                        ten: p.ten_TPHH || p.ma_TPHH,
                    }));
                    resolve(searchParams);
                });
            }),
            searchPlaceholder: 'Tìm kiếm thành phần hóa học...',
            gangData: Array.from(config.tpHoaHocs.entries()).map(([id, ctrl]) => ({
                tphhId: id,
                element: ctrl.ten_TPHH || ctrl.ma_TPHH || '',
                mass: 0,
                percentage: ctrl.phanTram.value ?? 0,
                isCalculated: ctrl.isCalculated || false,
                calcFormula: ctrl.calcFormula,
            })),
            arrayData: [],
        };

        const dlg = this.dialog.open(FormulaCalculatorComponent, {
            width: '900px',
            maxWidth: '95vw',
            disableClose: true,
            data: dialogData
        });

        dlg.afterClosed().subscribe((result: FormulaCalculatorResult | undefined) => {
            if (!result) return;

            const next = new Map(config.tpHoaHocs);
            const ctrl = next.get(item.id);
            if (ctrl) {
                ctrl.calcFormula = result.idFormula || undefined;
                ctrl.displayFormula = result.idFormula || undefined;
                ctrl.isCalculated = result.isCalculated || false;
                next.set(item.id, ctrl);
                this.config.set({
                    quang: config.quang,
                    tpHoaHocs: next
                });
            }
        });
    }

    removeTpHoaHoc(tphhId: number) {
        const config = this.config();
        if (!config) return;

        const next = new Map(config.tpHoaHocs);
        next.delete(tphhId);

        this.config.set({
            quang: config.quang,
            tpHoaHocs: next
        });
    }

    trackByTphhId = (_: number, item: { id: number }) => item.id;

    close() {
        this.dialogRef.close(false);
    }
}

