import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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
export class HomeComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  // Mock KPIs for blast furnace blending management
  kpis = [
    { label: 'Sản lượng gang (tấn/ngày)', value: 5850, trend: '+2.1%' },
    { label: 'Tỉ lệ quặng sống', value: '18.5%', trend: '-0.4%' },
    { label: 'Coke tiêu hao (kg/tấn)', value: 420, trend: '-5' },
    { label: 'Chi phí phối trộn (đ/tấn)', value: '1.250.000', trend: '-1.8%' },
    { label: 'PA đang tối ưu', value: 4, trend: '' },
  ];

  // Quick actions
  actions = [
    { icon: 'sliders', label: 'Tạo gang mới', click: () => this.router.navigate(['/quang-gang']) },
    { icon: 'tools', label: 'Tham số lò cao', click: () => this.router.navigate(['/locao-process-params']) },
    { icon: 'box', label: 'Danh mục quặng', click: () => this.router.navigate(['/quang']) },
    { icon: 'flask', label: 'Thành phần hóa học', click: () => this.router.navigate(['/thanh-phan-hoa-hoc']) },
    { icon: 'graph-up', label: 'Hàm thống kê', click: () => this.router.navigate(['/thongke-phuongan']) },
  ];

  // Mock recent plans
  recentPlans = [
    { name: 'PA_2025-11-04_1', coke: 418, oreLivePct: 19.0, cost: 1248000, status: 'Đang chạy' },
    { name: 'PA_2025-11-03_A', coke: 425, oreLivePct: 18.2, cost: 1260000, status: 'Đã lưu' },
    { name: 'PA_Test_LC2', coke: 415, oreLivePct: 20.1, cost: 1235000, status: 'Đang chạy' },
  ];

  // Mock furnace status
  furnaces = [
    { name: 'LC1', prod: 1950, target: 2000, temp: 1520, oreLivePct: 18.2 },
    { name: 'LC2', prod: 1920, target: 2000, temp: 1514, oreLivePct: 19.1 },
    { name: 'LC3', prod: 1980, target: 2000, temp: 1527, oreLivePct: 17.9 },
  ];

  // Mock current blend composition (top items)
  blend = [
    { ore: 'Q.Sống A', pct: 6.5, type: 'QS' },
    { ore: 'Q.Sống B', pct: 11.5, type: 'QS' },
    { ore: 'Q.Nung C', pct: 24.0, type: 'QN' },
    { ore: 'Pellet D', pct: 38.0, type: 'Pellet' },
    { ore: 'Khác', pct: 20.0, type: 'Mix' },
  ];

  // Mock ore inventory
  inventory = [
    { code: 'ORE_A', name: 'Q.Sống A', stock: 12500, days: 7.2 },
    { code: 'ORE_B', name: 'Q.Sống B', stock: 8200, days: 4.3 },
    { code: 'PEL_D', name: 'Pellet D', stock: 21000, days: 10.5 },
  ];

  // Mock quality targets vs actual
  quality = [
    { el: 'Fe', target: 55.0, actual: 54.6 },
    { el: 'SiO2', target: 5.5, actual: 5.2 },
    { el: 'Al2O3', target: 2.1, actual: 2.3 },
    { el: 'S', target: 0.035, actual: 0.038 },
  ];

  // Mock alerts/suggestions
  alerts = [
    { level: 'warning', text: 'Tồn kho Q.Sống B dưới 5 ngày. Cân nhắc giảm 1-2%.' },
    { level: 'info', text: 'PA_2025-11-04_1 giảm coke 7kg/t nếu SiO2 mix < 5.1%.' },
    { level: 'danger', text: 'Lò LC2 nhiệt độ giảm 12°C trong 1h qua.' },
  ];
}
