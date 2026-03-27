import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { MobileLayoutComponent } from '../../../../layouts/mobile-layout/mobile-layout.component';
import { ReportService } from '../../report.service';
import { ReportDto } from '../../report.model';

@Component({
  selector: 'app-user-reports',
  standalone: true,
  imports: [
    CommonModule,
    MobileLayoutComponent,
    NzSpinModule,
    NzAlertModule,
    NzEmptyModule,
    NzCardModule,
    NzTagModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzIconModule,
    TranslateModule,
  ],
  templateUrl: './user-reports.component.html',
})
export class UserReportsComponent implements OnInit {
  private reportService = inject(ReportService);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  reports: ReportDto[] = [];
  loading = false;
  error: string | null = null;
  deletingId: number | null = null;

  ngOnInit(): void {
    this.fetchReports();
  }

  fetchReports(): void {
    this.loading = true;
    this.error = null;
    this.reportService.getMyReports().subscribe({
      next: (data) => (this.reports = data),
      error: () => (this.error = this.translate.instant('report.loadError')),
      complete: () => (this.loading = false),
    });
  }

  deleteReport(id: number): void {
    this.deletingId = id;
    this.reportService.deleteMyReport(id).subscribe({
      next: () => {
        this.reports = this.reports.filter((r) => r.id !== id);
        this.message.success(this.translate.instant('report.deleteSuccess'));
      },
      error: (err) => {
        const errorMsg = err.status === 409
          ? this.translate.instant('report.cannotDeleteResolved')
          : this.translate.instant('report.deleteError');
        this.message.error(errorMsg);
      },
      complete: () => (this.deletingId = null),
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  targetColor(type: string): string {
    const map: Record<string, string> = {
      quiz: 'blue',
      question: 'purple',
      comment: 'orange',
    };
    return map[type] || 'default';
  }
}