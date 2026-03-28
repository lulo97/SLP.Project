import { Component, OnInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject, takeUntil, switchMap, of } from "rxjs";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzMessageService } from "ng-zorro-antd/message";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { QuizService } from "../quiz.service";
import { AuthService } from "../../auth/auth.service";
import { SourceService } from "../../source/services/source.service";
import { QuestionService } from "../../question/question.service";
import { QuizInfoCardComponent } from "../components/quiz-info-card.component";
import { NotesSectionComponent } from "../components/notes-section.component";
import { SourcesSectionComponent } from "../components/sources-section.component";
import { QuestionsSectionComponent } from "../components/questions-section.component";
import { QuizActionsCardComponent } from "../components/quiz-actions-card.component";
import { QuestionFormModalComponent } from "../components/question-form-modal.component";
import { QuestionPickerModalComponent } from "../components/question-picker-modal.component";
import { DisplayQuestion, QuizQuestion } from "../quiz.model";
import { CreateQuestionPayload } from "../../question/question.model";

@Component({
  selector: "app-quiz-edit",
  standalone: true,
  imports: [
    CommonModule,
    NzSpinModule,
    TranslateModule,
    QuizInfoCardComponent,
    NotesSectionComponent,
    SourcesSectionComponent,
    QuestionsSectionComponent,
    QuizActionsCardComponent,
    QuestionFormModalComponent,
    QuestionPickerModalComponent,
  ],
  template: `
    <div
      *ngIf="loading"
      class="text-center py-8"
      data-testid="quiz-edit-loading"
    >
      <nz-spin />
    </div>
    <div *ngIf="!loading && quiz" class="space-y-4">
      <app-quiz-info-card
        [quiz]="quiz"
        [totalQuestions]="questions.length"
      ></app-quiz-info-card>

      <app-notes-section
        [notes]="notes"
        [loading]="notesLoading"
        (add)="handleAddNote($event)"
        (edit)="handleEditNote($event)"
        (remove)="handleRemoveNote($event)"
      ></app-notes-section>

      <app-sources-section
        [sources]="sources"
        [loading]="sourcesLoading"
        [canEdit]="true"
        [readonly]="false"
        [availableSources]="availableSources"
        [availableSourcesLoading]="availableSourcesLoading"
        (attach)="handleAttachSources($event)"
        (detach)="handleDetachSource($event)"
        (view)="handleViewSource($event)"
      ></app-sources-section>

      <app-questions-section
        [questions]="questions"
        [readonly]="false"
        (add)="openQuestionModal('add')"
        (edit)="openQuestionModal('edit', $event)"
        (delete)="handleDeleteQuestion($event)"
        (insert)="openQuestionModal('insert', undefined, $event)"
        (find)="openQuestionPicker()"
      ></app-questions-section>

      <app-quiz-actions-card
        [quizId]="quizId"
        [canEdit]="true"
        (duplicate)="handleDuplicate()"
        (delete)="handleDelete()"
      ></app-quiz-actions-card>
    </div>
    <div
      *ngIf="!loading && !quiz"
      class="text-center py-8 text-gray-500"
      data-testid="quiz-not-found"
    >
      {{ "quiz.notFound" | translate }}
    </div>

    <app-question-form-modal
      [(visible)]="questionModalVisible"
      [question]="editingQuestion"
      (saved)="handleQuestionSaved($event)"
    ></app-question-form-modal>

    <app-question-picker-modal
      [(visible)]="questionPickerVisible"
      (select)="handleSelectQuestion($event)"
    ></app-question-picker-modal>
  `,
})
export class QuizEditComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizService = inject(QuizService);
  private authService = inject(AuthService);
  private sourceService = inject(SourceService);
  private questionService = inject(QuestionService);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  quizId!: number;
  quiz: any = null;
  loading = false;

  notes: any[] = [];
  notesLoading = false;
  sources: any[] = [];
  sourcesLoading = false;
  availableSources: any[] = [];
  availableSourcesLoading = false;
  questions: DisplayQuestion[] = [];

  questionModalVisible = false;
  editingQuestion: DisplayQuestion | undefined;
  insertIndex: number | undefined;
  questionPickerVisible = false;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.quizId = +params["id"];
      this.loadQuiz();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadQuiz(): void {
    this.loading = true;
    this.quizService.fetchQuizById(this.quizId);
    this.quizService.currentQuiz$
      .pipe(takeUntil(this.destroy$))
      .subscribe((quiz) => {
        this.quiz = quiz;
        if (quiz) {
          this.loadQuestions();
          this.loadNotes();
          this.loadSources();
          this.loadAvailableSources();
        }
        this.loading = false;
      });
  }

  loadQuestions(): void {
    this.quizService.fetchQuizQuestions(this.quizId).subscribe({
      next: (rawQuestions: QuizQuestion[]) => {
        this.questions = rawQuestions
          .map((q) => {
            const snapshot =
              typeof q.questionSnapshotJson === "string"
                ? JSON.parse(q.questionSnapshotJson || "{}")
                : (q.questionSnapshotJson ?? {});
            return {
              id: q.id,
              content: snapshot.content || "",
              type: snapshot.type || "",
              explanation: snapshot.explanation,
              metadata: snapshot.metadata || {},
              tags: snapshot.tags || [],
              displayOrder: q.displayOrder,
              questionSnapshotJson: q.questionSnapshotJson,
            };
          })
          .sort((a, b) => a.displayOrder - b.displayOrder);
      },
      error: () =>
        this.message.error(this.translate.instant("quiz.loadQuestionsError")),
    });
  }

  loadNotes(): void {
    this.notesLoading = true;
    this.quizService.fetchQuizNotes(this.quizId);
    this.quizService.notes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notes) => {
        this.notes = notes;
        this.notesLoading = false;
      });
  }

  loadSources(): void {
    this.sourcesLoading = true;
    this.quizService.fetchQuizSources(this.quizId);
    this.quizService.sources$
      .pipe(takeUntil(this.destroy$))
      .subscribe((sources) => {
        this.sources = sources;
        this.sourcesLoading = false;
      });
  }

  loadAvailableSources(): void {
    this.availableSourcesLoading = true;
    this.sourceService.fetchSources({});
    this.sourceService.sources$
      .pipe(takeUntil(this.destroy$))
      .subscribe((sources) => {
        this.availableSources = sources;
        this.availableSourcesLoading = false;
      });
  }

  handleAddNote(note: { title: string; content: string }): void {
    this.quizService.addNoteToQuiz(this.quizId, note).subscribe({
      next: () =>
        this.message.success(this.translate.instant("note.createSuccess")),
      error: () =>
        this.message.error(this.translate.instant("note.createError")),
    });
  }

  handleEditNote(update: { id: number; title: string; content: string }): void {
    this.quizService
      .updateNote(update.id, { title: update.title, content: update.content })
      .subscribe({
        next: () =>
          this.message.success(this.translate.instant("note.updateSuccess")),
        error: () =>
          this.message.error(this.translate.instant("note.updateError")),
      });
  }

  handleRemoveNote(noteId: number): void {
    this.quizService.removeNoteFromQuiz(this.quizId, noteId).subscribe({
      next: () =>
        this.message.success(this.translate.instant("note.deleteSuccess")),
      error: () =>
        this.message.error(this.translate.instant("note.deleteError")),
    });
  }

  handleAttachSources(sourceIds: number[]): void {
    const attachRequests = sourceIds.map((id) =>
      this.quizService.addSourceToQuiz(this.quizId, id),
    );
    Promise.all(attachRequests.map((req) => req.toPromise()))
      .then(() => {
        this.message.success(this.translate.instant("source.attachSuccess"));
      })
      .catch(() => {
        this.message.error(this.translate.instant("source.attachError"));
      });
  }

  handleDetachSource(sourceId: number): void {
    this.quizService.removeSourceFromQuiz(this.quizId, sourceId).subscribe({
      next: () =>
        this.message.success(this.translate.instant("source.detachSuccess")),
      error: () =>
        this.message.error(this.translate.instant("source.detachError")),
    });
  }

  handleViewSource(sourceId: number): void {
    this.router.navigate(["/source", sourceId]);
  }

  openQuestionModal(
    action: "add" | "edit" | "insert",
    question?: DisplayQuestion,
    index?: number,
  ): void {
    if (action === "edit" && question) {
      this.editingQuestion = question;
      this.insertIndex = undefined;
    } else if (action === "insert") {
      this.editingQuestion = undefined;
      this.insertIndex = index;
    } else {
      this.editingQuestion = undefined;
      this.insertIndex = undefined;
    }
    this.questionModalVisible = true;
  }

  openQuestionPicker(): void {
    this.questionPickerVisible = true;
  }

  handleSelectQuestion(selectedQuestion: any): void {
    const snapshot = {
      type: selectedQuestion.type,
      content: selectedQuestion.content,
      explanation: selectedQuestion.explanation,
      metadata: selectedQuestion.metadataJson
        ? JSON.parse(selectedQuestion.metadataJson)
        : {},
      tags: selectedQuestion.tags || [],
    };
    const snapshotJson = JSON.stringify(snapshot);
    const newOrder = this.questions.length
      ? Math.max(...this.questions.map((q) => q.displayOrder)) + 1
      : 1;
    this.quizService
      .createQuizQuestion(
        this.quizId,
        snapshotJson,
        newOrder,
        selectedQuestion.id,
      )
      .subscribe({
        next: (created) => {
          const newQuestion: DisplayQuestion = {
            id: created.id,
            content: snapshot.content,
            type: snapshot.type,
            explanation: snapshot.explanation,
            metadata: snapshot.metadata,
            tags: snapshot.tags,
            displayOrder: created.displayOrder,
            questionSnapshotJson: snapshotJson,
          };
          this.questions = [...this.questions, newQuestion].sort(
            (a, b) => a.displayOrder - b.displayOrder,
          );
          this.message.success(this.translate.instant("quiz.questionAdded"));
          this.questionPickerVisible = false;
        },
        error: () =>
          this.message.error(this.translate.instant("quiz.addQuestionError")),
      });
  }

  handleQuestionSaved(payload: CreateQuestionPayload): void {
    const snapshot = {
      type: payload.type,
      content: payload.content,
      explanation: payload.explanation,
      metadata: payload.metadataJson ? JSON.parse(payload.metadataJson) : {},
      tags: payload.tagNames || [],
    };
    const snapshotJson = JSON.stringify(snapshot);

    if (this.editingQuestion) {
      // Update existing
      this.quizService
        .updateQuizQuestion(
          this.editingQuestion.id,
          snapshotJson,
          this.editingQuestion.displayOrder,
        )
        .subscribe({
          next: () => {
            const idx = this.questions.findIndex(
              (q) => q.id === this.editingQuestion!.id,
            );
            if (idx !== -1) {
              this.questions[idx] = {
                ...this.questions[idx],
                ...snapshot,
                questionSnapshotJson: snapshotJson,
              };
              this.questions = [...this.questions];
            }
            this.message.success(
              this.translate.instant("quiz.questionUpdated"),
            );
            this.editingQuestion = undefined;
          },
          error: () =>
            this.message.error(
              this.translate.instant("quiz.updateQuestionError"),
            ),
        });
    } else {
      // Create new
      let newOrder: number;
      if (this.insertIndex !== undefined) {
        newOrder = this.insertIndex + 1;
        // Shift subsequent questions
        const toShift = this.questions.filter(
          (q) => q.displayOrder >= newOrder,
        );
        Promise.all(
          toShift.map((q) =>
            this.quizService
              .updateQuizQuestion(
                q.id,
                q.questionSnapshotJson,
                q.displayOrder + 1,
              )
              .toPromise(),
          ),
        )
          .then(() => {
            this.questions = this.questions.map((q) => {
              if (q.displayOrder >= newOrder) {
                return { ...q, displayOrder: q.displayOrder + 1 };
              }
              return q;
            });
            return this.quizService
              .createQuizQuestion(this.quizId, snapshotJson, newOrder)
              .toPromise();
          })
          .then((created) => {
            if (created) {
              const newQuestion: DisplayQuestion = {
                id: created.id,
                content: snapshot.content,
                type: snapshot.type,
                explanation: snapshot.explanation,
                metadata: snapshot.metadata,
                tags: snapshot.tags,
                displayOrder: created.displayOrder,
                questionSnapshotJson: snapshotJson,
              };
              this.questions = [...this.questions, newQuestion].sort(
                (a, b) => a.displayOrder - b.displayOrder,
              );
              this.message.success(
                this.translate.instant("quiz.questionCreated"),
              );
            }
          })
          .catch(() =>
            this.message.error(
              this.translate.instant("quiz.createQuestionError"),
            ),
          );
      } else {
        newOrder = this.questions.length
          ? Math.max(...this.questions.map((q) => q.displayOrder)) + 1
          : 1;
        this.quizService
          .createQuizQuestion(this.quizId, snapshotJson, newOrder)
          .subscribe({
            next: (created) => {
              const newQuestion: DisplayQuestion = {
                id: created.id,
                content: snapshot.content,
                type: snapshot.type,
                explanation: snapshot.explanation,
                metadata: snapshot.metadata,
                tags: snapshot.tags,
                displayOrder: created.displayOrder,
                questionSnapshotJson: snapshotJson,
              };
              this.questions = [...this.questions, newQuestion].sort(
                (a, b) => a.displayOrder - b.displayOrder,
              );
              this.message.success(
                this.translate.instant("quiz.questionCreated"),
              );
            },
            error: () =>
              this.message.error(
                this.translate.instant("quiz.createQuestionError"),
              ),
          });
      }
      this.insertIndex = undefined;
    }
    this.questionModalVisible = false;
  }

  handleDeleteQuestion(questionId: number): void {
    this.quizService.deleteQuizQuestion(questionId).subscribe({
      next: () => {
        this.questions = this.questions.filter((q) => q.id !== questionId);
        this.message.success(this.translate.instant("quiz.questionDeleted"));
      },
      error: () =>
        this.message.error(this.translate.instant("quiz.deleteQuestionError")),
    });
  }

  handleDuplicate(): void {
    this.quizService.duplicateQuiz(this.quizId).subscribe({
      next: (newQuiz) => {
        this.message.success(this.translate.instant("quiz.duplicateSuccess"));
        this.router.navigate(["/quiz", newQuiz.id]);
      },
      error: () =>
        this.message.error(this.translate.instant("quiz.duplicateError")),
    });
  }

  handleDelete(): void {
    this.quizService.deleteQuiz(this.quizId).subscribe({
      next: () => {
        this.message.success(this.translate.instant("quiz.deleteSuccess"));
        this.router.navigate(["/quiz"]);
      },
      error: () =>
        this.message.error(this.translate.instant("quiz.deleteError")),
    });
  }
}
