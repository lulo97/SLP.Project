import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { AuthService } from './auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCardModule,
    NzAlertModule,
    NzIconModule,
  ],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  error = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService,
  ) {
    this.form = this.fb.group(
      {
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  private passwordMatchValidator(group: FormGroup): { mismatch: boolean } | null {
    return group.get('password')?.value === group.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  get passwordMismatch(): boolean {
    return (
      !!this.form.errors?.['mismatch'] &&
      !!this.form.get('confirmPassword')?.dirty
    );
  }

  async handleRegister(): Promise<void> {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => c.markAsDirty());
      if (this.passwordMismatch) {
        this.error = 'Passwords do not match';
      }
      return;
    }

    this.error = '';
    this.loading = true;

    const { username, email, password } = this.form.value;
    const success = await firstValueFrom(this.authService.register(username, email, password));
    this.loading = false;

    if (success) {
      this.message.success('Registration successful! Please check your email to verify your account.');
      this.router.navigate(['/login']);
    } else {
      this.error = 'Registration failed. Please try again.';
    }
  }
}
