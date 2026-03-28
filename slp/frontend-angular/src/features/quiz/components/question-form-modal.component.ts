import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NzModalModule } from "ng-zorro-antd/modal";
import { QuestionFormComponent } from "../../question/components/question-form.component";
import { CreateQuestionPayload } from "../../question/question.model";
import { DisplayQuestion } from "../quiz.model";
import { TranslateService, TranslateModule } from "@ngx-translate/core";

@Component({
  selector: "app-question-form-modal",
  standalone: true,
  imports: [
    CommonModule,
    NzModalModule,
    QuestionFormComponent,
    TranslateModule,
  ],
  template: `
    <nz-modal
      [(nzVisible)]="visible"
      [nzTitle]="modalTitle"
      [nzFooter]="null"
      [nzWidth]="800"
      (nzOnCancel)="handleCancel()"
    >
      <ng-template nzModalContent>
        <div data-testid="question-form-modal">
          <app-question-form
            [initialQuestion]="initialQuestion"
            [loading]="loading"
            (save)="handleSave($event)"
            (cancel)="handleCancel()"
          ></app-question-form>
        </div>
      </ng-template>
    </nz-modal>
  `,
})
export class QuestionFormModalComponent {
  @Input() visible = false;
  @Input() question?: DisplayQuestion;
  @Input() loading = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<CreateQuestionPayload>();

  constructor(private translate: TranslateService) {}

  get modalTitle(): string {
    return this.question
      ? this.translate.instant("quiz.updateQuestion")
      : this.translate.instant("quiz.createQuestion");
  }

  get initialQuestion(): any {
    if (!this.question) return null;
    return {
      id: this.question.id,
      content: this.question.content,
      type: this.question.type,
      explanation: this.question.explanation,
      metadataJson: this.question.metadata
        ? JSON.stringify(this.question.metadata)
        : undefined,
      tags: this.question.tags,
    };
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
