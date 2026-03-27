

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { TranslateModule } from '@ngx-translate/core';
import { DisplayQuestion } from '../quiz.model';
import { formatQuestionType, getQuestionSummary } from '../utils/question-helpers';

@Component({
  selector: 'app-questions-section',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzTagModule, NzButtonModule, NzIconModule, TranslateModule],
  template: `
    <nz-card [nzTitle]="'quiz.questions' | translate" class="shadow-sm" data-testid="questions-card">
      <div class="mb-2 flex justify-between items-center">
        <span class="font-medium">{{ 'quiz.totalQuestions' | translate }}: {{ questions.length }}</span>
        <div class="space-x-2">
          <button *ngIf="!readonly" nz-button nzType="default" size="small" (click)="find.emit()" data-testid="find-question-button">
            <i nz-icon nzType="search"></i> {{ 'quiz.findQuestion' | translate }}
          </button>
          <button *ngIf="!readonly" nz-button nzType="primary" size="small" (click)="add.emit()" data-testid="add-question-button">
            <i nz-icon nzType="plus"></i> {{ 'quiz.addQuestion' | translate }}
          </button>
        </div>
      </div>

      <div *ngIf="!questions.length" class="text-center py-4 text-gray-500" data-testid="no-questions-message">
        {{ 'quiz.noQuestions' | translate }}
      </div>

      <div *ngIf="questions.length" class="questions-list max-h-96 overflow-y-auto space-y-2 pr-1" data-testid="questions-list">
        <div *ngFor="let q of questions; let i = index" class="relative" [attr.data-testid]="'question-item-wrapper-' + q.id">
          <div class="flex items-start gap-2 p-2 bg-gray-50 rounded border" [attr.data-testid]="'question-row-' + q.id">
            <div *ngIf="!readonly" class="flex flex-col gap-1" [attr.data-testid]="'question-actions-' + q.id">
              <button nz-button nzType="text" size="small" (click)="edit.emit(q)" [attr.data-testid]="'edit-question-button-' + q.id">
                <i nz-icon nzType="edit" [attr.data-testid]="'edit-icon-' + q.id"></i>
              </button>
              <button nz-button nzType="text" size="small" nzDanger (click)="delete.emit(q.id)" [attr.data-testid]="'delete-question-button-' + q.id">
                <i nz-icon nzType="delete" [attr.data-testid]="'delete-icon-' + q.id"></i>
              </button>
            </div>
            <div class="flex-1 min-w-0" [attr.data-testid]="'question-content-container-' + q.id">
              <div class="flex items-center gap-2" [attr.data-testid]="'question-header-' + q.id">
                <span class="text-sm font-medium truncate" [attr.data-testid]="'question-text-' + q.id">{{ q.content }}</span>
                <nz-tag size="small" [attr.data-testid]="'question-type-tag-' + q.id">{{ formatQuestionType(q.type) }}</nz-tag>
              </div>
              <div class="text-xs text-gray-500 mt-1" [attr.data-testid]="'question-summary-' + q.id">
                {{ getQuestionSummary(q) }}
              </div>
            </div>
            <div class="text-xs text-gray-400 font-mono w-6 text-center" [attr.data-testid]="'question-index-' + q.id">
              {{ i + 1 }}
            </div>
          </div>
          <div *ngIf="!readonly && i < questions.length - 1" class="flex justify-center my-1" [attr.data-testid]="'insert-button-container-' + i">
            <button nz-button nzType="dashed" size="small" class="w-full text-xs" (click)="insert.emit(i + 1)" [attr.data-testid]="'insert-question-after-' + q.id">
              <i nz-icon nzType="plus" [attr.data-testid]="'insert-icon-' + q.id"></i> {{ 'quiz.insertQuestion' | translate }}
            </button>
          </div>
        </div>
      </div>
    </nz-card>
  `,
  styles: [
    `
      .questions-list {
        scrollbar-width: thin;
      }
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
      .mt-1 {
        margin-top: 4px;
      }
      .mb-2 {
        margin-bottom: 8px;
      }
      .p-2 {
        padding: 8px;
      }
      .bg-gray-50 {
        background-color: #f9fafb;
      }
      .rounded {
        border-radius: 4px;
      }
      .border {
        border: 1px solid #e5e7eb;
      }
      .min-w-0 {
        min-width: 0;
      }
      .truncate {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .text-sm {
        font-size: 0.875rem;
      }
      .text-xs {
        font-size: 0.75rem;
      }
      .text-gray-500 {
        color: #6b7280;
      }
      .text-gray-400 {
        color: #9ca3af;
      }
      .font-mono {
        font-family: monospace;
      }
      .w-6 {
        width: 1.5rem;
      }
      .text-center {
        text-align: center;
      }
    `,
  ],
})
export class QuestionsSectionComponent {
  @Input() questions: DisplayQuestion[] = [];
  @Input() readonly = false;
  @Output() add = new EventEmitter<void>();
  @Output() edit = new EventEmitter<DisplayQuestion>();
  @Output() delete = new EventEmitter<number>();
  @Output() insert = new EventEmitter<number>();
  @Output() find = new EventEmitter<void>();

  formatQuestionType = formatQuestionType;
  getQuestionSummary = getQuestionSummary;
}