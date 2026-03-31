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
        new: ["", [Validators.required, ]],
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

  // ── Password match validator ────────────────────────────────────────
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

  // ── Avatar upload ────────────────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Client-side validation
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
      .post<{ avatarUrl: string }>(
        `${environment.apiBackendUrl}/avatar`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      )
      .subscribe({
        next: () => {
          this.message.success("Avatar updated!");
          // Refresh user data to get the new avatarUrl
          this.authService.fetchCurrentUser().subscribe();
        },
        error: (err) => {
          const detail =
            err.error?.message ?? "Upload failed. Please try again.";
          this.message.error(detail);
        },
        complete: () => {
          this.avatarUploading = false;
          // Reset file input so the same file can be reselected
          if (this.fileInput) this.fileInput.nativeElement.value = "";
        },
      });
  }

  deleteAvatar(): void {
    this.avatarDeleting = true;
    this.http.delete(`${environment.apiBackendUrl}/avatar`).subscribe({
      next: () => {
        this.message.success("Avatar removed.");
        // Refresh user data
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

  // ── Change password modal ───────────────────────────────────────────
  openChangePassword(): void {
    this.resetPasswordForm();
    this.showChangePassword = true;
  }

  resetPasswordForm(): void {
    this.passwordForm.reset({ current: "", new: "", confirm: "" });
    this.passwordForm.markAsPristine();
    this.passwordForm.markAsUntouched();
  }

  handleChangePassword(): void {
    // Mark all fields as touched to trigger validation messages
    Object.values(this.passwordForm.controls).forEach((c) => c.markAsDirty());

    if (this.passwordForm.invalid) return;

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
          // Map API error codes to the relevant field
          switch (result.code) {
            case "INVALID_CURRENT_PASSWORD":
              this.passwordForm.get("current")?.setErrors({ incorrect: true });
              this.passwordForm.get("current")?.markAsDirty();
              this.message.error("Current password is incorrect.");
              break;
            case "WEAK_PASSWORD":
              this.passwordForm.get("new")?.setErrors({ weak: true });
              this.passwordForm.get("new")?.markAsDirty();
              this.message.error(result.message ?? "Password is too weak.");
              break;
            default:
              this.message.error(
                result.message ?? "Failed to change password.",
              );
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
