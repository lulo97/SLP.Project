import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, Subscription } from "rxjs";

import { NzCardModule } from "ng-zorro-antd/card";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzFormModule } from "ng-zorro-antd/form";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzIconModule } from "ng-zorro-antd/icon";

import { AuthService, User } from "../auth/auth.service";
import { environment } from "../../environments/environment";

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzCardModule,
    NzButtonModule,
    NzSpinModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzTagModule,
    NzIconModule,
  ],
  templateUrl: "./profile.component.html",
})
export class ProfileComponent implements OnInit, OnDestroy {
  // ── User data ─────────────────────────────────────────────────────────
  user$: Observable<User | null>;
  user: User | null = null;
  private userSub?: Subscription;

  // ── Avatar ───────────────────────────────────────────────────────────
  @ViewChild("fileInput") fileInput!: ElementRef<HTMLInputElement>;
  avatarUploading = false;
  avatarDeleting = false;
  readonly MAX_SIZE = 2 * 1024 * 1024; // 2 MB

  // ── Email verification ───────────────────────────────────────────────
  sendingVerification = false;

  // ── Change password modal ────────────────────────────────────────────
  showChangePassword = false;
  passwordLoading = false;
  passwordForm: FormGroup;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private fb: FormBuilder,
    private message: NzMessageService,
    private router: Router,
  ) {
    this.user$ = this.authService.user$;
    this.passwordForm = this.fb.group(
      {
        current: ["", Validators.required],
        new: ["", [Validators.required]],
        confirm: ["", Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  ngOnInit(): void {
    // Track user changes to refresh UI after avatar updates
    this.userSub = this.user$.subscribe((user) => {
      this.user = user;
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  //---------------
  // ── Password match validator (same as Vue) ───────────────────────────
  private passwordMatchValidator(
    group: FormGroup,
  ): { mismatch: boolean } | null {
    const newPw = group.get("new")?.value;
    const confirm = group.get("confirm")?.value;
    return newPw === confirm ? null : { mismatch: true };
  }

  get passwordMismatch(): boolean {
    const confirmCtrl = this.passwordForm.get("confirm");
    return !!this.passwordForm.errors?.["mismatch"] && !!confirmCtrl?.dirty;
  }

  // ── Clear custom errors on input (matching Vue's @input) ─────────────
  clearCurrentError(): void {
    const currentCtrl = this.passwordForm.get("current");
    if (currentCtrl?.errors?.["incorrect"]) {
      // Remove the custom 'incorrect' error
      const { incorrect, ...rest } = currentCtrl.errors;
      currentCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }
  }

  clearNewError(): void {
    // Vue clears new password error on input; Angular's required error disappears automatically,
    // but we keep this for consistency (if any custom error added later)
  }

  clearConfirmError(): void {
    // Vue clears confirm error on input; Angular's mismatch error is on the group,
    // but the field's validity will update when user types.
    // Mark as dirty to re-evaluate group validator
    this.passwordForm.get("confirm")?.updateValueAndValidity();
  }

  // ── Avatar upload ────────────────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      this.message.error("Only JPEG and PNG images are allowed.");
      return;
    }
    if (file.size > this.MAX_SIZE) {
      this.message.error("Image must be smaller than 2 MB.");
      return;
    }

    this.avatarUploading = true;
    const formData = new FormData();
    formData.append("file", file);

    this.http
      .post<{
        avatarUrl: string;
      }>(`${environment.apiBackendUrl}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .subscribe({
        next: () => {
          this.message.success("Avatar updated!");
          this.authService.fetchCurrentUser().subscribe();
        },
        error: (err) => {
          const detail =
            err.error?.message ?? "Upload failed. Please try again.";
          this.message.error(detail);
        },
        complete: () => {
          this.avatarUploading = false;
          if (this.fileInput) this.fileInput.nativeElement.value = "";
        },
      });
  }

  deleteAvatar(): void {
    this.avatarDeleting = true;
    this.http.delete(`${environment.apiBackendUrl}/avatar`).subscribe({
      next: () => {
        this.message.success("Avatar removed.");
        this.authService.fetchCurrentUser().subscribe();
      },
      error: () => {
        this.message.error("Could not remove avatar. Please try again.");
      },
      complete: () => {
        this.avatarDeleting = false;
      },
    });
  }

  // ── Email verification ──────────────────────────────────────────────
  sendVerification(): void {
    this.sendingVerification = true;
    this.authService.sendVerificationEmail().subscribe({
      next: (result) => {
        if (result.success) {
          this.message.success("Verification email sent!");
        } else {
          this.message.error(
            result.message ?? "Failed to send verification email",
          );
        }
      },
      error: () => {
        this.message.error("Failed to send verification email");
      },
      complete: () => {
        this.sendingVerification = false;
      },
    });
  }

  // ── Change password modal (matching Vue logic) ──────────────────────
  openChangePassword(): void {
    this.resetPasswordForm();
    this.showChangePassword = true;
  }

  resetPasswordForm(): void {
    this.passwordForm.reset({ current: "", new: "", confirm: "" });
    this.passwordForm.markAsPristine();
    this.passwordForm.markAsUntouched();
    // Clear any custom errors
    const currentCtrl = this.passwordForm.get("current");
    if (currentCtrl?.errors?.["incorrect"]) {
      const { incorrect, ...rest } = currentCtrl.errors;
      currentCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }
  }

  handleChangePassword(): void {
    // 1. Mark everything as dirty and touched
    Object.values(this.passwordForm.controls).forEach((c) => {
      c.markAsDirty();
      c.markAsTouched();
      c.updateValueAndValidity(); // Force sync
    });

    // 2. Also update the group validity (important for the mismatch validator)
    this.passwordForm.updateValueAndValidity();

    // Front-end validation: required fields + password match
    if (this.passwordForm.invalid) {
      // The template will show error tips automatically
      console.log("Form invalid, form = ", this.passwordForm.value);
      return;
    }

    this.passwordLoading = true;
    const { current, new: newPassword } = this.passwordForm.value;

    this.authService.changePassword(current, newPassword).subscribe({
      next: (result) => {
        this.passwordLoading = false;
        if (result.success) {
          this.message.success("Password updated successfully!");
          this.showChangePassword = false;
          this.resetPasswordForm();
        } else {
          // Show the exact message from backend (like Vue)
          this.message.error(result.message ?? "Failed to change password.");
          // If error is "Current password is incorrect", set custom error on current field
          if (
            result.code === "INVALID_CURRENT_PASSWORD" &&
            result.message?.toLowerCase().includes("incorrect")
          ) {
            const currentCtrl = this.passwordForm.get("current");
            currentCtrl?.setErrors({ incorrect: true });
            currentCtrl?.markAsDirty();
          }
        }
      },
      error: () => {
        this.passwordLoading = false;
        this.message.error("Something went wrong. Please try again.");
      },
    });
  }
}
