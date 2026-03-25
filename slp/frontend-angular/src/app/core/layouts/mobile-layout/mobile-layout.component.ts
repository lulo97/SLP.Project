import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { RightSidebarComponent } from '../right-sidebar/right-sidebar.component';
import { AuthService } from '../../../features/auth/auth.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-mobile-layout',
  standalone: true,
  imports: [CommonModule, NzIconModule, BreadcrumbComponent, RightSidebarComponent],
  templateUrl: './mobile-layout.component.html',
  styleUrls: ['./mobile-layout.component.scss']
})
export class MobileLayoutComponent {
  @Input() title: string = '';
  sidebarOpen = false;

  hasHeaderLeft = new BehaviorSubject<boolean>(false);

  constructor(private router: Router, private authService: AuthService) {}

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  handleLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}