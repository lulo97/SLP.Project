// src/features/question/components/true-false.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzFormModule } from 'ng-zorro-antd/form'; // ✅ Added

@Component({
  selector: 'app-true-false',
  standalone: true,
  imports: [CommonModule, FormsModule, NzRadioModule, NzFormModule], // ✅ Added NzFormModule
  template: `
    <nz-form-item>
      <nz-form-label>Correct Answer</nz-form-label>
      <nz-form-control>
        <nz-radio-group [(ngModel)]="answer" (ngModelChange)="answerChange.emit($event)">
          <label nz-radio value="true">True</label>
          <label nz-radio value="false">False</label>
        </nz-radio-group>
      </nz-form-control>
    </nz-form-item>
  `
})
export class TrueFalseComponent {
  @Input() answer: string = 'true';
  @Output() answerChange = new EventEmitter<string>();
}