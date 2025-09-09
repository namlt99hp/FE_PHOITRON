import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { AppSalesOverviewComponent } from '../../shared/components/sales-overview/sales-overview.component';
import { AppYearlyBreakupComponent } from '../../shared/components/yearly-breakup/yearly-breakup.component';
import { AppMonthlyEarningsComponent } from '../../shared/components/monthly-earnings/monthly-earnings.component';
import { AppRecentTransactionsComponent } from '../../shared/components/recent-transactions/recent-transactions.component';
import { AppProductPerformanceComponent } from '../../shared/components/product-performance/product-performance.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    AppSalesOverviewComponent,
    AppYearlyBreakupComponent,
    AppMonthlyEarningsComponent,
    AppRecentTransactionsComponent,
    AppProductPerformanceComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HomeComponent {
  user?: string;

  private auth = inject(AuthService);
  status = signal<{ ok: boolean; name?: string }>({ ok: false });
  apiBase =
    location.hostname === 'localhost'
      ? 'https://localhost:44333'
      : 'https://report.hoaphatdungquat.vn';

  ngOnInit() {
    this.check();
  }

  check() {
    // this.auth.me().subscribe(s => this.status.set(s));
  }
  login() {
    this.auth.gotoLogin();
  }
  logout() {
    this.auth.logoutMvc();
  }
}
