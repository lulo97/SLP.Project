import { Component, OnInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";

import { NzListModule } from "ng-zorro-antd/list";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzFloatButtonModule } from "ng-zorro-antd/float-button";
import { NzPaginationModule } from "ng-zorro-antd/pagination";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzEmptyModule } from "ng-zorro-antd/empty";
import { NzModalService } from "ng-zorro-antd/modal";

import { TranslateModule, TranslateService } from "@ngx-translate/core";

import { QuizService } from "../quiz.service";
import { QuizListDto } from "../quiz.model";
import { AuthService } from "../../auth/auth.service";

@Component({
  selector: "app-quiz-list",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzListModule,
    NzTagModule,
    NzInputModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzIconModule,
    NzFloatButtonModule,
    NzPaginationModule,
    NzSpinModule,
    NzEmptyModule,
    TranslateModule,
  ],
  template: `
    <div class="space-y-4">
      <!-- Tab switcher -->
      <div class="flex gap-2 mb-4">
        <button
          nz-button
          [nzType]="currentTab === 'my' ? 'primary' : 'default'"
          (click)="switchTab('my')"
          block
          data-testid="tab-my-quizzes"
        >
          {{ "nav.myQuizzes" | translate }}
        </button>
        <button
          nz-button
          [nzType]="currentTab === 'public' ? 'primary' : 'default'"
          (click)="switchTab('public')"
          block
          data-testid="tab-public-quizzes"
        >
          {{ "quiz.publicQuizzes" | translate }}
        </button>
      </div>

      <!-- Search (only for public) -->
      <input
        *ngIf="currentTab === 'public'"
        nz-input
        [(ngModel)]="searchTerm"
        (ngModelChange)="onSearchChange()"
        [placeholder]="'quiz.searchPlaceholder' | translate"
        class="mb-4"
        data-testid="search-quizzes-input"
      />
      <button
        nz-button
        nzType="primary"
        (click)="onSearchChange()"
        data-testid="search-quizzes-button"
      >
        Search
      </button>

      <!-- List -->
      <nz-spin
        [nzSpinning]="(quizService.loading$ | async) ?? false"
        data-testid="quiz-list-loading"
      >
        <nz-list
          nzBordered
          [nzDataSource]="(quizService.quizzes$ | async) ?? []"
          data-testid="quiz-list"
        >
          <nz-list-item
            *ngFor="let quiz of quizService.quizzes$ | async"
            [attr.data-testid]="'quiz-list-item-' + quiz.id"
          >
            <div class="flex flex-col w-full">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <a
                      [routerLink]="['/quiz', quiz.id]"
                      class="text-base font-medium"
                      [attr.data-testid]="'quiz-title-link-' + quiz.id"
                    >
                      {{ quiz.title }}
                    </a>
                    <nz-tag
                      [nzColor]="
                        quiz.visibility === 'public' ? 'green' : 'blue'
                      "
                      [attr.data-testid]="'quiz-visibility-' + quiz.id"
                    >
                      {{ quiz.visibility }}
                    </nz-tag>
                  </div>
                  <div
                    class="text-sm text-gray-500 mb-2"
                    [attr.data-testid]="'quiz-description-' + quiz.id"
                  >
                    {{ quiz.description || ("quiz.noDescription" | translate) }}
                  </div>
                  <div
                    class="flex items-center justify-between text-xs text-gray-400"
                  >
                    <span [attr.data-testid]="'quiz-author-' + quiz.id">
                      {{ "quiz.by" | translate }}
                      {{ quiz.userName || "Unknown" }}
                    </span>
                    <span [attr.data-testid]="'quiz-question-count-' + quiz.id">
                      {{ quiz.questionCount }}
                      {{ "quiz.questions" | translate }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <nz-tag
                      *ngFor="let tag of quiz.tags"
                      size="small"
                      [attr.data-testid]="'quiz-tag-' + quiz.id + '-' + tag"
                    >
                      {{ tag }}
                    </nz-tag>
                  </div>
                </div>
                <div class="flex gap-1">
                  <button
                    nz-button
                    nzType="text"
                    (click)="viewQuiz(quiz.id)"
                    [attr.data-testid]="'view-quiz-' + quiz.id"
                  >
                    <i nz-icon nzType="eye"></i>
                  </button>
                  <button
                    nz-button
                    nzType="text"
                    (click)="duplicateQuiz(quiz.id)"
                    [attr.data-testid]="'duplicate-quiz-' + quiz.id"
                  >
                    <i nz-icon nzType="copy"></i>
                  </button>
                  <button
                    *ngIf="canEdit(quiz)"
                    nz-button
                    nzType="text"
                    (click)="editQuiz(quiz.id)"
                    [attr.data-testid]="'edit-quiz-' + quiz.id"
                  >
                    <i nz-icon nzType="edit"></i>
                  </button>
                  <button
                    *ngIf="canEdit(quiz)"
                    nz-button
                    nzType="text"
                    nzDanger
                    nz-popconfirm
                    [nzPopconfirmTitle]="'common.confirm' | translate"
                    nzOkText="{{ 'common.yes' | translate }}"
                    nzCancelText="{{ 'common.cancel' | translate }}"
                    (nzOnConfirm)="deleteQuiz(quiz.id)"
                    [attr.data-testid]="'delete-quiz-' + quiz.id"
                  >
                    <i nz-icon nzType="delete"></i>
                  </button>
                </div>
              </div>
            </div>
          </nz-list-item>
        </nz-list>
      </nz-spin>

      <!-- Empty state -->
      <nz-empty
        *ngIf="
          !(quizService.loading$ | async) &&
          ((quizService.quizzes$ | async) ?? []).length === 0
        "
        [nzNotFoundContent]="emptyMessage"
        data-testid="quiz-list-empty"
      ></nz-empty>

      <!-- Pagination -->
      <div
        *ngIf="(quizService.total$ | async) ?? 0 > 0"
        class="flex justify-center mt-4"
      >
        <nz-pagination
          [nzPageIndex]="(quizService.page$ | async) ?? 1"
          [nzTotal]="(quizService.total$ | async) ?? 0"
          [nzPageSize]="(quizService.pageSize$ | async) ?? 10"
          [nzShowSizeChanger]="false"
          (nzPageIndexChange)="onPageChange($event)"
          data-testid="quiz-pagination"
        ></nz-pagination>
      </div>

      <!-- Floating action button -->
      <nz-float-button
        nzType="primary"
        [nzIcon]="iconTemplate"
        (click)="goToCreate()"
        data-testid="create-quiz-fab"
      ></nz-float-button>
      <ng-template #iconTemplate>
        <i nz-icon nzType="plus"></i>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .flex {
        display: flex;
      }
      .flex-col {
        flex-direction: column;
      }
      .flex-1 {
        flex: 1;
      }
      .gap-1 {
        gap: 4px;
      }
      .gap-2 {
        gap: 8px;
      }
      .mb-1 {
        margin-bottom: 4px;
      }
      .mb-2 {
        margin-bottom: 8px;
      }
      .mb-4 {
        margin-bottom: 16px;
      }
      .mt-4 {
        margin-top: 16px;
      }
      .w-full {
        width: 100%;
      }
      .justify-between {
        justify-content: space-between;
      }
      .items-start {
        align-items: flex-start;
      }
      .text-center {
        text-align: center;
      }
      .text-sm {
        font-size: 0.875rem;
      }
      .text-xs {
        font-size: 0.75rem;
      }
      .text-gray-400 {
        color: #9ca3af;
      }
      .text-gray-500 {
        color: #6b7280;
      }
    `,
  ],
})
export class QuizListComponent implements OnInit, OnDestroy {
  public quizService = inject(QuizService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);
  private authService = inject(AuthService);

  currentTab: "my" | "public" = "my";
  searchTerm = "";
  private searchDebouncer = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.switchTab("my");
    this.searchDebouncer
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.currentTab === "public") {
          if (this.searchTerm.trim()) {
            this.quizService.searchQuizzes(this.searchTerm.trim(), 1);
          } else {
            this.quizService.fetchPublicQuizzes(1);
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  switchTab(tab: "my" | "public"): void {
    this.currentTab = tab;
    this.searchTerm = "";
    if (tab === "my") {
      this.quizService.fetchMyQuizzes(1);
    } else {
      this.quizService.fetchPublicQuizzes(1);
    }
  }

  onSearchChange(): void {
    this.searchDebouncer.next(this.searchTerm);
  }

  onPageChange(page: number): void {
    if (this.currentTab === "my") {
      this.quizService.fetchMyQuizzes(page);
    } else {
      if (this.searchTerm.trim()) {
        this.quizService.searchQuizzes(this.searchTerm.trim(), page);
      } else {
        this.quizService.fetchPublicQuizzes(page);
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  canEdit(quiz: QuizListDto): boolean {
    const user = this.authService.currentUser;
    return !!(user && (user.role === "admin" || quiz.userId === user.id));
  }

  viewQuiz(id: number): void {
    this.router.navigate(["/quiz", id]);
  }

  editQuiz(id: number): void {
    this.router.navigate(["/quiz", id, "edit"]);
  }

  duplicateQuiz(id: number): void {
    this.quizService.duplicateQuiz(id).subscribe({
      next: (newQuiz) => {
        this.message.success(this.translate.instant("quiz.duplicateSuccess"));
        this.router.navigate(["/quiz", newQuiz.id, "edit"]);
      },
      error: () =>
        this.message.error(this.translate.instant("quiz.duplicateError")),
    });
  }

  deleteQuiz(id: number): void {
    this.quizService.deleteQuiz(id).subscribe({
      next: () => {
        this.message.success(this.translate.instant("quiz.deleteSuccess"));
        // Refresh current page
        if (this.currentTab === "my") {
          this.quizService.fetchMyQuizzes(this.quizService.pageSubject.value);
        } else {
          this.quizService.fetchPublicQuizzes(
            this.quizService.pageSubject.value,
          );
        }
      },
      error: () =>
        this.message.error(this.translate.instant("quiz.deleteError")),
    });
  }

  goToCreate(): void {
    this.router.navigate(["/quiz/new"]);
  }

  get emptyMessage(): string {
    return this.currentTab === "my"
      ? this.translate.instant("quiz.noMyQuizzes")
      : this.translate.instant("quiz.noPublicQuizzes");
  }
}
