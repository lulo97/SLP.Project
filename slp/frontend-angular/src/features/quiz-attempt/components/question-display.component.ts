// src/features/quiz-attempt/components/question-display.component.ts

import { Component, Input, Output, EventEmitter, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MultipleChoiceQuestionComponent } from './multiple-choice-question.component';
import { SingleChoiceQuestionComponent } from './single-choice-question.component';
import { TrueFalseQuestionComponent } from './true-false-question.component';
import { FillBlankQuestionComponent } from './fill-blank-question.component';
import { OrderingQuestionComponent } from './ordering-question.component';
import { MatchingQuestionComponent } from './matching-question.component';
import { FlashcardQuestionComponent } from './flashcard-question.component';

interface QuestionSnapshot {
  type: string;
  content: string;
  explanation?: string;
  metadata: any;
  tags?: string[];
}

@Component({
  selector: 'app-question-display',
  standalone: true,
  imports: [
    CommonModule,
    MultipleChoiceQuestionComponent,
    SingleChoiceQuestionComponent,
    TrueFalseQuestionComponent,
    FillBlankQuestionComponent,
    OrderingQuestionComponent,
    MatchingQuestionComponent,
    FlashcardQuestionComponent,
  ],
  template: `
    <div *ngIf="snapshot.type !== 'unknown'" data-testid="question-display-container" [attr.data-question-type]="snapshot.type">
      <h3 class="text-lg font-medium mb-2" data-testid="question-content">{{ displayContent() }}</h3>

      <!-- Multiple choice -->
      <app-multiple-choice-question
        *ngIf="snapshot.type === 'multiple_choice'"
        [options]="snapshot.metadata?.options || []"
        [value]="answer?.selected ?? []"
        (valueChange)="emitAnswer({ selected: $event })"
        data-testid="question-type-multiple-choice"
      ></app-multiple-choice-question>

      <!-- Single choice -->
      <app-single-choice-question
        *ngIf="snapshot.type === 'single_choice'"
        [options]="snapshot.metadata?.options || []"
        [value]="answer?.selected ?? null"
        (valueChange)="emitAnswer({ selected: $event })"
        data-testid="question-type-single-choice"
      ></app-single-choice-question>

      <!-- True/False -->
      <app-true-false-question
        *ngIf="snapshot.type === 'true_false'"
        [value]="answer?.selected ?? null"
        (valueChange)="emitAnswer({ selected: $event })"
        data-testid="question-type-true-false"
      ></app-true-false-question>

      <!-- Fill blank -->
      <app-fill-blank-question
        *ngIf="snapshot.type === 'fill_blank'"
        [value]="answer?.answer ?? ''"
        (valueChange)="emitAnswer({ answer: $event })"
        data-testid="question-type-fill-blank"
      ></app-fill-blank-question>

      <!-- Ordering -->
      <app-ordering-question
        *ngIf="snapshot.type === 'ordering'"
        [items]="snapshot.metadata?.items || []"
        [value]="answer?.order ?? []"
        (valueChange)="emitAnswer({ order: $event })"
        data-testid="question-type-ordering"
      ></app-ordering-question>

      <!-- Matching -->
      <app-matching-question
        *ngIf="snapshot.type === 'matching'"
        [pairs]="snapshot.metadata?.pairs || []"
        [value]="answer?.matches ?? []"
        (valueChange)="emitAnswer({ matches: $event })"
        data-testid="question-type-matching"
      ></app-matching-question>

      <!-- Flashcard -->
      <app-flashcard-question
        *ngIf="snapshot.type === 'flashcard'"
        [front]="snapshot.metadata?.front"
        [back]="snapshot.metadata?.back"
        data-testid="question-type-flashcard"
      ></app-flashcard-question>

      <!-- Unknown type -->
      <div *ngIf="snapshot.type === 'unknown'" data-testid="question-type-unsupported">
        <p class="text-red-500">Unsupported question type: {{ snapshot.type }}</p>
      </div>
    </div>
  `,
})
export class QuestionDisplayComponent {
  private _question: any;
  @Input() set question(value: any) {
    this._question = value;
    this.parseSnapshot();
  }
  get question(): any {
    return this._question;
  }

  @Input() answer: any = null;
  @Output() answerChange = new EventEmitter<any>();

  snapshot: QuestionSnapshot = { type: 'unknown', content: '', metadata: {} };

  private parseSnapshot(): void {
    if (!this.question?.questionSnapshotJson) {
      this.snapshot = { type: 'unknown', content: 'Question data missing', metadata: {} };
      return;
    }
    try {
      this.snapshot = JSON.parse(this.question.questionSnapshotJson);
    } catch {
      this.snapshot = { type: 'unknown', content: 'Invalid question data', metadata: {} };
    }
  }

  displayContent(): string {
    const content = this.snapshot.content || '';
    const keywords = this.snapshot.metadata?.keywords;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return content;
    }
    let result = content;
    keywords.forEach((kw: string) => {
      result = result.split(kw).join('___');
    });
    return result;
  }

  emitAnswer(value: any): void {
    this.answerChange.emit(value);
  }
}