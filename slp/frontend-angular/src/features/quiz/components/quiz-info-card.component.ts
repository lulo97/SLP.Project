// src/features/quiz/components/quiz-info-card.component.ts

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { TranslateModule } from '@ngx-translate/core';
import { QuizDto } from '../quiz.model';

@Component({
  selector: 'app-quiz-info-card',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzTagModule, NzDividerModule, TranslateModule],
  template: `
    <nz-card class="shadow-sm" data-testid="quiz-info-card">
      <div class="flex justify-between items-start">
        <div>
          <h2 class="text-xl font-semibold" data-testid="quiz-title">{{ quiz.title }}</h2>
          <p class="text-gray-600" data-testid="quiz-description">{{ quiz.description || ('quiz.noDescription' | translate) }}</p>
        </div>
        <div class="flex gap-2">
          <nz-tag [nzColor]="quiz.visibility === 'public' ? 'green' : 'blue'" data-testid="quiz-visibility">
            {{ quiz.visibility }}
          </nz-tag>
        </div>
      </div>
      <div class="flex items-center mt-4 text-sm text-gray-500">
        <span data-testid="quiz-creator">{{ 'quiz.by' | translate }} {{ quiz.userName || 'Unknown' }}</span>
        <nz-divider nzType="vertical" />
        <span data-testid="quiz-questions-count">{{ totalQuestions }} {{ 'quiz.questions' | translate }}</span>
      </div>
      <div class="flex flex-wrap gap-2 mt-3">
        <nz-tag *ngFor="let tag of quiz.tags" [attr.data-testid]="'quiz-tag-' + tag">{{ tag }}</nz-tag>
      </div>
    </nz-card>
  `,
  styles: [
    `
      .flex {
        display: flex;
      }
      .justify-between {
        justify-content: space-between;
      }
      .items-start {
        align-items: flex-start;
      }
      .gap-2 {
        gap: 8px;
      }
      .mt-4 {
        margin-top: 16px;
      }
      .mt-3 {
        margin-top: 12px;
      }
      .text-xl {
        font-size: 1.25rem;
      }
      .font-semibold {
        font-weight: 600;
      }
      .text-gray-600 {
        color: #4b5563;
      }
      .text-gray-500 {
        color: #6b7280;
      }
      .text-sm {
        font-size: 0.875rem;
      }
      .flex-wrap {
        flex-wrap: wrap;
      }
    `,
  ],
})
export class QuizInfoCardComponent {
  @Input() quiz!: QuizDto;
  @Input() totalQuestions = 0;
}