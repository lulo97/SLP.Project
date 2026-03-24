import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NzConfigProviderComponent } from 'ng-zorro-antd/core/config';
import { AuthService } from './core/services/auth.service'; // will be created

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NzConfigProviderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Check if user is already logged in (e.g., via token)
    if (this.authService.getSessionToken()) {
      this.authService.fetchCurrentUser().subscribe();
    }
  }
}