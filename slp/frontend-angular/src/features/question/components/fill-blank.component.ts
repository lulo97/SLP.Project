
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzFormModule } from "ng-zorro-antd/form";

@Component({
  selector: "app-fill-blank",
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzFormModule], 
  template: `
    <nz-form-item>
      <nz-form-label>Keyword/Answer</nz-form-label>
      <nz-form-control>
        <input
          nz-input
          [(ngModel)]="keyword"
          (ngModelChange)="onKeywordChange()"
          placeholder="Enter the correct keyword"
          data-testid="fill-blank-keyword"
        />
      </nz-form-control>
    </nz-form-item>

    <nz-form-item>
      <nz-form-label>Preview</nz-form-label>
      <nz-form-control>
        <div class="preview-container" data-testid="fill-blank-preview">
          <div
            *ngIf="!questionTitle"
            class="text-gray-400 italic p-3 bg-gray-50 rounded border"
          >
            Enter question title first
          </div>
          <div
            *ngIf="questionTitle && !keyword"
            class="text-gray-400 italic p-3 bg-gray-50 rounded border"
          >
            Enter a keyword to see preview
          </div>
          <div
            *ngIf="questionTitle && keyword"
            class="preview-content p-3 bg-gray-50 rounded border"
          >
            <ng-container *ngFor="let part of previewParts">
              <span
                *ngIf="part.isBlank"
                class="blank-placeholder px-3 py-0.5 bg-yellow-100 border border-yellow-300 rounded mx-0.5 font-mono"
                >_____</span
              >
              <span *ngIf="!part.isBlank">{{ part.text }}</span>
            </ng-container>
          </div>
        </div>
      </nz-form-control>
    </nz-form-item>
  `,
  styles: [
    `
      .preview-content {
        font-size: 1rem;
        line-height: 2;
        word-break: break-word;
        white-space: pre-wrap;
        min-height: 60px;
      }
      .blank-placeholder {
        display: inline-block;
        min-width: 80px;
        text-align: center;
        background: repeating-linear-gradient(
          45deg,
          #fef9c3,
          #fef9c3 10px,
          #fef08a 10px,
          #fef08a 20px
        );
        font-weight: 500;
      }
    `,
  ],
})
export class FillBlankComponent implements OnChanges {
  @Input() answer: string = "[]"; // JSON array of keywords
  @Input() questionTitle: string = "";
  @Output() answerChange = new EventEmitter<string>();

  keyword: string = "";

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["answer"]) {
      try {
        const parsed = JSON.parse(this.answer);
        this.keyword = Array.isArray(parsed) && parsed.length ? parsed[0] : "";
      } catch {
        this.keyword = this.answer;
      }
    }
  }

  onKeywordChange(): void {
    const trimmed = this.keyword.trim();
    this.answerChange.emit(JSON.stringify([trimmed]));
  }

  get previewParts(): { text: string; isBlank: boolean }[] {
    if (!this.questionTitle || !this.keyword) return [];
    const title = this.questionTitle;
    const term = this.keyword;
    const parts: { text: string; isBlank: boolean }[] = [];
    let lastIndex = 0;
    let index = title.indexOf(term, lastIndex);
    if (index === -1) return [{ text: title, isBlank: false }];
    while (index !== -1) {
      if (index > lastIndex) {
        parts.push({ text: title.substring(lastIndex, index), isBlank: false });
      }
      parts.push({ text: "_____", isBlank: true });
      lastIndex = index + term.length;
      index = title.indexOf(term, lastIndex);
    }
    if (lastIndex < title.length) {
      parts.push({ text: title.substring(lastIndex), isBlank: false });
    }
    return parts;
  }
}
