// src/features/question/components/multiple-choice.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form'; // ✅ Added

@Component({
  selector: 'app-multiple-choice',
  standalone: true,
  imports: [CommonModule, FormsModule, NzCheckboxModule, NzInputModule, NzButtonModule, NzFormModule], // ✅ Added NzFormModule
  template: `
    <nz-form-item>
      <nz-form-label>Options</nz-form-label>
      <nz-form-control>
        <div *ngFor="let opt of options; let i = index" class="flex items-center mb-2">
          <label nz-checkbox
            [ngModel]="isCorrect(opt)"
            (ngModelChange)="toggleCorrect(opt, $event)"
            class="mr-2"
            [disabled]="!opt.trim()">
          </label>
          <input nz-input
            [(ngModel)]="options[i]"
            placeholder="Option"
            class="flex-1 mr-2"
            (ngModelChange)="onOptionsChange()" />
          <button nz-button nzType="text" nzDanger (click)="removeOption(i)">Remove</button>
        </div>
        <button nz-button nzType="dashed" block (click)="addOption()">Add Option</button>
      </nz-form-control>
    </nz-form-item>
  `,
  styles: [`
    .flex.items-center { gap: 8px; }
    .flex-1 { flex: 1; }
  `]
})
export class MultipleChoiceComponent implements OnInit {
  @Input() options: string[] = [];
  @Input() correctAnswers: string[] = [];
  @Output() optionsChange = new EventEmitter<string[]>();
  @Output() correctAnswersChange = new EventEmitter<string[]>();

  ngOnInit(): void {
    if (!this.options.length) this.options = ['', '', '', ''];
  }

  isCorrect(opt: string): boolean {
    return this.correctAnswers.includes(opt);
  }

  toggleCorrect(opt: string, checked: boolean): void {
    let newCorrect = [...this.correctAnswers];
    if (checked) {
      if (!newCorrect.includes(opt)) newCorrect.push(opt);
    } else {
      newCorrect = newCorrect.filter(item => item !== opt);
    }
    this.correctAnswersChange.emit(newCorrect);
  }

  addOption(): void {
    this.options.push('');
    this.optionsChange.emit(this.options);
  }

  removeOption(index: number): void {
    const removed = this.options[index];
    this.options.splice(index, 1);
    this.optionsChange.emit(this.options);
    if (removed && this.correctAnswers.includes(removed)) {
      this.correctAnswersChange.emit(this.correctAnswers.filter(ans => ans !== removed));
    }
  }

  onOptionsChange(): void {
    this.optionsChange.emit(this.options);
  }
}