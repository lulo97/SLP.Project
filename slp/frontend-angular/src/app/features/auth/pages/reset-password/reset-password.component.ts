import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzAlertModule
  ],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  public authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private message = inject(NzMessageService);

  token: string | null = null;
  form = {
    password: '',
    confirm: ''
  };
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.error = 'Invalid or missing reset token.';
    }
  }

  async handleReset(): Promise<void> {
    if (this.form.password !== this.form.confirm) {
      this.error = 'Passwords do not match';
      return;
    }
    if (this.form.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const success = await firstValueFrom(
        this.authService.confirmPasswordReset(this.token!, this.form.password)
      );
      if (success) {
        this.message.success('Password reset successful! Please login.');
        this.router.navigate(['/login']);
      } else {
        this.error = 'Invalid or expired reset token.';
      }
    } catch {
      this.error = 'Invalid or expired reset token.';
    } finally {
      this.loading = false;
    }
  }
}