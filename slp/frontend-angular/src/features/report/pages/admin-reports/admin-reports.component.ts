import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzEmptyModule } from "ng-zorro-antd/empty";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzTagModule } from "ng-zorro-antd/tag";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

import { ReportService } from "../../report.service";
import { ReportDto } from "../../report.model";

@Component({
  selector: "app-admin-reports",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzEmptyModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzTagModule,
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
  searchTerm = "";

  ngOnInit(): void {
    this.fetchReports();
  }

  fetchReports(): void {
    this.loading = true;
    this.reportService.getUnresolvedReports(this.searchTerm).subscribe({
      next: (data) => {
        this.reports = data;
      },
      error: () => {
        this.message.error(this.translate.instant("report.loadError"));
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  handleSearch(): void {
    this.fetchReports();
  }

  resolveReport(id: number): void {
    this.resolvingIds = [...this.resolvingIds, id];
    this.reportService.resolveReport(id).subscribe({
      next: () => {
        this.reports = this.reports.filter((r) => r.id !== id);
        this.message.success(this.translate.instant("report.resolveSuccess"));
      },
      error: () => {
        this.message.error(this.translate.instant("report.resolveError"));
      },
      complete: () => {
        this.resolvingIds = this.resolvingIds.filter((rid) => rid !== id);
      },
    });
  }

  deleteComment(report: ReportDto): void {
    this.reportService.deleteComment(report.targetId).subscribe({
      next: () => {
        this.message.success(
          this.translate.instant("report.deleteCommentSuccess")
        );
        this.resolveReport(report.id);
      },
      error: () => {
        this.message.error(this.translate.instant("report.deleteCommentError"));
      },
    });
  }

  disableQuiz(report: ReportDto): void {
    this.reportService.disableQuiz(report.targetId).subscribe({
      next: () => {
        this.message.success(
          this.translate.instant("report.disableQuizSuccess")
        );
        this.resolveReport(report.id);
      },
      error: () => {
        this.message.error(this.translate.instant("report.disableQuizError"));
      },
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

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}