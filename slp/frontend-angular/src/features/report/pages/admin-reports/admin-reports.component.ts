import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { Router } from "@angular/router";

import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { NzTableModule } from "ng-zorro-antd/table";
import { NzToolTipModule } from "ng-zorro-antd/tooltip"; // use the symbol your compiler expects
import { TranslateModule, TranslateService } from "@ngx-translate/core";

import { ReportService } from "../../report.service";
import { ReportDto } from "../../report.model";

@Component({
  selector: "app-admin-reports",
  standalone: true,
  imports: [
    CommonModule,
    NzTableModule,
    NzToolTipModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzIconModule,
    TranslateModule,
  ],
  templateUrl: "./admin-reports.component.html",
})
export class AdminReportsComponent implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  reports: ReportDto[] = [];
  loading = false;
  resolvingIds: number[] = [];

  columns = [
    { title: "ID", key: "id", width: 60 },
    { title: "Reporter", key: "username" },
    { title: "Target", key: "target" },
    { title: "Reason", key: "reason" },
    { title: "Created", key: "createdAt", width: 150 },
    { title: "Actions", key: "actions", width: 260 },
  ];

  ngOnInit(): void {
    this.fetchReports();
  }

  fetchReports(): void {
    this.loading = true;

    this.reportService.getUnresolvedReports().subscribe({
      next: (data) => {
        this.reports = data;
      },
      error: () => this.message.error(this.translate.instant("report.loadError")),
      complete: () => {
        this.loading = false;
      },
    });
  }

  resolveReport(id: number): void {
    this.resolvingIds = [...this.resolvingIds, id];

    this.reportService.resolveReport(id).subscribe({
      next: () => {
        this.reports = this.reports.filter((r) => r.id !== id);
        this.message.success(this.translate.instant("report.resolveSuccess"));
      },
      error: () => this.message.error(this.translate.instant("report.resolveError")),
      complete: () => {
        this.resolvingIds = this.resolvingIds.filter((rid) => rid !== id);
      },
    });
  }

  deleteComment(report: ReportDto): void {
    this.reportService.deleteComment(report.targetId).subscribe({
      next: () => {
        this.message.success(this.translate.instant("report.deleteCommentSuccess"));
        this.resolveReport(report.id);
      },
      error: () => this.message.error(this.translate.instant("report.deleteCommentError")),
    });
  }

  disableQuiz(report: ReportDto): void {
    this.reportService.disableQuiz(report.targetId).subscribe({
      next: () => {
        this.message.success(this.translate.instant("report.disableQuizSuccess"));
        this.resolveReport(report.id);
      },
      error: () => this.message.error(this.translate.instant("report.disableQuizError")),
    });
  }

  viewTarget(report: ReportDto): void {
    switch (report.targetType) {
      case "quiz":
        this.router.navigate(["/quiz", report.targetId]);
        break;
      case "question":
        this.router.navigate(["/questions", report.targetId]);
        break;
      default:
        this.message.info(this.translate.instant("report.viewCommentHint"));
    }
  }

  truncate(text: string, length: number): string {
    return text.length > length ? `${text.slice(0, length)}…` : text;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}