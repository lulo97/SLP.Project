// src/features/question/pages/question-list.component.ts
import { Component, OnInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { NzListModule } from "ng-zorro-antd/list";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzPaginationModule } from "ng-zorro-antd/pagination";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzFloatButtonModule } from "ng-zorro-antd/float-button";
import { QuestionService } from "../question.service";
import { QuestionListDto } from "../question.model";

@Component({
  selector: "app-question-list",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzListModule,
    NzTagModule,
    NzInputModule,
    NzSelectModule,
    NzPaginationModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzIconModule,
    NzFloatButtonModule,
  ],
  template: `
    <div>
      <!-- Search & Filter -->
      <div class="flex flex-col gap-2 mb-4">
        <input
          nz-input
          placeholder="Search by title..."
          [(ngModel)]="search"
          (ngModelChange)="onSearchChange()"
        />
        <div class="flex gap-2">
          <nz-select
            [(ngModel)]="typeFilter"
            placeholder="Filter by type"
            allowClear
            (ngModelChange)="handleFilterChange()"
            class="flex-1"
          >
            <nz-option
              nzValue="multiple_choice"
              nzLabel="Multiple Choice"
            ></nz-option>
            <nz-option nzValue="true_false" nzLabel="True/False"></nz-option>
            <nz-option
              nzValue="fill_blank"
              nzLabel="Fill in the Blank"
            ></nz-option>
            <nz-option nzValue="ordering" nzLabel="Ordering"></nz-option>
            <nz-option nzValue="matching" nzLabel="Matching"></nz-option>
          </nz-select>
          <input
            nz-input
            placeholder="Filter by tag"
            [(ngModel)]="tagFilter"
            (ngModelChange)="onTagFilterChange()"
            class="flex-1"
          />
        </div>
      </div>

      <!-- List -->
      <nz-list nzBordered [nzLoading]="(loading$ | async) ?? false">
        <nz-list-item *ngFor="let q of (questions$ | async) ?? []">
          <div class="flex flex-col w-full">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h4 class="mb-1">{{ q.content }}</h4>
                <div class="text-sm text-gray-500 mb-2">
                  <span
                    class="inline-block px-2 py-1 bg-gray-100 rounded mr-2"
                    >{{ formatType(q.type) }}</span
                  >
                  <span>{{ getDescription(q) }}</span>
                </div>
                <div class="flex flex-wrap gap-1">
                  <nz-tag *ngFor="let tag of q.tags">{{ tag }}</nz-tag>
                </div>
              </div>
              <div class="flex gap-1">
                <button nz-button nzType="text" (click)="editQuestion(q.id)">
                  <i nz-icon nzType="edit"></i>
                </button>
                <nz-popconfirm
                  nzTitle="Delete this question?"
                  nzOkText="Delete"
                  nzCancelText="Cancel"
                  (nzOnConfirm)="deleteQuestion(q.id)"
                >
                  <button nz-button nzType="text" nzDanger>
                    <i nz-icon nzType="delete"></i>
                  </button>
                </nz-popconfirm>
              </div>
            </div>
          </div>
        </nz-list-item>
      </nz-list>

      <!-- Pagination -->
      <nz-pagination
        class="mt-4 text-center"
        [nzPageIndex]="(page$ | async) ?? 1"
        [nzPageSize]="(pageSize$ | async) ?? 10"
        [nzTotal]="(total$ | async) ?? 0"
        (nzPageIndexChange)="onPageChange($event)"
        nzShowSizeChanger
        nzShowQuickJumper
      ></nz-pagination>

      <!-- Create button -->
      <nz-float-button
        nzType="primary"
        [nzIcon]="iconTemplate"
        (click)="goToCreate()"
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
      .text-gray-500 {
        color: #6b7280;
      }
      .bg-gray-100 {
        background-color: #f3f4f6;
      }
      .px-2 {
        padding-left: 8px;
        padding-right: 8px;
      }
      .py-1 {
        padding-top: 4px;
        padding-bottom: 4px;
      }
      .rounded {
        border-radius: 4px;
      }
      .inline-block {
        display: inline-block;
      }
      .mr-2 {
        margin-right: 8px;
      }
    `,
  ],
})
export class QuestionListComponent implements OnInit, OnDestroy {
  private questionService = inject(QuestionService);
  private router = inject(Router);
  private message = inject(NzMessageService);

  questions$ = this.questionService.questions$;
  loading$ = this.questionService.loading$;
  total$ = this.questionService.total$;
  page$ = this.questionService.page$;
  pageSize$ = this.questionService.pageSize$;

  search = "";
  typeFilter: string | undefined;
  tagFilter = "";
  private searchDebounce: any;

  ngOnInit(): void {
    console.log('QuestionListComponent initialized');
    this.loadQuestions();
  }

  ngOnDestroy(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }

  loadQuestions(): void {
    this.questionService.fetchQuestions(
      {
        search: this.search || undefined,
        type: this.typeFilter,
        tags: this.tagFilter || undefined,
      },
      1,
      10,
    );
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.handleSearch(), 500);
  }

  handleSearch(): void {
    this.questionService.fetchQuestions(
      {
        search: this.search || undefined,
        type: this.typeFilter,
        tags: this.tagFilter || undefined,
      },
      1,
      10,
    );
  }

  handleFilterChange(): void {
    this.questionService.fetchQuestions(
      {
        search: this.search || undefined,
        type: this.typeFilter,
        tags: this.tagFilter || undefined,
      },
      1,
      10,
    );
  }

  onTagFilterChange(): void {
    this.handleFilterChange();
  }

  onPageChange(page: number): void {
    this.questionService.fetchQuestions(
      {
        search: this.search || undefined,
        type: this.typeFilter,
        tags: this.tagFilter || undefined,
      },
      page,
      10,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  formatType(type: string): string {
    if (!type) return "Unknown";
    return type
      .split(/[_\-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  getDescription(item: QuestionListDto): string {
    if (!item.metadataJson) return "";
    try {
      const meta = JSON.parse(item.metadataJson);
      return meta.description || "";
    } catch {
      return "";
    }
  }

  editQuestion(id: number): void {
    this.router.navigate([`/question/${id}/edit`]);
  }

  deleteQuestion(id: number): void {
    this.questionService.deleteQuestion(id).subscribe({
      next: () => {
        this.message.success("Question deleted");
        this.loadQuestions();
      },
      error: () =>
        this.message.error(
          this.questionService.errorSubject.value || "Delete failed",
        ),
    });
  }

  goToCreate(): void {
    this.router.navigate(["/question/new"]);
  }
}
