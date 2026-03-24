import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzMenuModule, NzModalModule, NzButtonModule, TranslateModule],
  templateUrl: './right-sidebar.component.html',
  styleUrls: ['./right-sidebar.component.scss']
})
export class RightSidebarComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  user$: Observable<any>;
  isAdmin$: Observable<boolean>;
  sendingVerification = false;
  settingsVisible = false;

  themeOptions = [
    { value: 'light', label: 'settings.themeLight', icon: 'sun' },
    { value: 'dark', label: 'settings.themeDark', icon: 'moon' }
  ];
  languageOptions = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' }
  ];

  constructor(
    private authService: AuthService,
    private settingsService: SettingsService,
    private translateService: TranslateService,
    private message: NzMessageService,
    private router: Router
  ) {
    this.user$ = this.authService.currentUser$;
    this.isAdmin$ = this.user$.pipe(map(user => user?.role === 'admin'));
  }

  ngOnInit(): void {
    // sync language from settings
    this.translateService.use(this.settingsService.language);
  }

  closeSidebar(): void {
    this.close.emit();
  }

  logout(): void {
    this.authService.logout();
    this.logout.emit();
    this.closeSidebar();
  }

  openSettings(): void {
    this.settingsVisible = true;
  }

  sendVerification(): void {
    this.sendingVerification = true;
    this.authService.sendVerificationEmail().subscribe({
      next: () => {
        this.message.success(this.translateService.instant('auth.verificationEmailSent'));
        this.sendingVerification = false;
      },
      error: () => {
        this.message.error(this.translateService.instant('common.error'));
        this.sendingVerification = false;
      }
    });
  }

  changeLanguage(lang: string): void {
    this.settingsService.setLanguage(lang);
    this.translateService.use(lang);
  }
}