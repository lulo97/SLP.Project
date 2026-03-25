import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzMessageService } from 'ng-zorro-antd/message';

import { AuthService } from './auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NzCardModule,
    NzSpinModule,
    NzButtonModule,
    NzIconModule,
    NzResultModule,
  ],
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent implements OnInit {
  loading = true;
  verified = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private authService: AuthService,
    private message: NzMessageService,
  ) {}

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.error = 'Invalid verification token.';
      this.loading = false;
      return;
    }

    const success = await firstValueFrom(this.authService.verifyEmail(token));
    this.loading = false;

    if (success) {
      this.verified = true;
      this.message.success('Email verified successfully!');
    } else {
      this.error = 'Invalid or expired verification token.';
    }
  }
}
