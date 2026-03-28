import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzRadioModule } from 'ng-zorro-antd/radio';

@Component({
  selector: 'app-true-false-question',
  standalone: true,
  imports: [CommonModule, FormsModule, NzRadioModule],
  template: `
    <nz-radio-group
      [ngModel]="value"
      (ngModelChange)="valueChange.emit($event)"
      data-testid="true-false-group"
    >
      <label nz-radio [nzValue]="true" data-testid="true-false-option-true">True</label>
      <label nz-radio [nzValue]="false" data-testid="true-false-option-false">False</label>
    </nz-radio-group>
  `,
})
export class TrueFalseQuestionComponent {
  @Input() value: boolean | null = null;
  @Output() valueChange = new EventEmitter<boolean | null>();
}