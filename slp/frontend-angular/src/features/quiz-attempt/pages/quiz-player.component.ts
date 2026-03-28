import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzModalModule, NzModalService } from "ng-zorro-antd/modal";
import { NzDrawerModule } from "ng-zorro-antd/drawer";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzCheckboxModule } from "ng-zorro-antd/checkbox";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { FormsModule } from "@angular/forms";
import { AttemptService } from "../attempt.service";
import { QuizService } from "../../quiz/quiz.service";
import { AuthService } from "../../auth/auth.service";
import { QuestionDisplayComponent } from "../components/question-display.component";
import { AutoSaveIndicatorComponent } from "../components/auto-save-indicator.component";
import { ReportModalComponent } from "../../report/components/report-modal/report-modal.component";
import { StartAttemptResponse, AnswerValue } from "../attempt.model";
import { QuizDto } from "../../quiz/quiz.model";

@Component({
  selector: "app-quiz-player",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzDrawerModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    NzCheckboxModule,
    TranslateModule,
    QuestionDisplayComponent,
    AutoSaveIndicatorComponent,
    ReportModalComponent,
  ],
  template: `
    <div
      class="player-container space-y-4"
      *ngIf="attempt()"
      data-testid="player-container"
    >
      <!-- Header -->
      <div
        class="flex justify-between items-center"
        data-testid="player-header"
      >
        <div>
          <span class="font-medium" data-testid="player-progress">
            Question {{ currentIndex() + 1 }} of {{ attempt()!.questionCount }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <app-auto-save-indicator
            [saving]="saving()"
          />
          <button
            nz-button
            nzSize="small"
            *ngIf="isAuthenticated && !isOwner()"
            (click)="openReportModal()"
            data-testid="report-question-button"
          >
            <i nz-icon nzType="flag"></i>
          </button>
          <button
            nz-button
            nzSize="small"
            (click)="showSidebar = true"
            data-testid="open-sidebar"
          >
            <i nz-icon nzType="menu"></i>
          </button>
        </div>
      </div>

      <!-- Question display -->
      <div
        class="bg-white rounded-lg p-4 shadow"
        data-testid="question-display"
      >
        <app-question-display
          *ngIf="currentQuestion()"
          [question]="currentQuestion()"
          [answer]="answers()[currentQuestion()!.quizQuestionId]"
          (answerChange)="onAnswerChange($event)"
        ></app-question-display>
        <div
          *ngIf="!currentQuestion()"
          class="text-center py-4 text-gray-500"
          data-testid="question-loading"
        >
          Loading question...
        </div>
      </div>

      <!-- Navigation -->
      <div
        class="flex justify-between items-start"
        data-testid="player-navigation"
      >
        <button
          nz-button
          (click)="prevQuestion()"
          [disabled]="currentIndex() === 0"
          data-testid="prev-question"
        >
          Previous
        </button>
        <button
          *ngIf="currentIndex() < attempt()!.questionCount - 1"
          nz-button
          nzType="primary"
          (click)="nextQuestion()"
          data-testid="next-question"
        >
          Next
        </button>
        <div
          *ngIf="currentIndex() === attempt()!.questionCount - 1"
          class="flex flex-col items-end gap-1"
          data-testid="submit-area"
        >
          <button
            nz-button
            nzType="primary"
            (click)="openSubmitModal()"
            [disabled]="!isComplete()"
            data-testid="submit-attempt"
          >
            Submit
          </button>
          <span
            *ngIf="!isComplete()"
            class="text-xs text-gray-400"
            data-testid="answered-count"
          >
            {{ answeredCount() }}/{{ attempt()!.questionCount }} answered
          </span>
        </div>
      </div>

      <!-- Sidebar drawer -->
      <nz-drawer
        [nzVisible]="showSidebar"
        (nzOnClose)="showSidebar = false"
        nzPlacement="right"
        nzTitle="Questions"
        data-testid="question-sidebar"
      >
        <div class="grid grid-cols-3 gap-2" data-testid="sidebar-question-grid">
          <button
            nz-button
            *ngFor="let q of attempt()!.questions; let idx = index"
            [nzType]="idx === currentIndex() ? 'primary' : 'default'"
            (click)="goToQuestion(idx); showSidebar = false"
            [attr.data-testid]="'sidebar-question-' + idx"
            [attr.data-active]="idx === currentIndex()"
          >
            {{ idx + 1 }}
          </button>
        </div>
      </nz-drawer>

      <!-- Submit modal -->
      <nz-modal
        [(nzVisible)]="submitModalVisible"
        nzTitle="Submit Quiz"
        (nzOnOk)="handleSubmit()"
        (nzOnCancel)="submitModalVisible = false"
        nzOkText="Yes, submit"
        nzCancelText="Cancel"
        data-testid="submit-modal"
      >
        <ng-template nzModalContent>
          <p data-testid="submit-modal-message">
            Are you sure you want to submit? You cannot change your answers
            after submission.
          </p>
          <p
            class="mt-2 text-sm text-gray-500"
            data-testid="submit-modal-answered-count"
          >
            Answered: {{ answeredCount() }} / {{ attempt()!.questionCount }}
          </p>
        </ng-template>
      </nz-modal>
      <!-- Report modal -->
      <app-report-modal
        *ngIf="reportQuestionId"
        [(visible)]="reportModalVisible"
        targetType="quiz_question"
        [targetId]="reportQuestionId"
        [attemptId]="attempt()!.attemptId"
        (visibleChange)="reportModalVisible = $event"
      ></app-report-modal>
    </div>

    <div
      *ngIf="!attempt() && !loading"
      class="text-center py-8 text-gray-500"
      data-testid="attempt-not-found"
    >
      Attempt not found.
    </div>

    <!-- Start options modal -->
    <nz-modal
      [(nzVisible)]="showStartModal"
      nzTitle="{{ 'quiz.startQuiz' | translate }}"
      (nzOnOk)="handleStartModalOk()"
      [nzOkText]="'common.start' | translate"
      [nzCancelText]="null"
      [nzClosable]="false"
      [nzMaskClosable]="false"
    >
      <ng-template nzModalContent>
        <div class="space-y-4 py-2" data-testid="start-options-modal">
          <p class="text-sm text-gray-500">
            {{ "quiz.chooseAttemptSettings" | translate }}
          </p>
          <label
            nz-checkbox
            [(ngModel)]="randomizeOrder"
            data-testid="randomize-order-checkbox"
          >
            {{ "quiz.shuffleOrder" | translate }}
            <span class="text-xs text-gray-400 ml-1">
              ({{ "quiz.shuffleHint" | translate }})
            </span>
          </label>
        </div>
      </ng-template>
    </nz-modal>
  `,
})
export class QuizPlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private attemptService = inject(AttemptService);
  private quizService = inject(QuizService);
  private authService = inject(AuthService);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);
  private modalService = inject(NzModalService);

  quizId!: number;
  attemptId?: number;
  attempt = signal<StartAttemptResponse | null>(null);
  currentIndex = signal<number>(0);
  answers = signal<Record<number, any>>({});
  saving = signal(false);
  loading = false;
  showSidebar = false;
  submitModalVisible = false;
  reportModalVisible = false;
  reportQuestionId: number | null = null;
  showStartModal = false;
  randomizeOrder = false;
  currentQuiz = signal<QuizDto | null>(null);

  private destroy$ = new Subject<void>();
  private debouncedSave = this.debounceSave();

  ngOnInit(): void {
    this.quizId = +this.route.snapshot.params["quizId"];
    this.attemptId = this.route.snapshot.params["attemptId"]
      ? +this.route.snapshot.params["attemptId"]
      : undefined;
    this.loadAttempt();
    this.quizService.currentQuiz$.subscribe((q) => this.currentQuiz.set(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadAttempt(): Promise<void> {
    this.loading = true;
    try {
      if (this.attemptId) {
        const existing = await this.attemptService
          .fetchAttempt(this.attemptId)
          .toPromise();
        if (!existing) return;
        // Transform to StartAttemptResponse format for consistency
        this.attempt.set({
          attemptId: existing.id,
          startTime: existing.startTime,
          questionCount: existing.questionCount,
          maxScore: existing.maxScore,
          questions: existing.answers!.map((ans) => ({
            quizQuestionId: ans.quizQuestionId,
            displayOrder: 0,
            questionSnapshotJson: ans.questionSnapshotJson,
          })),
        });
        // Load answers
        const answersMap: Record<number, any> = {};
        existing.answers!.forEach((ans) => {
          try {
            const answer = JSON.parse(ans.answerJson);
            answersMap[ans.quizQuestionId] = answer;
          } catch {}
        });
        this.answers.set(answersMap);
      } else {
        this.showStartModal = true;
      }
    } catch (err) {
      console.error(err);
      this.message.error(this.translate.instant("quiz.loadAttemptError"));
      this.router.navigate(["/quiz", this.quizId]);
    } finally {
      this.loading = false;
    }
  }

  async handleStartModalOk(): Promise<void> {
    this.showStartModal = false;
    try {
      const result = await this.attemptService
        .startAttempt(this.quizId, this.randomizeOrder)
        .toPromise();
      if (!result) return;
      this.attempt.set(result);

      // Initialize answers
      const initialAnswers: Record<number, any> = {};
      const orderingQuestions: Array<{ quizQuestionId: number; answer: any }> =
        [];

      result.questions.forEach((q) => {
        const snapshot = this.parseSnapshot(q.questionSnapshotJson);
        let answer = this.getDefaultAnswer(snapshot);

        // Đối với câu hỏi ordering: tạo đáp án đúng ngay lập tức
        if (snapshot.type === "ordering") {
          const items = snapshot.metadata?.items || [];
          const correctOrder = items
            .map((item: any) => item.order_id)
            .sort((a: number, b: number) => a - b);
          answer = { order: correctOrder };
          orderingQuestions.push({ quizQuestionId: q.quizQuestionId, answer });
        }

        initialAnswers[q.quizQuestionId] = answer;
      });

      this.answers.set(initialAnswers);

      // Lưu các đáp án mặc định của ordering xuống server
      for (const q of orderingQuestions) {
        const answerJson = JSON.stringify(q.answer);
        this.attemptService
          .submitAnswer(this.attempt()!.attemptId, q.quizQuestionId, answerJson)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            error: (err) =>
              console.error("Failed to save default ordering answer", err),
          });
      }
    } catch (err) {
      console.error(err);
      this.message.error(this.translate.instant("quiz.startAttemptError"));
      this.router.navigate(["/quiz", this.quizId]);
    }
  }

  currentQuestion = computed(() => {
    const a = this.attempt();
    if (!a) return null;
    return a.questions[this.currentIndex()] || null;
  });

  isOwner = computed(() => {
    const user = this.authService.currentUser;
    const quiz = this.currentQuiz();
    return !!quiz && user?.id === quiz.userId;
  });

  get isAuthenticated(): boolean {
    return !!this.authService.currentUser;
  }

  // Helper method để parse snapshot (dạng string hoặc object)
  private parseSnapshot(snapshot: any): any {
    if (!snapshot) return {};
    if (typeof snapshot === "string") {
      try {
        return JSON.parse(snapshot);
      } catch {
        return {};
      }
    }
    return snapshot;
  }

  getDefaultAnswer(snapshot: any): any {
    const parsed = this.parseSnapshot(snapshot);
    const type = parsed.type;
    if (type === "multiple_choice") return { selected: [] };
    if (type === "single_choice") return { selected: null };
    if (type === "true_false") return { selected: null };
    if (type === "fill_blank") return { answer: "" };
    if (type === "ordering") return { order: [] };
    if (type === "matching") return { matches: [] };
    if (type === "flashcard") return {};
    return {};
  }

  answeredCount = computed(() => {
    const a = this.attempt();
    if (!a) return 0;
    return a.questions.filter((q) => {
      const snapshot = this.parseSnapshot(q.questionSnapshotJson);
      if (snapshot.type === "flashcard") return true;
      const ans = this.answers()[q.quizQuestionId];
      if (!ans) return false;
      switch (snapshot.type) {
        case "multiple_choice":
          return Array.isArray(ans.selected) && ans.selected.length > 0;
        case "single_choice":
          return ans.selected !== null && ans.selected !== undefined;
        case "true_false":
          return ans.selected !== null && ans.selected !== undefined;
        case "fill_blank":
          return typeof ans.answer === "string" && ans.answer.trim() !== "";
        case "ordering":
          return Array.isArray(ans.order) && ans.order.length > 0;
        case "matching":
          return (
            Array.isArray(ans.matches) &&
            ans.matches.length === (snapshot.metadata?.pairs?.length ?? 0)
          );
        default:
          return true;
      }
    }).length;
  });

  isComplete = computed(() => {
    return this.answeredCount() === this.attempt()?.questionCount;
  });

  onAnswerChange(value: any): void {
    const q = this.currentQuestion();
    if (!q) return;
    const newAnswers = { ...this.answers() };
    newAnswers[q.quizQuestionId] = value;
    this.answers.set(newAnswers);
    this.debouncedSave(q.quizQuestionId, value);
  }

  private debounceSave(): (quizQuestionId: number, value: any) => void {
    let timeout: any;
    return (quizQuestionId: number, value: any) => {
      if (timeout) clearTimeout(timeout);
      this.saving.set(true);
      timeout = setTimeout(() => {
        const answerJson = JSON.stringify(value);
        this.attemptService
          .submitAnswer(this.attempt()!.attemptId, quizQuestionId, answerJson)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => this.saving.set(false),
            error: () => {
              this.saving.set(false);
              this.message.error(
                this.translate.instant("quiz.saveAnswerError"),
              );
            },
          });
      }, 1000);
    };
  }

  nextQuestion(): void {
    if (this.currentIndex() < this.attempt()!.questionCount - 1) {
      this.currentIndex.set(this.currentIndex() + 1);
    }
  }

  prevQuestion(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.set(this.currentIndex() - 1);
    }
  }

  goToQuestion(index: number): void {
    if (index >= 0 && index < this.attempt()!.questionCount) {
      this.currentIndex.set(index);
    }
  }

  openSubmitModal(): void {
    this.submitModalVisible = true;
  }

  async handleSubmit(): Promise<void> {
    this.submitModalVisible = false;
    try {
      const result = await this.attemptService
        .submitAttempt(this.attempt()!.attemptId)
        .toPromise();
      if (!result) return;
      this.message.success(this.translate.instant("quiz.submitSuccess"));
      this.router.navigate(["/quiz/attempt", result.id, "review"]);
    } catch (err) {
      this.message.error(this.translate.instant("quiz.submitError"));
    }
  }

  openReportModal(): void {
    const q = this.currentQuestion();
    if (q) {
      this.reportQuestionId = q.quizQuestionId;
      this.reportModalVisible = true;
    }
  }
}
