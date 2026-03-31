import { Component } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";
import { firstValueFrom } from "rxjs";

import { NzFormModule } from "ng-zorro-antd/form";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzAlertModule } from "ng-zorro-antd/alert";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMessageService } from "ng-zorro-antd/message";
import { ChangeDetectorRef } from "@angular/core";
import { AuthService } from "./auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCardModule,
    NzAlertModule,
    NzModalModule,
    NzIconModule,
  ],
  templateUrl: "./login.component.html",
})
export class LoginComponent {
  form: FormGroup;

  usernameError = "";
  passwordError = "";
  generalError = "";

  showVerificationAlert = false;
  resending = false;

  showForgotPassword = false;
  resetEmail = "";
  resetLoading = false;

  showPassword = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      username: ["", Validators.required],
      password: ["", Validators.required],
    });
  }

  clearFieldError(field: "username" | "password"): void {
    if (field === "username") this.usernameError = "";
    else this.passwordError = "";
    this.generalError = "";
  }

  async handleLogin(): Promise<void> {
    this.usernameError = "";

    this.passwordError = "";

    this.generalError = "";

    const { username, password } = this.form.value;

    if (!username?.trim()) {
      this.usernameError = "Username is required";
      return;
    }

    if (!password) {
      this.passwordError = "Password is required";
      return;
    }

    this.loading = true;

    try {
      const result = await firstValueFrom(
        this.authService.login(username, password),
      );

      this.loading = false;
      this.cdr.detectChanges();

      if (result.success) {
        this.message.success("Login successful!");
        this.router.navigate(["/dashboard"]);
      } else {
        this.generalError = "";

        switch (result.code) {
          case "EMAIL_NOT_VERIFIED":
            this.showVerificationAlert = true;
            break;
          case "ACCOUNT_BANNED":
            this.message.error(result.message || "Account banned");
            break;
          default:
            this.generalError = "Invalid username or password";
            break;
        }
      }
    } catch (err) {
      console.error("Catch block caught error:", err);
      this.generalError = "Something went wrong. Please try again.";
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async handleForgotPassword(): Promise<void> {
    if (!this.resetEmail) {
      this.message.warning("Please enter your email");
      return;
    }
    this.resetLoading = true;
    const result = await firstValueFrom(
      this.authService.requestPasswordReset(this.resetEmail),
    );
    this.resetLoading = false;

    if (result.success) {
      this.message.success("Password reset email sent if account exists");
      this.showForgotPassword = false;
      this.resetEmail = "";
    } else {
      this.message.error(result.message || "Failed to send reset email");
    }
  }

  async resendVerification(): Promise<void> {
    this.resending = true;
    const result = await firstValueFrom(
      this.authService.sendVerificationEmail(),
    );
    this.resending = false;

    if (result.success) {
      this.message.success("Verification email sent!");
      this.showVerificationAlert = false;
    } else {
      this.message.error(result.message || "Failed to send verification email");
    }
  }
}
