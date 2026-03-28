// src/features/quiz-attempt/pages/attempt-review.component.ts

import { Component, OnInit, inject, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzModalModule, NzModalService } from "ng-zorro-antd/modal";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AttemptService } from "../attempt.service";
import { QuizService } from "../../quiz/quiz.service";
import { AuthService } from "../../auth/auth.service";
import { CommentsSectionComponent } from "../../comment/components/comments-section/comments-section.component";
import { ReportModalComponent } from "../../report/components/report-modal/report-modal.component";
import { AttemptReview } from "../attempt.model";
import { AnswerDisplayComponent } from "../components/answer-display.component";
import { QuizDto } from "../../quiz/quiz.model";

@Component({
  selector: "app-attempt-review",
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    TranslateModule,
    CommentsSectionComponent,
    ReportModalComponent,
    AnswerDisplayComponent,
  ],
  template: `
    <div *ngIf="review" class="space-y-4 pb-6" data-testid="review-container">
      <!-- Score card -->
      <nz-card class="shadow-sm" data-testid="score-card">
        <div class="text-center py-2">
          <div class="flex justify-end mb-2">
            <button
              nz-button
              nzSize="small"
              *ngIf="isAuthenticated && !isOwner()"
              (click)="openReportQuiz()"
              nzDanger
              nzGhost
              data-testid="report-quiz-button"
            >
              <i nz-icon nzType="flag"></i> Report Quiz
            </button>
          </div>
          <div
            class="text-3xl font-bold mb-1"
            [ngClass]="scoreColor()"
            data-testid="score-value"
          >
            {{ review.score }} / {{ review.maxScore }}
          </div>
          <div
            class="text-lg font-medium mb-2"
            [ngClass]="scoreColor()"
            data-testid="score-percent"
          >
            {{ scorePercent() }}%
          </div>
          <div
            class="flex items-center justify-center gap-4 text-sm text-gray-500 mb-3"
          >
            <span data-testid="correct-count"
              >{{ correctCount() }} correct</span
            >
            <span class="text-gray-300">|</span>
            <span data-testid="incorrect-count"
              >{{ incorrectCount() }} incorrect</span
            >
            <span class="text-gray-300">|</span>
            <span data-testid="completed-time">
              Completed {{ review.endTime! | date: "medium" }}
            </span>
          </div>
          <div
            class="h-2 bg-gray-100 rounded-full overflow-hidden"
            data-testid="score-progress-track"
          >
            <div
              class="h-full rounded-full transition-all"
              [ngClass]="progressBarColor()"
              [style.width]="scorePercent() + '%'"
              data-testid="score-progress-bar"
            ></div>
          </div>
        </div>
      </nz-card>

      <!-- Question cards -->
      <nz-card
        *ngFor="let ans of review.answerReview; let i = index"
        class="shadow-sm"
        [ngClass]="{
          'border-l-4 border-l-yellow-400': isFlashcard(ans),
          'border-l-4 border-l-green-500': !isFlashcard(ans) && ans.isCorrect,
          'border-l-4 border-l-red-400': !isFlashcard(ans) && !ans.isCorrect,
        }"
        [attr.data-testid]="'review-question-' + i"
        [attr.data-correct]="ans.isCorrect"
      >
        <!-- Question header -->
        <div class="flex items-start gap-2 mb-3">
          <span
            class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 mt-0.5"
            [ngClass]="{
              'bg-yellow-100 text-yellow-700': isFlashcard(ans),
              'bg-green-100 text-green-700': !isFlashcard(ans) && ans.isCorrect,
              'bg-red-100 text-red-600': !isFlashcard(ans) && !ans.isCorrect,
            }"
            [attr.data-testid]="'review-question-number-' + i"
          >
            {{ i + 1 }}
          </span>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                [ngClass]="{
                  'bg-yellow-100 text-yellow-700': isFlashcard(ans),
                  'bg-green-100 text-green-700':
                    !isFlashcard(ans) && ans.isCorrect,
                  'bg-red-100 text-red-600':
                    !isFlashcard(ans) && !ans.isCorrect,
                }"
                [attr.data-testid]="'review-question-result-' + i"
              >
                {{
                  isFlashcard(ans)
                    ? "✦ Informational"
                    : ans.isCorrect
                      ? "✓ Correct"
                      : "✗ Incorrect"
                }}
              </span>
              <span
                class="text-xs text-gray-400 capitalize"
                [attr.data-testid]="'review-question-type-' + i"
              >
                {{ getQuestionType(ans) }}
              </span>
              <button
                nz-button
                nzSize="small"
                nzType="text"
                *ngIf="isAuthenticated && !isOwner()"
                (click)="openReportQuestion(ans.quizQuestionId)"
                class="ml-auto"
                data-testid="report-question-button"
              >
                <i nz-icon nzType="flag"></i>
              </button>
            </div>
            <p
              class="text-sm font-medium text-gray-800"
              [attr.data-testid]="'review-question-content-' + i"
            >
              {{ getQuestionContent(ans) }}
            </p>
          </div>
        </div>

        <!-- Flashcard: informational -->
        <div
          *ngIf="isFlashcard(ans)"
          class="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3"
        >
          <p class="text-xs font-semibold text-yellow-700 mb-1.5">
            Flashcard content
          </p>
          <div class="flex flex-col gap-1">
            <span class="text-sm" data-testid="flashcard-review-front"
              >Front: {{ getFlashcardFront(ans) }}</span
            >
            <span
              class="text-sm text-gray-500"
              data-testid="flashcard-review-back"
              >Back: {{ getFlashcardBack(ans) }}</span
            >
          </div>
        </div>

        <!-- Incorrect scored question -->
        <div
          *ngIf="!isFlashcard(ans) && !ans.isCorrect"
          class="space-y-2 mt-3"
          [attr.data-testid]="'review-answers-incorrect-' + i"
        >
          <div
            class="rounded-lg border border-red-200 bg-red-50 p-3"
            [attr.data-testid]="'review-user-answer-' + i"
          >
            <p class="text-xs font-semibold text-red-500 mb-1.5">Your answer</p>
            <app-answer-display
              [ans]="ans"
              [userAnswer]="true"
            ></app-answer-display>
          </div>
          <div
            class="rounded-lg border border-green-200 bg-green-50 p-3"
            [attr.data-testid]="'review-correct-answer-' + i"
          >
            <p class="text-xs font-semibold text-green-600 mb-1.5">
              Correct answer
            </p>
            <app-answer-display
              [ans]="ans"
              [userAnswer]="false"
            ></app-answer-display>
          </div>
        </div>

        <!-- Correct scored question -->
        <div
          *ngIf="!isFlashcard(ans) && ans.isCorrect"
          class="mt-3 rounded-lg border border-green-200 bg-green-50 p-3"
          [attr.data-testid]="'review-user-answer-' + i"
        >
          <p class="text-xs font-semibold text-green-600 mb-1.5">Your answer</p>
          <app-answer-display
            [ans]="ans"
            [userAnswer]="true"
          ></app-answer-display>
        </div>

        <!-- Explanation -->
        <div
          *ngIf="getExplanation(ans)"
          class="mt-3 rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700"
          [attr.data-testid]="'review-explanation-' + i"
        >
          <span class="font-medium">Explanation: </span
          >{{ getExplanation(ans) }}
        </div>
      </nz-card>

      <app-comments-section
        targetType="quiz"
        [targetId]="review.quizId"
      ></app-comments-section>

      <div class="flex justify-center mt-2">
        <button
          nz-button
          nzType="primary"
          (click)="goToQuiz()"
          data-testid="back-to-quiz"
        >
          Back to Quiz
        </button>
      </div>
    </div>

    <div
      *ngIf="!review && !loading"
      class="text-center py-8 text-gray-500"
      data-testid="review-not-found"
    >
      Review not found.
    </div>

    <app-report-modal
      [(visible)]="reportModalVisible"
      [targetType]="reportTarget?.type || ''"
      [targetId]="reportTarget?.id || 0"
      [attemptId]="attemptId"
      (visibleChange)="reportModalVisible = $event"
    ></app-report-modal>
  `,
})
export class AttemptReviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private attemptService = inject(AttemptService);
  private quizService = inject(QuizService);
  private authService = inject(AuthService);
  private modalService = inject(NzModalService);

  attemptId!: number;
  review: AttemptReview | null = null;
  loading = true;
  reportModalVisible = false;
  reportTarget: { type: string; id: number } | null = null;
  currentQuiz: QuizDto | null = null;

  ngOnInit(): void {
    this.attemptId = +this.route.snapshot.params["attemptId"];
    this.loadReview();
    this.quizService.currentQuiz$.subscribe((q) => (this.currentQuiz = q));
  }

  async loadReview(): Promise<void> {
    try {
      this.review =
        (await this.attemptService
          .fetchAttemptReview(this.attemptId)
          .toPromise()) || null;
    } catch (err) {
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  get isAuthenticated(): boolean {
    return !!this.authService.currentUser;
  }

  isOwner(): boolean {
    const user = this.authService.currentUser;
    return !!this.currentQuiz && user?.id === this.currentQuiz.userId;
  }

  correctCount(): number {
    return (
      this.review?.answerReview.filter(
        (a) => !this.isFlashcard(a) && a.isCorrect,
      ).length ?? 0
    );
  }

  incorrectCount(): number {
    return (
      this.review?.answerReview.filter(
        (a) => !this.isFlashcard(a) && !a.isCorrect,
      ).length ?? 0
    );
  }

  scorePercent(): number {
    const max = this.review?.maxScore ?? 0;
    if (!max) return 0;
    return Math.round(((this.review?.score ?? 0) / max) * 100);
  }

  scoreColor(): string {
    const pct = this.scorePercent();
    if (pct >= 80) return "text-green-600";
    if (pct >= 50) return "text-yellow-500";
    return "text-red-500";
  }

  progressBarColor(): string {
    const pct = this.scorePercent();
    if (pct >= 80) return "bg-green-500";
    if (pct >= 50) return "bg-yellow-400";
    return "bg-red-400";
  }

  parseSnapshot(ans: any): any {
    try {
      return JSON.parse(ans.questionSnapshotJson);
    } catch {
      return {};
    }
  }

  isFlashcard(ans: any): boolean {
    return this.parseSnapshot(ans).type === "flashcard";
  }

  getQuestionType(ans: any): string {
    return this.parseSnapshot(ans).type?.replace(/_/g, " ") ?? "";
  }

  getQuestionContent(ans: any): string {
    const q = this.parseSnapshot(ans);
    let content: string = q.content ?? "";
    const keywords: string[] = q.metadata?.keywords ?? [];
    if (q.type === "fill_blank" && keywords.length) {
      return keywords.reduce((s, kw) => s.split(kw).join("___"), content);
    }
    return content;
  }

  getExplanation(ans: any): string {
    return this.parseSnapshot(ans).explanation ?? "";
  }

  getFlashcardFront(ans: any): string {
    const meta = this.parseSnapshot(ans).metadata ?? {};
    return meta.front ?? "—";
  }

  getFlashcardBack(ans: any): string {
    const meta = this.parseSnapshot(ans).metadata ?? {};
    return meta.back ?? "—";
  }

  goToQuiz(): void {
    this.router.navigate(["/quiz", this.review?.quizId]);
  }

  openReportQuiz(): void {
    this.reportTarget = { type: "quiz", id: this.review!.quizId };
    this.reportModalVisible = true;
  }

  openReportQuestion(quizQuestionId: number): void {
    this.reportTarget = { type: "quiz_question", id: quizQuestionId };
    this.reportModalVisible = true;
  }
}
