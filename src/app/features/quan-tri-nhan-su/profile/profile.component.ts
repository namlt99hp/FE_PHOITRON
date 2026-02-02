import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginResponse } from '../../../core/services/auth.service';
import { MaterialModule } from '../../../material.module';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser: LoginResponse | null = null;
  userDisplayName: string = '';
  userEmail: string = '';
  roles: string[] = [];
  
  passwordForm: FormGroup;
  isSubmittingPassword = false;
  passwordError?: string;
  passwordSuccess?: string;

  constructor() {
    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      // If not logged in, redirect to login
      this.router.navigate(['/login']);
    } else {
      this.loadProfileData();
    }
  }

  loadProfileData() {
    if (this.currentUser) {
      this.userDisplayName = this.currentUser.HoVaTen || this.currentUser.TenTaiKhoan || 'User';
      this.userEmail = this.currentUser.TenTaiKhoan || '';
      this.roles = this.authService.getRoles();
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (!newPassword || !confirmPassword) return null;
    
    if (newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  changeAvatar() {
    // TODO: Implement avatar change functionality
    console.log('Change avatar clicked');
  }

  setNewPassword() {
    if (this.passwordForm.invalid || this.isSubmittingPassword) return;
    
    this.passwordError = undefined;
    this.passwordSuccess = undefined;
    this.isSubmittingPassword = true;
    
    const { newPassword } = this.passwordForm.value;
    
    // TODO: Call API to change password
    // For now, just simulate success
    setTimeout(() => {
      this.isSubmittingPassword = false;
      this.passwordSuccess = 'Đổi mật khẩu thành công!';
      this.passwordForm.reset();
    }, 1000);
  }

  logout() {
    this.authService.logout();
  }

  deleteAccount() {
    // TODO: Implement delete account functionality with confirmation dialog
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.')) {
      console.log('Delete account');
      // TODO: Call API to delete account
    }
  }
}

