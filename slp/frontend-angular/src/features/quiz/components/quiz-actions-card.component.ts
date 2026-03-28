import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzPopoverModule } from "ng-zorro-antd/popover";
import { NzIconModule } from "ng-zorro-antd/icon";
import { TranslateModule } from "@ngx-translate/core";
import { RouterModule } from "@angular/router";

@Component({
  selector: "app-quiz-actions-card",
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzButtonModule,
    NzPopoverModule,
    NzIconModule,
    TranslateModule,
    RouterModule,
  ],
  template: `
    <nz-card
      [nzTitle]="'quiz.actions' | translate"
      class="shadow-sm"
      data-testid="quiz-actions-card"
    >
      <div class="space-y-2">
        <button
          nz-button
          nzBlock
          [routerLink]="['/quiz', quizId, 'edit']"
          *ngIf="canEdit"
          data-testid="edit-quiz-button"
        >
          <i nz-icon nzType="edit"></i> {{ "quiz.editQuiz" | translate }}
        </button>

        <button
          nz-button
          nzBlock
          (click)="duplicate.emit()"
          data-testid="duplicate-quiz-button"
        >
          <i nz-icon nzType="copy"></i> {{ "quiz.duplicateQuiz" | translate }}
        </button>

        <button
          nz-button
          nzBlock
          nzDanger
          nz-popover
          nzPopoverTrigger="click"
          [nzPopoverContent]="deleteConfirmTpl"
          [(nzPopoverVisible)]="deletePopoverVisible"
          *ngIf="canEdit"
          data-testid="delete-quiz-button"
        >
          <i nz-icon nzType="delete"></i> {{ "quiz.deleteQuiz" | translate }}
        </button>
      </div>
    </nz-card>

    <ng-template #deleteConfirmTpl>
      <p>{{ "common.confirm" | translate }}</p>
      <div class="confirm-actions">
        <button
          nz-button
          nzSize="small"
          (click)="deletePopoverVisible = false"
          data-testid="cancel-delete-quiz-button"
        >
          {{ "common.cancel" | translate }}
        </button>
        <button
          nz-button
          nzSize="small"
          nzType="primary"
          nzDanger
          (click)="onConfirmDelete()"
          data-testid="confirm-delete-quiz-button"
        >
          {{ "common.delete" | translate }}
        </button>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .space-y-2 > * + * {
        margin-top: 8px;
      }
      .confirm-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
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

  deletePopoverVisible = false;

  onConfirmDelete(): void {
    this.deletePopoverVisible = false;
    this.delete.emit();
  }
}
