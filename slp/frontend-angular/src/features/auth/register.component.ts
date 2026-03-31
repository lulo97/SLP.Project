import { Component, ChangeDetectorRef } from "@angular/core"; // thêm ChangeDetectorRef
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
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
  selector: "app-register",
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
  templateUrl: "./register.component.html",
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  error = "";
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService,
    private cdr: ChangeDetectorRef, // thêm ChangeDetectorRef
  ) {
    this.form = this.fb.group(
      {
        username: ["", [Validators.required]],
        email: ["", [Validators.required]],
        password: ["", [Validators.required]],
        confirmPassword: ["", Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  private passwordMatchValidator(
    group: FormGroup,
  ): { mismatch: boolean } | null {
    const password = group.get("password")?.value;
    const confirmPassword = group.get("confirmPassword")?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  get passwordMismatch(): boolean {
    return (
      !!this.form.errors?.["mismatch"] &&
      !!this.form.get("confirmPassword")?.dirty
    );
  }

  async handleRegister(): Promise<void> {
    // Reset lỗi trước
    this.error = "";

    // Validate form
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => c.markAsDirty());
      return;
    }

    this.loading = true;
    this.cdr.detectChanges(); // cập nhật UI ngay

    try {
      const { username, email, password } = this.form.value;
      const result = await firstValueFrom(
        this.authService.register(username, email, password),
      );

      // Xử lý kết quả
      if (result.success) {
        this.message.success(
          "Registration successful! Please check your email.",
        );
        await this.router.navigate(["/login"]);
      } else {
        this.error = result.message || "Registration failed. Please try again.";
      }
    } catch (err) {
      console.error("Register error:", err);
      this.error = "Something went wrong. Please try again.";
    } finally {
      // Đảm bảo loading luôn được tắt
      this.loading = false;
      this.cdr.detectChanges(); // cập nhật UI sau khi tắt loading
    }
  }
}
