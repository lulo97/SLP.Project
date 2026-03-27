

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap, of } from 'rxjs';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QuizService } from '../quiz.service';
import { AuthService } from '../../auth/auth.service';
import { SourceService } from '../../source/services/source.service';
import { QuestionService } from '../../question/question.service';
import { QuizInfoCardComponent } from '../components/quiz-info-card.component';
import { NotesSectionComponent } from '../components/notes-section.component';
import { SourcesSectionComponent } from '../components/sources-section.component';
import { QuestionsSectionComponent } from '../components/questions-section.component';
import { QuizActionsCardComponent } from '../components/quiz-actions-card.component';
// import { CommentsSectionComponent } from '../../comment/components/comments-section.component';
// import { ReportModalComponent } from '../components/report-modal.component';
import { DisplayQuestion, QuizQuestion } from '../quiz.model';

@Component({
  selector: 'app-quiz-detail',
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
    // CommentsSectionComponent,
    // ReportModalComponent,
  ],
  template: `
    <div *ngIf="loading" class="text-center py-8" data-testid="quiz-detail-loading">
      <nz-spin />
    </div>
    <div *ngIf="!loading && quiz" class="space-y-4">
      <app-quiz-info-card [quiz]="quiz" [totalQuestions]="questions.length"></app-quiz-info-card>

      <!-- Report button (only for authenticated users) -->
      <div *ngIf="isAuthenticated && !isOwner" class="flex justify-end">
        <button nz-button nzDanger (click)="reportModalVisible = true" data-testid="report-quiz-button">
          <i nz-icon nzType="flag"></i> {{ 'quiz.reportQuiz' | translate }}
        </button>
      </div>

      <app-notes-section
        *ngIf="isOwner"
        [notes]="notes"
        [loading]="notesLoading"
        (add)="handleAddNote($event)"
        (edit)="handleEditNote($event)"
        (remove)="handleRemoveNote($event)"
      ></app-notes-section>

      <app-sources-section
        [sources]="sources"
        [loading]="sourcesLoading"
        [canEdit]="isOwner"
        [readonly]="!isOwner"
        [availableSources]="availableSources"
        [availableSourcesLoading]="availableSourcesLoading"
        (attach)="handleAttachSources($event)"
        (detach)="handleDetachSource($event)"
        (view)="handleViewSource($event)"
      ></app-sources-section>

      <app-questions-section
        [questions]="questions"
        [readonly]="true"
      ></app-questions-section>

      <!-- <app-comments-section targetType="quiz" [targetId]="quizId"></app-comments-section> -->

      <app-quiz-actions-card
        *ngIf="isOwner"
        [quizId]="quizId"
        [canEdit]="true"
        (duplicate)="handleDuplicate()"
        (delete)="handleDelete()"
      ></app-quiz-actions-card>
    </div>
    <div *ngIf="!loading && !quiz" class="text-center py-8 text-gray-500" data-testid="quiz-not-found">
      {{ 'quiz.notFound' | translate }}
    </div>

    <!-- <app-report-modal
      [(visible)]="reportModalVisible"
      targetType="quiz"
      [targetId]="quizId"
    ></app-report-modal> -->
  `,
})
export class QuizDetailComponent implements OnInit, OnDestroy {
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
  isAuthenticated = false;
  isOwner = false;

  notes: any[] = [];
  notesLoading = false;
  sources: any[] = [];
  sourcesLoading = false;
  availableSources: any[] = [];
  availableSourcesLoading = false;
  questions: DisplayQuestion[] = [];

  reportModalVisible = false;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.isAuthenticated = !!user;
    });
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.quizId = +params['id'];
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
    this.quizService.currentQuiz$.pipe(takeUntil(this.destroy$)).subscribe(quiz => {
      this.quiz = quiz;
      if (quiz) {
        this.isOwner = this.authService.currentUser?.id === quiz.userId;
        this.loadQuestions();
        if (this.isOwner) {
          this.loadNotes();
        }
        this.loadSources();
        this.loadAvailableSources();
      }
      this.loading = false;
    });
  }

  loadQuestions(): void {
    this.quizService.fetchQuizQuestions(this.quizId).subscribe({
      next: (rawQuestions: QuizQuestion[]) => {
        this.questions = rawQuestions.map(q => {
          const snapshot = JSON.parse(q.questionSnapshotJson || '{}');
          return {
            id: q.id,
            content: snapshot.content || '',
            type: snapshot.type || '',
            explanation: snapshot.explanation,
            metadata: snapshot.metadata || {},
            tags: snapshot.tags || [],
            displayOrder: q.displayOrder,
            questionSnapshotJson: q.questionSnapshotJson,
          };
        }).sort((a, b) => a.displayOrder - b.displayOrder);
      },
      error: () => this.message.error(this.translate.instant('quiz.loadQuestionsError')),
    });
  }

  loadNotes(): void {
    this.notesLoading = true;
    this.quizService.fetchQuizNotes(this.quizId);
    this.quizService.notes$.pipe(takeUntil(this.destroy$)).subscribe(notes => {
      this.notes = notes;
      this.notesLoading = false;
    });
  }

  loadSources(): void {
    this.sourcesLoading = true;
    this.quizService.fetchQuizSources(this.quizId);
    this.quizService.sources$.pipe(takeUntil(this.destroy$)).subscribe(sources => {
      this.sources = sources;
      this.sourcesLoading = false;
    });
  }

  loadAvailableSources(): void {
    this.availableSourcesLoading = true;
    this.sourceService.fetchSources({});
    this.sourceService.sources$.pipe(takeUntil(this.destroy$)).subscribe(sources => {
      this.availableSources = sources;
      this.availableSourcesLoading = false;
    });
  }

  handleAddNote(note: { title: string; content: string }): void {
    this.quizService.addNoteToQuiz(this.quizId, note).subscribe({
      next: () => this.message.success(this.translate.instant('note.createSuccess')),
      error: () => this.message.error(this.translate.instant('note.createError')),
    });
  }

  handleEditNote(update: { id: number; title: string; content: string }): void {
    this.quizService.updateNote(update.id, { title: update.title, content: update.content }).subscribe({
      next: () => this.message.success(this.translate.instant('note.updateSuccess')),
      error: () => this.message.error(this.translate.instant('note.updateError')),
    });
  }

  handleRemoveNote(noteId: number): void {
    this.quizService.removeNoteFromQuiz(this.quizId, noteId).subscribe({
      next: () => this.message.success(this.translate.instant('note.deleteSuccess')),
      error: () => this.message.error(this.translate.instant('note.deleteError')),
    });
  }

  handleAttachSources(sourceIds: number[]): void {
    // Attach all selected sources (parallel)
    const attachRequests = sourceIds.map(id => this.quizService.addSourceToQuiz(this.quizId, id));
    Promise.all(attachRequests.map(req => req.toPromise())).then(() => {
      this.message.success(this.translate.instant('source.attachSuccess'));
    }).catch(() => {
      this.message.error(this.translate.instant('source.attachError'));
    });
  }

  handleDetachSource(sourceId: number): void {
    this.quizService.removeSourceFromQuiz(this.quizId, sourceId).subscribe({
      next: () => this.message.success(this.translate.instant('source.detachSuccess')),
      error: () => this.message.error(this.translate.instant('source.detachError')),
    });
  }

  handleViewSource(sourceId: number): void {
    this.router.navigate(['/source', sourceId]);
  }

  handleDuplicate(): void {
    this.quizService.duplicateQuiz(this.quizId).subscribe({
      next: (newQuiz) => {
        this.message.success(this.translate.instant('quiz.duplicateSuccess'));
        this.router.navigate(['/quiz', newQuiz.id]);
      },
      error: () => this.message.error(this.translate.instant('quiz.duplicateError')),
    });
  }

  handleDelete(): void {
    this.quizService.deleteQuiz(this.quizId).subscribe({
      next: () => {
        this.message.success(this.translate.instant('quiz.deleteSuccess'));
        this.router.navigate(['/quiz']);
      },
      error: () => this.message.error(this.translate.instant('quiz.deleteError')),
    });
  }
}