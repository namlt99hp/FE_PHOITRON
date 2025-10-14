import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { PhuongAnPhoiService } from '../../../core/services/phuong-an-phoi.service';

@Component({
  selector: 'app-phoi-gang-summary',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule, MatTableModule, MatTooltipModule, MatTabsModule],
  templateUrl: './phoi-gang-summary.component.html',
  styleUrl: './phoi-gang-summary.component.scss',
})
export class PhoiGangSummaryComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paService = inject(PhuongAnPhoiService);

  readonly id = signal<number>(Number(this.route.snapshot.paramMap.get('id')));
  readonly maGang = signal<string>(this.route.snapshot.queryParamMap.get('ma') || '');
  
  readonly plans = signal<any[]>([]);
  readonly loading = signal<boolean>(true);
  readonly selectedTabIndex = signal<number>(0);

  ngOnInit() {
    this.loadPlans();
  }

  private loadPlans() {
    this.loading.set(true);
    this.paService.getByQuangDich(this.id()).subscribe({
      next: (res) => {
        const list = (res as any)?.data ?? [];
        this.plans.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onBack() {
    this.router.navigate(['/phoi-gang', this.id()], {
      queryParams: { ma: this.maGang() }
    });
  }

  onTabChange(index: number) {
    this.selectedTabIndex.set(index);
  }

  // Placeholder methods for summary data
  getOverallSummary() {
    // TODO: Implement overall summary logic
    return {
      totalPlans: this.plans().length,
      totalCost: 0,
      averageEfficiency: 0,
      bestPlan: null
    };
  }

  getCostSummary() {
    // TODO: Implement cost summary logic
    return [];
  }

  getEfficiencySummary() {
    // TODO: Implement efficiency summary logic
    return [];
  }

  getMaterialUsageSummary() {
    // TODO: Implement material usage summary logic
    return [];
  }

  getTrendAnalysis() {
    // TODO: Implement trend analysis logic
    return {
      costTrend: 'stable',
      efficiencyTrend: 'improving',
      recommendations: []
    };
  }
}

