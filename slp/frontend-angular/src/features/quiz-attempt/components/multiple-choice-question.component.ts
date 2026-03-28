import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

@Component({
  selector: 'app-multiple-choice-question',
  standalone: true,
  imports: [CommonModule, FormsModule, NzCheckboxModule],
  template: `
    <nz-checkbox-group
      [ngModel]="value"
      (ngModelChange)="valueChange.emit($event)"
      data-testid="multiple-choice-group"
    >
      <label
        nz-checkbox
        *ngFor="let opt of options"
        [nzValue]="opt.id"
        [attr.data-testid]="'multiple-choice-option-' + opt.id"
      >
        {{ opt.text }}
      </label>
    </nz-checkbox-group>
  `,
})
export class MultipleChoiceQuestionComponent {
  @Input() value: string[] = [];
  @Input() options: Array<{ id: string; text: string }> = [];
  @Output() valueChange = new EventEmitter<string[]>();
}