import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzCardModule,
    NzSpinModule,
    NzButtonModule
  ],
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent implements OnInit {
  public authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private message = inject(NzMessageService);

  token: string | null = null;
  loading = true;
  verified = false;
  error: string | null = null;

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.error = 'Invalid verification token.';
      this.loading = false;
      return;
    }

    try {
      const success = await firstValueFrom(this.authService.verifyEmail(this.token));
      if (success) {
        this.verified = true;
        this.message.success('Email verified successfully!');
      } else {
        this.error = 'Invalid or expired verification token.';
      }
    } catch {
      this.error = 'Invalid or expired verification token.';
    } finally {
      this.loading = false;
    }
  }
}