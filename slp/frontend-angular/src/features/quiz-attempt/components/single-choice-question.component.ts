import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzRadioModule } from 'ng-zorro-antd/radio';

@Component({
  selector: 'app-single-choice-question',
  standalone: true,
  imports: [CommonModule, FormsModule, NzRadioModule],
  template: `
    <nz-radio-group
      [ngModel]="value"
      (ngModelChange)="valueChange.emit($event)"
      data-testid="single-choice-group"
    >
      <label
        nz-radio
        *ngFor="let opt of options"
        [nzValue]="opt.id"
        [attr.data-testid]="'single-choice-option-' + opt.id"
      >
        {{ opt.text }}
      </label>
    </nz-radio-group>
  `,
})
export class SingleChoiceQuestionComponent {
  @Input() value: string | null = null;
  @Input() options: Array<{ id: string; text: string }> = [];
  @Output() valueChange = new EventEmitter<string | null>();
}