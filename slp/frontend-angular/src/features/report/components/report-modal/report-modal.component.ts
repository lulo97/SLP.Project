import { Component, EventEmitter, inject, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzMessageService } from "ng-zorro-antd/message";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { ReportService } from "../../report.service";

@Component({
  selector: "app-report-modal",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzButtonModule,
    NzInputModule,
    TranslateModule,
  ],
  templateUrl: "./report-modal.component.html",
})
export class ReportModalComponent {
  private reportService = inject(ReportService);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  // Inputs for parent binding
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() targetType!: string;
  @Input() targetId!: string | number;
  @Input() attemptId?: number;

  // Local state
  reason = "";
  submitting = false;

  // Submit report
  handleSubmit(): void {
    if (!this.reason.trim()) {
      this.message.warning(this.translate.instant("report.reasonRequired"));
      return;
    }

    this.submitting = true;

    this.reportService
      .createReport({
        targetType: this.targetType,
        targetId: Number(this.targetId), // ensure correct type
        reason: this.reason.trim(),
        attemptId: this.attemptId,
      })
      .subscribe({
        next: () => {
          this.message.success(this.translate.instant("report.submitSuccess"));
          this.closeModal();
        },
        error: (err) => {
          this.message.error(
            err.error?.error || this.translate.instant("report.submitError"),
          );
        },
        complete: () => (this.submitting = false),
      });
  }

  handleCancel(): void {
    this.closeModal();
  }

  private closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.reason = ""; 
  }
}
