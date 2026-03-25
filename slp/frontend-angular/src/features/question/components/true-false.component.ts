import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NzRadioModule } from "ng-zorro-antd/radio";
import { NzFormModule } from "ng-zorro-antd/form";

@Component({
  selector: "app-true-false",
  standalone: true,
  imports: [CommonModule, FormsModule, NzRadioModule, NzFormModule],
  template: `
    <nz-form-item>
      <nz-form-label>Correct Answer</nz-form-label>
      <nz-form-control>
        <nz-radio-group
          [(ngModel)]="answer"
          (ngModelChange)="onValueChange($event)"
          data-testid="true-false-group"
        >
          <label nz-radio [nzValue]="true" data-testid="true-false-true"
            >True</label
          >
          <label nz-radio [nzValue]="false" data-testid="true-false-false"
            >False</label
          >
        </nz-radio-group>
      </nz-form-control>
    </nz-form-item>
  `,
})
export class TrueFalseComponent {
  // Set default to true so one is checked on load
  @Input() answer: boolean = true;
  @Output() answerChange = new EventEmitter<boolean>();

  onValueChange(value: boolean): void {
    this.answerChange.emit(value);
  }
}
