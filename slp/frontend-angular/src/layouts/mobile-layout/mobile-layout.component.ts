import { Component, Input, ChangeDetectorRef, NgZone } from "@angular/core";
import { CommonModule, AsyncPipe, NgTemplateOutlet } from "@angular/common";
import { Router, RouterOutlet } from "@angular/router";
import { NzIconModule } from "ng-zorro-antd/icon";
import { BreadcrumbComponent } from "../../components/breadcrumb/breadcrumb.component";
import { RightSidebarComponent } from "../right-sidebar/right-sidebar.component";
import { AuthService } from "../../features/auth/auth.service";
import { MobileHeaderService } from "./mobile-header.service";

@Component({
  selector: "app-mobile-layout",
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    NgTemplateOutlet,
    NzIconModule,
    BreadcrumbComponent,
    RightSidebarComponent,
    RouterOutlet,
  ],
  templateUrl: "./mobile-layout.component.html",
  styleUrls: ["./mobile-layout.component.scss"],
})
export class MobileLayoutComponent {
  @Input() title: string = "";
  sidebarOpen = false;
  header$;

  constructor(
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private mobileHeaderService: MobileHeaderService,
  ) {
    this.header$ = this.mobileHeaderService.header$;
  }

  toggleSidebar(): void {
    this.ngZone.run(() => {
      this.sidebarOpen = !this.sidebarOpen;
      this.cdr.markForCheck();
    });
  }

  handleCloseSidebar(): void {
    this.sidebarOpen = false;
    this.cdr.detectChanges();
  }

  handleLogout(): void {
    this.authService.logout();
    this.router.navigate(["/login"]);
  }
}
