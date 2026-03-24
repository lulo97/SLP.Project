import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzFormModule } from "ng-zorro-antd/form";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzAlertModule } from "ng-zorro-antd/alert";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMessageService } from "ng-zorro-antd/message";
import { AuthService } from "../../../../core/services/auth.service";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzAlertModule,
    NzModalModule,
    NzIconModule,
  ],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private message = inject(NzMessageService);

  form = {
    username: "",
    password: "",
  };
  usernameError = "";
  passwordError = "";
  showVerificationAlert = false;
  resending = false;
  showForgotPassword = false;
  resetEmail = "";
  resetLoading = false;

  loading$ = this.authService.loading$;
  error$ = this.authService.error$;

  constructor() {}

  clearFieldError(field: "username" | "password"): void {
    if (field === "username") this.usernameError = "";
    else this.passwordError = "";
  }

  async handleLogin(): Promise<void> {
    this.usernameError = "";
    this.passwordError = "";
    this.authService.clearError();

    if (!this.form.username.trim()) {
      this.usernameError = "Username is required";
      return;
    }
    if (!this.form.password) {
      this.passwordError = "Password is required";
      return;
    }

    try {
      const result = await firstValueFrom(
        this.authService.login(this.form.username, this.form.password),
      );
      if (result.success) {
        this.message.success("Login successful!");
        this.router.navigate(["/dashboard"]);
      }
    } catch (error: any) {
      if (error.code === "EMAIL_NOT_VERIFIED") {
        this.showVerificationAlert = true;
      } else if (error.code === "ACCOUNT_BANNED") {
        this.message.error(error.message, { nzDuration: 5000 });
      } else if (
        error.code === "USER_NOT_FOUND" ||
        error.code === "INVALID_PASSWORD"
      ) {
        this.passwordError = "Invalid username or password";
      } else {
        this.message.error(error.message || "Login failed");
      }
    }
  }

  async handleForgotPassword(): Promise<void> {
    if (!this.resetEmail) {
      this.message.warning("Please enter your email");
      return;
    }
    this.resetLoading = true;
    try {
      const success = await firstValueFrom(
        this.authService.requestPasswordReset(this.resetEmail),
      );
      if (success) {
        this.message.success("Password reset email sent if account exists");
        this.showForgotPassword = false;
        this.resetEmail = "";
      } else {
        this.message.error("Failed to send reset email");
      }
    } finally {
      this.resetLoading = false;
    }
  }

  async resendVerification(): Promise<void> {
    this.resending = true;
    try {
      const success = await firstValueFrom(
        this.authService.sendVerificationEmail(),
      );
      if (success) {
        this.message.success("Verification email sent!");
        this.showVerificationAlert = false;
      } else {
        this.message.error("Failed to send verification email");
      }
    } finally {
      this.resending = false;
    }
  }
}
