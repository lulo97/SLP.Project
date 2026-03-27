import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule, NzModalRef } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReportService } from '../../report.service';

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NzModalModule, NzButtonModule, NzInputModule, TranslateModule],
  templateUrl: './report-modal.component.html',
})
export class ReportModalComponent {
  private modalRef = inject(NzModalRef);
  private reportService = inject(ReportService);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  targetType = '';
  targetId = 0;
  attemptId?: number;
  reason = '';
  submitting = false;

  constructor() {
    // Data passed via modal
    if (this.modalRef.getConfig().nzData) {
      this.targetType = this.modalRef.getConfig().nzData.targetType;
      this.targetId = this.modalRef.getConfig().nzData.targetId;
      this.attemptId = this.modalRef.getConfig().nzData.attemptId;
    }
  }

  handleSubmit(): void {
    if (!this.reason.trim()) {
      this.message.warning(this.translate.instant('report.reasonRequired'));
      return;
    }

    this.submitting = true;
    this.reportService.createReport({
      targetType: this.targetType,
      targetId: this.targetId,
      reason: this.reason.trim(),
      attemptId: this.attemptId,
    }).subscribe({
      next: () => {
        this.message.success(this.translate.instant('report.submitSuccess'));
        this.modalRef.close({ success: true });
      },
      error: (err) => {
        this.message.error(err.error?.error || this.translate.instant('report.submitError'));
      },
      complete: () => (this.submitting = false),
    });
  }

  handleCancel(): void {
    this.modalRef.close();
  }
}