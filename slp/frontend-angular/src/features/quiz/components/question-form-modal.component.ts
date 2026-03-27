

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { QuestionFormComponent } from '../../question/components/question-form.component';
import { CreateQuestionPayload } from '../../question/question.model';
import { DisplayQuestion } from '../quiz.model';

@Component({
  selector: 'app-question-form-modal',
  standalone: true,
  imports: [CommonModule, NzModalModule, QuestionFormComponent],
  template: `
    <nz-modal
      [(nzVisible)]="visible"
      [nzTitle]="title"
      [nzFooter]="null"
      [nzWidth]="800"
      (nzOnCancel)="handleCancel()"
    >
      <app-question-form
        [initialQuestion]="initialQuestion"
        [loading]="loading"
        (save)="handleSave($event)"
        (cancel)="handleCancel()"
      ></app-question-form>
    </nz-modal>
  `,
})
export class QuestionFormModalComponent {
  @Input() visible = false;
  @Input() question?: DisplayQuestion;
  @Input() loading = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<CreateQuestionPayload>();

  get initialQuestion(): any {
    if (!this.question) return null;
    return {
      id: this.question.id,
      content: this.question.content,
      type: this.question.type,
      explanation: this.question.explanation,
      metadataJson: this.question.metadata ? JSON.stringify(this.question.metadata) : undefined,
      tags: this.question.tags,
    };
  }

  get title(): string {
    return this.question ? 'quiz.editQuestion' : 'quiz.createQuestion';
  }

  handleSave(payload: CreateQuestionPayload): void {
    this.saved.emit(payload);
    this.visible = false;
    this.visibleChange.emit(false);
  }

  handleCancel(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}