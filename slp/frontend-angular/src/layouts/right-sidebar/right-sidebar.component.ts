import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzMessageService } from "ng-zorro-antd/message";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AuthService } from "../../features/auth/auth.service";
import {
  Language,
  SettingsService,
  Theme,
} from "../../services/settings.service";
import { Observable, map } from "rxjs";
import { RouterModule } from "@angular/router"; // 1. Import this
import { Router, NavigationEnd } from "@angular/router"; // Add NavigationEnd
import { filter, Subscription } from "rxjs"; // Add filter and Subscription

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
export class RightSidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

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
  private routerSubscription?: Subscription;
  constructor(
    private authService: AuthService,
    public settingsService: SettingsService,
    public translateService: TranslateService,
    private message: NzMessageService,
    private router: Router,
  ) {
    this.user$ = this.authService.user$;
    this.isAdmin$ = this.user$.pipe(map((user) => user?.role === "admin"));

    // Listen for navigation success and close the sidebar
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isOpen) {
          this.closeSidebar();
        }
      });
  }

  ngOnInit(): void {
    // sync language from settings
    this.translateService.use(this.settingsService.language());
  }
  // Clean up the subscription to prevent memory leaks
  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
  closeSidebar(): void {
    this.close.emit();
  }

  onLogoutClick(): void {
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
