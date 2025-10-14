import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PhuongAnPhoiService } from '../../../core/services/phuong-an-phoi.service';

@Component({
  selector: 'app-phoi-gang-compare',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule, MatTableModule, MatTooltipModule],
  templateUrl: './phoi-gang-compare.component.html',
  styleUrl: './phoi-gang-compare.component.scss',
})
export class PhoiGangCompareComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paService = inject(PhuongAnPhoiService);

  readonly id = signal<number>(Number(this.route.snapshot.paramMap.get('id')));
  readonly maGang = signal<string>(this.route.snapshot.queryParamMap.get('ma') || '');
  
  readonly plans = signal<any[]>([]);
  readonly loading = signal<boolean>(true);
  // Thiêu Kết matrix
  readonly comparisonDataThieuKet = signal<any[]>([]);
  readonly allOresThieuKet = signal<string[]>([]);
  // Lò Cao matrix
  readonly comparisonDataLoCao = signal<any[]>([]);
  readonly allOresLoCao = signal<string[]>([]);
  readonly planColumns = signal<string[]>([]);

  ngOnInit() {
    this.loadPlans();
  }

  private loadPlans() {
    this.loading.set(true);
    
    // Mock plans data for demonstration
    const mockPlans = [
      { id: 1, ten_Phuong_An: 'PA0', ngay_Tinh_Toan: '2024-01-01' },
      { id: 2, ten_Phuong_An: 'PA1-5% AC+ BRBF', ngay_Tinh_Toan: '2024-01-02' },
      { id: 3, ten_Phuong_An: 'PA2 4% AC+ VC', ngay_Tinh_Toan: '2024-01-03' },
      { id: 4, ten_Phuong_An: 'PA3 4% AC+ TNK', ngay_Tinh_Toan: '2024-01-04' },
      { id: 5, ten_Phuong_An: 'PA4-6% AC+ Arcelo', ngay_Tinh_Toan: '2024-01-05' },
      { id: 6, ten_Phuong_An: 'PA5 6% AC+ Samarco', ngay_Tinh_Toan: '2024-01-06' },
      { id: 7, ten_Phuong_An: 'PA6 6% AC+ Tacora', ngay_Tinh_Toan: '2024-01-07' },
      { id: 8, ten_Phuong_An: 'PA7 6% AC+ Champion', ngay_Tinh_Toan: '2024-01-08' }
    ];

    this.plans.set(mockPlans);
    this.prepareComparisonDataFor('ThieuKet', mockPlans);
    this.prepareComparisonDataFor('LoCao', mockPlans);
    this.loading.set(false);

    // Uncomment below to use real API
    /*
    this.paService.getByQuangDich(this.id()).subscribe({
      next: (res) => {
        const list = (res as any)?.data ?? [];
        this.plans.set(list);
        this.prepareComparisonData(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
    */
  }

  private prepareComparisonDataFor(milestone: 'ThieuKet' | 'LoCao', plans: any[]) {
    // Mock data based on milestone
    const mockOres = this.getMockOresByMilestone(milestone);

    const mockPlans = [
      'PA0',
      'PA1-5% AC+ BRBF',
      'PA2 4% AC+ VC',
      'PA3 4% AC+ TNK',
      'PA4-6% AC+ Arcelo',
      'PA5 6% AC+ Samarco',
      'PA6 6% AC+ Tacora',
      'PA7 6% AC+ Champion'
    ];

    // Mock ratio data based on milestone
    const mockRatios = this.getMockRatiosByMilestone(milestone);

    // Set mock data
    this.planColumns.set(mockPlans);
    if (milestone === 'ThieuKet') {
      this.allOresThieuKet.set(mockOres);
    } else {
      this.allOresLoCao.set(mockOres);
    }

    // Prepare comparison data matrix
    const comparisonMatrix = mockOres.map(oreName => {
      const row: any = { ore: oreName };
      mockPlans.forEach(planName => {
        row[planName] = mockRatios[oreName][planName] || 0;
      });
      return row;
    });

    if (milestone === 'ThieuKet') {
      this.comparisonDataThieuKet.set(comparisonMatrix);
    } else {
      this.comparisonDataLoCao.set(comparisonMatrix);
    }
  }

  onBack() {
    this.router.navigate(['/phoi-gang', this.id()], {
      queryParams: { ma: this.maGang() }
    });
  }

  // Helper methods for template
  getComparisonDataThieuKet() { return this.comparisonDataThieuKet(); }
  getComparisonDataLoCao() { return this.comparisonDataLoCao(); }

  getOreRatio(row: any, planName: string): number {
    return row[planName] || 0;
  }

  formatRatio(ratio: number): string {
    return ratio > 0 ? `${ratio}%` : '-';
  }

  getUnitFor(name: string): string {
    // Simple unit heuristics for mock
    const percentList = [
      'Cám Marampa','Arcelormittal','Champion','Samaco','Tacora','Ai Cập 52 Hongrun','Cám Khumani',
      'BRBF - Vale','Pilbara','FB','Thổ Nhĩ Kỳ','Quặng thiêu kết','Vê viên sản xuất','Vê viên 40% Tacora',
      'Vê viên 30% Samaco','Vê viên 40% Champion','Vê viên 40% Arcelormittal','Cỡ Pilbara'
    ];
    const kgList = ['Coke 25-80','Coke 10-25','Than phun'];
    if (percentList.includes(name)) return '%';
    if (kgList.includes(name)) return 'kg/tsp';
    return '';
  }

  getMockCost(planName: string): number {
    // Mock cost data based on plan
    const mockCosts: { [plan: string]: number } = {
      'PA0': 15000000,
      'PA1-5% AC+ BRBF': 15200000,
      'PA2 4% AC+ VC': 14800000,
      'PA3 4% AC+ TNK': 15100000,
      'PA4-6% AC+ Arcelo': 15300000,
      'PA5 6% AC+ Samarco': 14900000,
      'PA6 6% AC+ Tacora': 14700000,
      'PA7 6% AC+ Champion': 15400000
    };
    return mockCosts[planName] || 15000000;
  }

  // Milestone-specific data methods
  getMockOresByMilestone(milestone: 'ThieuKet' | 'LoCao'): string[] {
    if (milestone === 'ThieuKet') {
      return [
        'Cám Marampa',
        'Arcelormittal', 
        'Champion',
        'Samaco',
        'Tacora',
        'Ai Cập 52 Hongrun',
        'Cám Khumani',
        'BRBF - Vale',
        'Pilbara',
        'FB',
        'Thổ Nhĩ Kỳ'
      ];
    } else {
      return [
        'Quặng thiêu kết',
        'Vê viên sản xuất',
        'Vê viên 40% Tacora',
        'Vê viên 30% Samaco',
        'Vê viên 40% Champion',
        'Vê viên 40% Arcelormittal',
        'Cỡ Pilbara',
        'Coke 25-80',
        'Coke 10-25',
        'Than phun'
      ];
    }
  }

  getMockRatiosByMilestone(milestone: 'ThieuKet' | 'LoCao'): { [ore: string]: { [plan: string]: number } } {
    if (milestone === 'ThieuKet') {
      return {
        'Cám Marampa': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 0, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 0, 'PA7 6% AC+ Champion': 0
        },
        'Arcelormittal': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 0, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 0, 'PA7 6% AC+ Champion': 0
        },
        'Champion': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 0, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 0, 'PA7 6% AC+ Champion': 0
        },
        'Samaco': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 0, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 0, 'PA7 6% AC+ Champion': 0
        },
        'Tacora': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 0, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 0, 'PA7 6% AC+ Champion': 0
        },
        'Ai Cập 52 Hongrun': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 0, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 0, 'PA7 6% AC+ Champion': 0
        },
        'Cám Khumani': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 0, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 0, 'PA7 6% AC+ Champion': 0
        },
        'BRBF - Vale': {
          'PA0': 45, 'PA1-5% AC+ BRBF': 50, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 0, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 0, 'PA7 6% AC+ Champion': 0
        },
        'Pilbara': {
          'PA0': 25, 'PA1-5% AC+ BRBF': 20, 'PA2 4% AC+ VC': 25, 'PA3 4% AC+ TNK': 25,
          'PA4-6% AC+ Arcelo': 25, 'PA5 6% AC+ Samarco': 25, 'PA6 6% AC+ Tacora': 25, 'PA7 6% AC+ Champion': 25
        },
        'FB': {
          'PA0': 30, 'PA1-5% AC+ BRBF': 30, 'PA2 4% AC+ VC': 30, 'PA3 4% AC+ TNK': 30,
          'PA4-6% AC+ Arcelo': 30, 'PA5 6% AC+ Samarco': 30, 'PA6 6% AC+ Tacora': 30, 'PA7 6% AC+ Champion': 30
        },
        'Thổ Nhĩ Kỳ': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 45, 'PA3 4% AC+ TNK': 45,
          'PA4-6% AC+ Arcelo': 45, 'PA5 6% AC+ Samarco': 45, 'PA6 6% AC+ Tacora': 45, 'PA7 6% AC+ Champion': 45
        }
      };
    } else {
      return {
        'Quặng thiêu kết': {
          'PA0': 75, 'PA1-5% AC+ BRBF': 75, 'PA2 4% AC+ VC': 75, 'PA3 4% AC+ TNK': 75,
          'PA4-6% AC+ Arcelo': 75, 'PA5 6% AC+ Samarco': 75, 'PA6 6% AC+ Tacora': 75, 'PA7 6% AC+ Champion': 75
        },
        'Vê viên sản xuất': {
          'PA0': 12, 'PA1-5% AC+ BRBF': 12, 'PA2 4% AC+ VC': 12, 'PA3 4% AC+ TNK': 12,
          'PA4-6% AC+ Arcelo': 12, 'PA5 6% AC+ Samarco': 12, 'PA6 6% AC+ Tacora': 12, 'PA7 6% AC+ Champion': 12
        },
        'Vê viên 40% Tacora': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 0, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 13, 'PA7 6% AC+ Champion': 0
        },
        'Vê viên 30% Samaco': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 12, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 0, 'PA7 6% AC+ Champion': 0
        },
        'Vê viên 40% Champion': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 0, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 0, 'PA7 6% AC+ Champion': 13
        },
        'Vê viên 40% Arcelormittal': {
          'PA0': 0, 'PA1-5% AC+ BRBF': 0, 'PA2 4% AC+ VC': 0, 'PA3 4% AC+ TNK': 0,
          'PA4-6% AC+ Arcelo': 0, 'PA5 6% AC+ Samarco': 0, 'PA6 6% AC+ Tacora': 0, 'PA7 6% AC+ Champion': 0
        },
        'Cỡ Pilbara': {
          'PA0': 12, 'PA1-5% AC+ BRBF': 12, 'PA2 4% AC+ VC': 12, 'PA3 4% AC+ TNK': 12,
          'PA4-6% AC+ Arcelo': 12, 'PA5 6% AC+ Samarco': 12, 'PA6 6% AC+ Tacora': 12, 'PA7 6% AC+ Champion': 12
        },
        'Coke 25-80': {
          'PA0': 348, 'PA1-5% AC+ BRBF': 350, 'PA2 4% AC+ VC': 345, 'PA3 4% AC+ TNK': 349,
          'PA4-6% AC+ Arcelo': 352, 'PA5 6% AC+ Samarco': 346, 'PA6 6% AC+ Tacora': 344, 'PA7 6% AC+ Champion': 353
        },
        'Coke 10-25': {
          'PA0': 25, 'PA1-5% AC+ BRBF': 25, 'PA2 4% AC+ VC': 25, 'PA3 4% AC+ TNK': 25,
          'PA4-6% AC+ Arcelo': 25, 'PA5 6% AC+ Samarco': 25, 'PA6 6% AC+ Tacora': 25, 'PA7 6% AC+ Champion': 25
        },
        'Than phun': {
          'PA0': 120, 'PA1-5% AC+ BRBF': 120, 'PA2 4% AC+ VC': 120, 'PA3 4% AC+ TNK': 120,
          'PA4-6% AC+ Arcelo': 120, 'PA5 6% AC+ Samarco': 120, 'PA6 6% AC+ Tacora': 120, 'PA7 6% AC+ Champion': 120
        }
      };
    }
  }

  // No milestone toggle; both sections are shown
}
