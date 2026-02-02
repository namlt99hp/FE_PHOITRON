import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MaterialModule } from '../../../material.module';
import { AuthService, LoginResponse } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule, NgScrollbarModule, TablerIconsModule, MaterialModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  @Input() isCollapsed: boolean = true;
  @Output() toggleSidebar = new EventEmitter<void>();

  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleMobileFilterNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser: LoginResponse | null = null;
  userDisplayName: string = '';

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    // Ưu tiên lấy từ HoVaTen, nếu không có thì dùng TenTaiKhoan
    this.userDisplayName = this.currentUser?.HoVaTen || this.currentUser?.TenTaiKhoan || 'User';
  }

  editProfile() {
    this.router.navigate(['/quan-tri-nhan-su/profile']);
  }

  logout() {
    this.authService.logout();
  }
}
