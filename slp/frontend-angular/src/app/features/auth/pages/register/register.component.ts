import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzAlertModule,
    NzIconModule
  ],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  public authService = inject(AuthService);
  public router = inject(Router);
  private message = inject(NzMessageService);

  form = {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  loading$ = this.authService.loading$;
  error$ = this.authService.error$;

  async handleRegister(): Promise<void> {
    if (this.form.password !== this.form.confirmPassword) {
      this.message.error('Passwords do not match');
      return;
    }

    try {
      const success = await firstValueFrom(
        this.authService.register(this.form.username, this.form.email, this.form.password)
      );
      if (success) {
        this.message.success('Registration successful! Please login.');
        this.router.navigate(['/login']);
      }
    } catch {
      // Error already handled by service
    }
  }
}