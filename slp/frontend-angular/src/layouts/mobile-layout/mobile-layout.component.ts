import { Component, Input, ChangeDetectorRef, NgZone } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { NzIconModule } from "ng-zorro-antd/icon";
import { BreadcrumbComponent } from "../../components/breadcrumb/breadcrumb.component";
import { RightSidebarComponent } from "../right-sidebar/right-sidebar.component";
import { AuthService } from "../../features/auth/auth.service";
import { BehaviorSubject } from "rxjs";

@Component({
  selector: "app-mobile-layout",
  standalone: true,
  imports: [
    CommonModule,
    NzIconModule,
    BreadcrumbComponent,
    RightSidebarComponent,
  ],
  templateUrl: "./mobile-layout.component.html",
  styleUrls: ["./mobile-layout.component.scss"],
})
export class MobileLayoutComponent {
  @Input() title: string = "";
  sidebarOpen = false;

  hasHeaderLeft = new BehaviorSubject<boolean>(false);

  constructor(
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef, // ← inject
    private ngZone: NgZone, // Inject NgZone
  ) {}

  toggleSidebar(): void {
    // Wrapping in run() ensures the UI updates immediately even if
    // triggered by an event outside the standard Angular context
    this.ngZone.run(() => {
      this.sidebarOpen = !this.sidebarOpen;
      this.cdr.markForCheck();
    });
  }

  handleCloseSidebar(): void {
    this.sidebarOpen = false;
    this.cdr.detectChanges(); // This forces the UI to notice 'sidebarOpen' is now false
  }

  handleLogout(): void {
    this.authService.logout(); // This should trigger your API call
    this.router.navigate(["/login"]);
  }
}
