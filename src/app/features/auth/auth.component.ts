import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MaterialModule } from '../../material.module';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup;
  isSubmitting = false;
  error?: string;

  constructor() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    // If already logged in, redirect to home
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.router.navigateByUrl('/home');
    }
  }

  submitLogin() {
    if (this.loginForm.invalid || this.isSubmitting) return;
    this.error = undefined;
    this.isSubmitting = true;
    const { username, password } = this.loginForm.value;
    this.authService.login(username, password).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigateByUrl('/home');
      },
      error: (e) => {
        this.isSubmitting = false;
        this.error = (e?.error?.message) || 'Đăng nhập thất bại. Vui lòng thử lại.';
      }
    });
  }
}
