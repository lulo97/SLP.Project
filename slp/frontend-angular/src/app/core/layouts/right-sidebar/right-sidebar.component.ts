import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzMessageService } from "ng-zorro-antd/message";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AuthService } from "../../services/auth.service";
import { Language, SettingsService, Theme } from "../../services/settings.service";
import { Observable, map } from "rxjs";
import { RouterModule } from "@angular/router"; // 1. Import this

@Component({
  selector: "app-right-sidebar",
  standalone: true,
  imports: [
    CommonModule,
    NzIconModule,
    NzMenuModule,
    NzModalModule,
    NzButtonModule,
    TranslateModule,
    RouterModule,
  ],
  templateUrl: "./right-sidebar.component.html",
  styleUrls: ["./right-sidebar.component.scss"],
})
export class RightSidebarComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() onLogout = new EventEmitter<void>();

  user$: Observable<any>;
  isAdmin$: Observable<boolean>;
  sendingVerification = false;
  settingsVisible = false;

  // Explicitly type the array so the 'value' is seen as Theme, not just string
  themeOptions: { value: Theme; label: string; icon: string }[] = [
    { value: "light", label: "settings.themeLight", icon: "sun" },
    { value: "dark", label: "settings.themeDark", icon: "moon" },
  ];

  // Do the same for languageOptions to prevent the next error!
  languageOptions: { value: Language; label: string; flag: string }[] = [
    { value: "en", label: "English", flag: "🇬🇧" },
    { value: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  ];

  constructor(
    private authService: AuthService,
    public settingsService: SettingsService,
    public translateService: TranslateService,
    private message: NzMessageService,
    private router: Router,
  ) {
    this.user$ = this.authService.user$;
    this.isAdmin$ = this.user$.pipe(map((user) => user?.role === "admin"));
  }

  ngOnInit(): void {
    // sync language from settings
    this.translateService.use(this.settingsService.language());
  }

  closeSidebar(): void {
    this.close.emit();
  }

  logout(): void {
    this.authService.logout();
    this.onLogout.emit();
    this.closeSidebar();
  }

  openSettings(): void {
    this.settingsVisible = true;
  }

  sendVerification(): void {
    this.sendingVerification = true;
    this.authService.sendVerificationEmail().subscribe({
      next: () => {
        this.message.success(
          this.translateService.instant("auth.verificationEmailSent"),
        );
        this.sendingVerification = false;
      },
      error: () => {
        this.message.error(this.translateService.instant("common.error"));
        this.sendingVerification = false;
      },
    });
  }

  changeLanguage(lang: Language): void {
    this.settingsService.setLanguage(lang);
    this.translateService.use(lang);
  }
}
