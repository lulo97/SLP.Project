import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";
import { firstValueFrom } from "rxjs";

import { NzFormModule } from "ng-zorro-antd/form";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzAlertModule } from "ng-zorro-antd/alert";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMessageService } from "ng-zorro-antd/message";

import { AuthService } from "./auth.service";

@Component({
  selector: "app-reset-password",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCardModule,
    NzAlertModule,
    NzIconModule,
  ],
  templateUrl: "./reset-password.component.html",
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = "";
  token = "";
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private message: NzMessageService,
  ) {
    this.form = this.fb.group(
      {
        password: ["", [Validators.required, Validators.minLength(6)]],
        confirm: ["", Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get("token") || "";
    if (!this.token) {
      this.error = "Invalid or missing reset token.";
    }
  }

  private passwordMatchValidator(
    group: FormGroup,
  ): { mismatch: boolean } | null {
    return group.get("password")?.value === group.get("confirm")?.value
      ? null
      : { mismatch: true };
  }

  get passwordMismatch(): boolean {
    return (
      !!this.form.errors?.["mismatch"] && !!this.form.get("confirm")?.dirty
    );
  }

  async handleReset(): Promise<void> {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => c.markAsDirty());
      return;
    }

    this.error = "";
    this.loading = true;

    const result = await firstValueFrom(
      this.authService.confirmPasswordReset(
        this.token,
        this.form.value.password,
      ),
    );
    this.loading = false;

    if (result.success) {
      this.message.success("Password reset successful! Please login.");
      this.router.navigate(["/login"]);
    } else {
      this.error =
        result.message ||
        "Invalid or expired reset token. Please request a new one.";
    }
  }
}
