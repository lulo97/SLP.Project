import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // Removed NzConfigProviderComponent
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  // Using inject() as we discussed for Angular 21
  private authService = inject(AuthService);

  ngOnInit(): void {
    if (this.authService.sessionToken) {
      this.authService.fetchCurrentUser().subscribe();
    }
  }
}