import { Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { QuangService } from '../../core/services/quang.service';
import { PhuongAnPhoiService } from '../../core/services/phuong-an-phoi.service';
import { ThanhPhanHoaHocService } from '../../core/services/tphh.service';
import { LoCaoProcessParamService } from '../../core/services/locao-process-param.service';
import { ThongKeFunctionService } from '../../core/services/thongke-function.service';
import { LoaiQuangEnum } from '../../core/enums/loaiquang.enum';
import { VnTimePipe } from '../../shared/pipes/datetime.pipe';
import { QuangTableModel } from '../../core/models/quang.model';
import { LoCaoProcessParamModel } from '../../core/models/locao-process-param.model';
import { PlanSectionDto } from '../../core/models/phuong-an-phoi.model';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

interface DashboardKpi {
  label: string;
  value: string | number;
}

const QUANG_NHAP_LOAI = [
  LoaiQuangEnum.Mua,
  LoaiQuangEnum.Tron,
  LoaiQuangEnum.NhienLieu,
  LoaiQuangEnum.QuangCo,
  LoaiQuangEnum.QuangVeVien,
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private quangService = inject(QuangService);
  private phuongAnService = inject(PhuongAnPhoiService);
  private tphhService = inject(ThanhPhanHoaHocService);
  private locaoParamService = inject(LoCaoProcessParamService);
  private thongKeService = inject(ThongKeFunctionService);
  private vnTime = inject(VnTimePipe);

  loadingKpis = true;
  loadingGangDich = true;
  loadingQuangNhap = true;
  loadingPlans = true;
  loadingParams = true;

  // Tổng quan hệ thống - đếm thực từ dữ liệu hiện có
  kpis: DashboardKpi[] = [
    { label: 'Quặng Gang đích', value: '-' },
    { label: 'Quặng nhập đang quản lý', value: '-' },
    { label: 'Thành phần hóa học', value: '-' },
    { label: 'Tham số Lò Cao', value: '-' },
    { label: 'Hàm thống kê', value: '-' },
  ];

  // Quick actions
  actions = [
    { icon: 'sliders', label: 'Tạo gang mới', click: () => this.router.navigate(['/quang-gang']) },
    { icon: 'tools', label: 'Tham số lò cao', click: () => this.router.navigate(['/locao-process-params']) },
    { icon: 'box', label: 'Danh mục quặng', click: () => this.router.navigate(['/quang']) },
    { icon: 'flask', label: 'Thành phần hóa học', click: () => this.router.navigate(['/thanh-phan-hoa-hoc']) },
    { icon: 'graph-up', label: 'Hàm thống kê', click: () => this.router.navigate(['/thongke-phuongan']) },
  ];

  // Danh sách Quặng Gang đích tạo gần đây
  recentGangDich: QuangTableModel[] = [];

  // Danh sách Quặng nhập tạo gần đây
  recentQuangNhap: QuangTableModel[] = [];

  // Phương án phối gần đây - của Gang đích mới tạo gần nhất (không có endpoint lấy toàn hệ thống)
  recentGangName = '';
  recentPlans: PlanSectionDto[] = [];

  // Tham số Lò Cao đang khai báo trong hệ thống
  locaoParams: LoCaoProcessParamModel[] = [];

  ngOnInit(): void {
    this.loadKpis();
    this.loadRecentGangDichAndPlans();
    this.loadRecentQuangNhap();
    this.loadLoCaoParams();
  }

  private loadKpis(): void {
    this.loadingKpis = true;
    forkJoin({
      gangDich: this.quangService
        .search({ pageIndex: 0, pageSize: 1, idLoaiQuang: [LoaiQuangEnum.Gang], isGangTarget: true })
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      quangNhap: this.quangService
        .search({ pageIndex: 0, pageSize: 1, idLoaiQuang: QUANG_NHAP_LOAI })
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      tphh: this.tphhService
        .search({ pageIndex: 0, pageSize: 1 })
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      thamSo: this.locaoParamService.getAll().pipe(catchError(() => of([]))),
      thongKe: this.thongKeService.getAllFunctions().pipe(catchError(() => of([]))),
    }).subscribe((res) => {
      this.kpis = [
        { label: 'Quặng Gang đích', value: res.gangDich.total },
        { label: 'Quặng nhập đang quản lý', value: res.quangNhap.total },
        { label: 'Thành phần hóa học', value: res.tphh.total },
        { label: 'Tham số Lò Cao', value: res.thamSo.length },
        { label: 'Hàm thống kê', value: res.thongKe.length },
      ];
      this.loadingKpis = false;
    });
  }

  private loadRecentGangDichAndPlans(): void {
    this.loadingGangDich = true;
    this.loadingPlans = true;
    this.quangService
      .search({
        pageIndex: 0,
        pageSize: 5,
        sortBy: 'ngayTao',
        sortDir: 'desc',
        idLoaiQuang: [LoaiQuangEnum.Gang],
        isGangTarget: true,
      })
      .pipe(
        catchError(() => of({ data: [] as QuangTableModel[], total: 0 })),
        switchMap((res) => {
          this.recentGangDich = res.data;
          this.loadingGangDich = false;
          const latest = res.data[0];
          if (!latest) {
            this.loadingPlans = false;
            return of(null);
          }
          this.recentGangName = latest.tenQuang;
          return this.phuongAnService.getPlanSectionsByGangDich(latest.id).pipe(
            catchError(() => of({ success: false, data: [] as PlanSectionDto[] }))
          );
        })
      )
      .subscribe((res) => {
        const plans = res?.data ?? [];
        this.recentPlans = [...plans]
          .sort((a, b) => (b.ngay_Tinh_Toan ?? '').localeCompare(a.ngay_Tinh_Toan ?? ''))
          .slice(0, 5);
        this.loadingPlans = false;
      });
  }

  private loadRecentQuangNhap(): void {
    this.loadingQuangNhap = true;
    this.quangService
      .search({
        pageIndex: 0,
        pageSize: 5,
        sortBy: 'ngayTao',
        sortDir: 'desc',
        idLoaiQuang: QUANG_NHAP_LOAI,
      })
      .pipe(catchError(() => of({ data: [] as QuangTableModel[], total: 0 })))
      .subscribe((res) => {
        this.recentQuangNhap = res.data;
        this.loadingQuangNhap = false;
      });
  }

  private loadLoCaoParams(): void {
    this.loadingParams = true;
    this.locaoParamService
      .getAll()
      .pipe(catchError(() => of([] as LoCaoProcessParamModel[])))
      .subscribe((res) => {
        this.locaoParams = res.slice(0, 5);
        this.loadingParams = false;
      });
  }

  fmtDate(value?: string | null): string {
    return value ? this.vnTime.transform(value, 'dd/MM/yyyy HH:mm') : '-';
  }

  goToGangDetail(id: number): void {
    this.router.navigate(['/phoi-gang', id]);
  }
}
