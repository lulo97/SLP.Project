// src/features/quiz-attempt/components/fill-blank-question.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-fill-blank-question',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule],
  template: `
    <input
      nz-input
      [ngModel]="value"
      (ngModelChange)="valueChange.emit($event)"
      placeholder="Type your answer"
      data-testid="fill-blank-input"
    />
  `,
})
export class FillBlankQuestionComponent {
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
}