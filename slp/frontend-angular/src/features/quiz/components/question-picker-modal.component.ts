import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzListModule } from "ng-zorro-antd/list";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzPaginationModule } from "ng-zorro-antd/pagination";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzButtonModule } from "ng-zorro-antd/button";
import { TranslateModule } from "@ngx-translate/core";
import { QuestionService } from "../../question/question.service";
import { QuestionListDto } from "../../question/question.model";

@Component({
  selector: "app-question-picker-modal",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzListModule,
    NzTagModule,
    NzInputModule,
    NzSelectModule,
    NzPaginationModule,
    NzSpinModule,
    NzButtonModule,
    TranslateModule,
  ],
  template: `
    <nz-modal
      [(nzVisible)]="visible"
      nzTitle="{{ 'quiz.findQuestion' | translate }}"
      [nzFooter]="null"
      [nzWidth]="800"
      (nzOnCancel)="handleCancel()"
      data-testid="question-picker-modal"
    >
      <!-- ✅ Wrap content in ng-template nzModalContent -->
      <ng-template nzModalContent>
        <div class="space-y-3">
          <div class="flex flex-col gap-2">
            <input
              nz-input
              [(ngModel)]="search"
              (ngModelChange)="onSearchChange()"
              placeholder="{{ 'quiz.searchQuestions' | translate }}"
              data-testid="picker-search"
            />
            <div class="flex gap-2">
              <nz-select
                [(ngModel)]="typeFilter"
                nzPlaceHolder="{{ 'quiz.filterByType' | translate }}"
                allowClear
                style="width: 140px"
                (ngModelChange)="onFilterChange()"
                data-testid="picker-type-filter"
              >
                <nz-option
                  nzValue="multiple_choice"
                  nzLabel="Multiple Choice"
                ></nz-option>
                <nz-option
                  nzValue="true_false"
                  nzLabel="True/False"
                ></nz-option>
                <nz-option
                  nzValue="fill_blank"
                  nzLabel="Fill in the Blank"
                ></nz-option>
                <nz-option nzValue="ordering" nzLabel="Ordering"></nz-option>
                <nz-option nzValue="matching" nzLabel="Matching"></nz-option>
              </nz-select>
              <input
                nz-input
                [(ngModel)]="tagFilter"
                (ngModelChange)="onFilterChange()"
                placeholder="{{ 'quiz.filterByTag' | translate }}"
                class="flex-1"
                data-testid="picker-tag-filter"
              />
            </div>
          </div>

          <nz-spin [nzSpinning]="loading">
            <nz-list
              [nzDataSource]="questions"
              nzItemLayout="vertical"
              data-testid="picker-questions-list"
            >
              <nz-list-item
                *ngFor="let q of questions"
                [attr.data-testid]="'picker-question-' + q.id"
              >
                <nz-list-item-meta>
                  <nz-list-item-meta-title>
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-medium">{{ q.content }}</span>
                      <nz-tag>{{ formatType(q.type) }}</nz-tag>
                    </div>
                  </nz-list-item-meta-title>
                  <nz-list-item-meta-description>
                    <div class="text-sm">
                      <p class="text-gray-500">
                        {{
                          getDescription(q) ||
                            ("quiz.noDescription" | translate)
                        }}
                      </p>
                      <div class="flex flex-wrap gap-1 mt-1">
                        <nz-tag *ngFor="let tag of q.tags" size="small">{{
                          tag
                        }}</nz-tag>
                      </div>
                    </div>
                  </nz-list-item-meta-description>
                </nz-list-item-meta>
                <ul nz-list-item-actions>
                  <nz-list-item-action>
                    <button
                      nz-button
                      nzType="primary"
                      size="small"
                      (click)="select.emit(q)"
                      data-testid="picker-select-button"
                    >
                      {{ "quiz.select" | translate }}
                    </button>
                  </nz-list-item-action>
                </ul>
              </nz-list-item>
            </nz-list>
          </nz-spin>

          <div *ngIf="total > pageSize" class="flex justify-center mt-4">
            <nz-pagination
              [nzPageIndex]="currentPage"
              [nzTotal]="total"
              [nzPageSize]="pageSize"
              [nzShowSizeChanger]="false"
              (nzPageIndexChange)="onPageChange($event)"
              data-testid="picker-pagination"
            ></nz-pagination>
          </div>

          <div
            *ngIf="!loading && questions.length === 0"
            class="text-center py-12 text-gray-400"
          >
            <p class="text-base">{{ "quiz.noQuestionsFound" | translate }}</p>
          </div>
        </div>
      </ng-template>
    </nz-modal>
  `,
})
export class QuestionPickerModalComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() select = new EventEmitter<QuestionListDto>();

  search = "";
  typeFilter?: string;
  tagFilter = "";
  currentPage = 1;
  pageSize = 10;
  questions: QuestionListDto[] = [];
  loading = false;
  total = 0;

  private searchDebouncer = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private questionService: QuestionService) {}

  ngOnInit(): void {
    // 1. Listen to the data streams from the service
    this.questionService.questions$
      .pipe(takeUntil(this.destroy$))
      .subscribe((qs) => (this.questions = qs));
    this.questionService.total$
      .pipe(takeUntil(this.destroy$))
      .subscribe((t) => (this.total = t));
    this.questionService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((l) => (this.loading = l));

    // 2. Existing Debounced search logic
    this.searchDebouncer
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.fetchQuestions();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Load questions when modal becomes visible
    if (changes["visible"] && this.visible) {
      this.search = "";
      this.typeFilter = undefined;
      this.tagFilter = "";
      this.currentPage = 1;
      this.fetchQuestions();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(): void {
    this.searchDebouncer.next(this.search);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.fetchQuestions();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.fetchQuestions();
  }

  fetchQuestions(): void {
    const params: any = {
      search: this.search || undefined,
      type: this.typeFilter || undefined,
      tags: this.tagFilter || undefined,
    };

    // Simply call the method; the subscriptions in ngOnInit will handle the UI update
    this.questionService.fetchQuestions(
      params,
      this.currentPage,
      this.pageSize,
    );
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

  handleCancel(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
