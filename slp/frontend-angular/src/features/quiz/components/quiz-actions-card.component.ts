// src/features/quiz/components/quiz-actions-card.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-quiz-actions-card',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzButtonModule, NzPopconfirmModule, NzIconModule, TranslateModule, RouterModule],
  template: `
    <nz-card [nzTitle]="'quiz.actions' | translate" class="shadow-sm" data-testid="quiz-actions-card">
      <div class="space-y-2">
        <button nz-button nzBlock [routerLink]="['/quiz', quizId, 'edit']" *ngIf="canEdit" data-testid="edit-quiz-button">
          <i nz-icon nzType="edit"></i> {{ 'quiz.editQuiz' | translate }}
        </button>
        <button nz-button nzBlock (click)="duplicate.emit()" data-testid="duplicate-quiz-button">
          <i nz-icon nzType="copy"></i> {{ 'quiz.duplicateQuiz' | translate }}
        </button>
        <button nz-button nzBlock nzDanger nz-popconfirm nzPopconfirmTitle="{{ 'common.confirm' | translate }}" nzOkText="{{ 'common.delete' | translate }}" nzCancelText="{{ 'common.cancel' | translate }}" (nzOnConfirm)="delete.emit()" *ngIf="canEdit" data-testid="delete-quiz-button">
          <i nz-icon nzType="delete"></i> {{ 'quiz.deleteQuiz' | translate }}
        </button>
      </div>
    </nz-card>
  `,
  styles: [
    `
      .space-y-2 > * + * {
        margin-top: 8px;
      }
    `,
  ],
})
export class QuizActionsCardComponent {
  @Input() quizId!: number;
  @Input() canEdit = false;
  @Output() duplicate = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
}