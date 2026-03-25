// src/features/question/components/question-form.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import { NzFormModule } from "ng-zorro-antd/form";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzMessageService } from "ng-zorro-antd/message";
import { TagSelectorComponent } from "../../../components/tag-selector/tag-selector.component";
import { MultipleChoiceComponent } from "./multiple-choice.component";
import { TrueFalseComponent } from "./true-false.component";
import { FillBlankComponent } from "./fill-blank.component";
import { OrderingComponent } from "./ordering.component";
import { MatchingComponent } from "./matching.component";
import { QuestionDto, CreateQuestionPayload } from "../question.model";

@Component({
  selector: "app-question-form",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    TagSelectorComponent,
    MultipleChoiceComponent,
    TrueFalseComponent,
    FillBlankComponent,
    OrderingComponent,
    MatchingComponent,
  ],
  template: `
    <form
      nz-form
      [formGroup]="form"
      (ngSubmit)="onSubmit()"
      (keydown.enter)="$event.preventDefault()"
    >
      <!-- Title -->
      <nz-form-item>
        <nz-form-label [nzRequired]="true">Title</nz-form-label>
        <nz-form-control>
          <input
            nz-input
            formControlName="content"
            placeholder="Enter question title"
            data-testid="question-title"
          />
        </nz-form-control>
      </nz-form-item>

      <!-- Description -->
      <nz-form-item>
        <nz-form-label>Description (optional)</nz-form-label>
        <nz-form-control>
          <textarea
            nz-input
            formControlName="description"
            rows="3"
            placeholder="Additional description"
            data-testid="question-description"
          ></textarea>
        </nz-form-control>
      </nz-form-item>

      <!-- Type -->
      <nz-form-item>
        <nz-form-label [nzRequired]="true">Type</nz-form-label>
        <nz-form-control>
          <nz-select
            formControlName="type"
            (ngModelChange)="onTypeChange($event)"
            data-testid="question-type-select"
          >
            <nz-option
              nzValue="multiple_choice"
              nzLabel="Multiple Choice"
              data-testid="option-multiple-choice"
            ></nz-option>
            <nz-option
              nzValue="true_false"
              nzLabel="True/False"
              data-testid="option-true-false"
            ></nz-option>
            <nz-option
              nzValue="fill_blank"
              nzLabel="Fill in the Blank"
              data-testid="option-fill-blank"
            ></nz-option>
            <nz-option
              nzValue="ordering"
              nzLabel="Ordering"
              data-testid="option-ordering"
            ></nz-option>
            <nz-option
              nzValue="matching"
              nzLabel="Matching"
              data-testid="option-matching"
            ></nz-option>
          </nz-select>
        </nz-form-control>
      </nz-form-item>

      <!-- Type‑specific components -->
      <div [ngSwitch]="form.get('type')?.value">
        <app-multiple-choice
          *ngSwitchCase="'multiple_choice'"
          [options]="multipleChoiceOptions"
          [correctAnswers]="multipleChoiceCorrect"
          (optionsChange)="setMultipleChoiceOptions($event)"
          (correctAnswersChange)="setMultipleChoiceCorrect($event)"
        >
        </app-multiple-choice>

        <app-true-false
          *ngSwitchCase="'true_false'"
          [answer]="trueFalseAnswer"
          (answerChange)="trueFalseAnswer = $event"
        >
        </app-true-false>

        <app-fill-blank
          *ngSwitchCase="'fill_blank'"
          [answer]="fillBlankAnswer"
          [questionTitle]="form.get('content')?.value"
          (answerChange)="fillBlankAnswer = $event"
        >
        </app-fill-blank>

        <app-ordering
          *ngSwitchCase="'ordering'"
          [items]="orderingItems"
          (itemsChange)="orderingItems = $event"
        >
        </app-ordering>

        <app-matching
          *ngSwitchCase="'matching'"
          [pairs]="matchingPairs"
          (pairsChange)="matchingPairs = $event"
        >
        </app-matching>
      </div>

      <!-- Explanation -->
      <nz-form-item>
        <nz-form-label>Explanation (optional)</nz-form-label>
        <nz-form-control>
          <textarea
            nz-input
            formControlName="explanation"
            rows="3"
            placeholder="Explain the correct answer"
            data-testid="question-explanation"
          ></textarea>
        </nz-form-control>
      </nz-form-item>

      <!-- Tags -->
      <nz-form-item>
        <nz-form-label>Tags</nz-form-label>
        <nz-form-control>
          <app-tag-selector
            [formControl]="tagsControl"
            data-testid="question-tags"
          >
          </app-tag-selector>
        </nz-form-control>
      </nz-form-item>

      <!-- Actions -->
      <div class="flex justify-end gap-2 mt-4">
        <button nz-button (click)="onCancel()">Cancel</button>
        <button
          nz-button
          nzType="primary"
          [disabled]="loading || form.invalid"
          [nzLoading]="loading"
          data-testid="submit-question"
        >
          {{ initialQuestion ? "Update" : "Create" }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .flex {
        display: flex;
      }
      .justify-end {
        justify-content: flex-end;
      }
      .gap-2 {
        gap: 8px;
      }
      .mt-4 {
        margin-top: 16px;
      }
    `,
  ],
})
export class QuestionFormComponent implements OnInit, OnChanges {
  @Input() initialQuestion?: QuestionDto | null;
  @Input() loading = false;
  @Output() save = new EventEmitter<CreateQuestionPayload>();
  @Output() cancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);

  form!: FormGroup;
  tagsControl = this.fb.control<string[]>([]);

  multipleChoiceOptions: string[] = [];
  multipleChoiceCorrect: string[] = [];
  trueFalseAnswer = true;
  fillBlankAnswer = "[]";
  orderingItems: string[] = [];
  matchingPairs: { left: string; right: string }[] = [];

  ngOnInit(): void {
    this.initForm();
    if (this.initialQuestion) this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["initialQuestion"] && !changes["initialQuestion"].firstChange) {
      this.populateForm();
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      content: ["", Validators.required],
      description: [""],
      type: ["multiple_choice", Validators.required],
      explanation: [""],
    });
    this.tagsControl.setValue([]);
  }

  private populateForm(): void {
    const q = this.initialQuestion!;
    this.form.patchValue({
      content: q.content,
      explanation: q.explanation || "",
      type: q.type,
    });
    this.tagsControl.setValue(q.tags || []);

    let metadata: any = {};
    if (q.metadataJson) {
      try {
        metadata = JSON.parse(q.metadataJson);
      } catch {}
    }
    this.form.patchValue({ description: metadata.description || "" });

    switch (q.type) {
      case "multiple_choice":
        this.multipleChoiceOptions = (metadata.options || []).map(
          (opt: any) => opt.text,
        );
        this.multipleChoiceCorrect = (metadata.options || [])
          .filter(
            (opt: any) => (metadata.correctAnswers || []).includes(opt.id), // ✅ sửa: so sánh id
          )
          .map((opt: any) => opt.text);
        break;
      case "true_false":
        this.trueFalseAnswer = metadata.correctAnswer === true ? true : false;
        break;
      case "fill_blank":
        this.fillBlankAnswer = JSON.stringify(metadata.keywords || []);
        break;
      case "ordering":
        this.orderingItems = (metadata.items || []).map(
          (item: any) => item.text,
        );
        break;
      case "matching":
        this.matchingPairs = (metadata.pairs || []).map((p: any) => ({
          left: p.left,
          right: p.right,
        }));
        break;
    }
  }

  onTypeChange(newType: string): void {
    if (newType === "multiple_choice") {
      this.multipleChoiceOptions = ["", "", "", ""];
      this.multipleChoiceCorrect = [];
      this.trueFalseAnswer = true;
      this.fillBlankAnswer = "[]";
      this.orderingItems = [];
      this.matchingPairs = [];
    } else if (newType === "true_false") {
      this.trueFalseAnswer = true;
    } else if (newType === "fill_blank") {
      this.fillBlankAnswer = "[]";
    } else if (newType === "ordering") {
      this.orderingItems = ["", "", "", ""];
    } else if (newType === "matching") {
      this.matchingPairs = [
        { left: "", right: "" },
        { left: "", right: "" },
        { left: "", right: "" },
        { left: "", right: "" },
      ];
    }
  }

  setMultipleChoiceOptions(opts: string[]): void {
    this.multipleChoiceOptions = opts;
  }

  setMultipleChoiceCorrect(correct: string[]): void {
    this.multipleChoiceCorrect = correct;
  }

  buildMetadata(): any {
    const metadata: any = {};
    const desc = this.form.get("description")?.value?.trim();
    if (desc) metadata.description = desc;

    const type = this.form.get("type")?.value;
    switch (type) {
      case "multiple_choice": {
        const options = this.multipleChoiceOptions
          .filter((opt) => opt.trim())
          .map((text, idx) => ({ id: idx.toString(), text: text.trim() }));

        // Map correct texts to ids
        const correctIds = this.multipleChoiceCorrect
          .filter((correctText) => correctText.trim())
          .map((correctText) => {
            const idx = options.findIndex((opt) => opt.text === correctText);
            return idx !== -1 ? idx.toString() : null;
          })
          .filter((id) => id !== null);

        metadata.options = options;
        metadata.correctAnswers = correctIds;
        break;
      }
      case "true_false":
        metadata.correctAnswer = this.trueFalseAnswer === true;
        break;
      case "fill_blank": {
        let keywords: string[] = [];
        try {
          keywords = JSON.parse(this.fillBlankAnswer);
        } catch {}
        metadata.keywords = keywords.filter((k) => k.trim());
        break;
      }
      case "ordering":
        metadata.items = this.orderingItems
          .filter((item) => item.trim())
          .map((text, idx) => ({ order_id: idx + 1, text: text.trim() }));
        break;
      case "matching":
        metadata.pairs = this.matchingPairs
          .filter((p) => p.left.trim() || p.right.trim())
          .map((p, idx) => ({
            id: idx + 1,
            left: p.left.trim(),
            right: p.right.trim(),
          }));
        break;
    }
    return metadata;
  }

  onSubmit(): void {
    const content = this.form.get("content")?.value?.trim();
    if (!content) {
      this.message.warning("Title is required");
      return;
    }

    const type = this.form.get("type")?.value;
    if (type === "multiple_choice") {
      const nonEmpty = this.multipleChoiceOptions.filter((opt) => opt.trim());
      if (nonEmpty.length < 2) {
        this.message.warning("At least two options are required");
        return;
      }
      if (this.multipleChoiceCorrect.length === 0) {
        this.message.warning("Please select at least one correct answer");
        return;
      }
    }

    if (type === "fill_blank") {
      try {
        const keywords = JSON.parse(this.fillBlankAnswer);
        if (!Array.isArray(keywords) || keywords.length === 0) {
          this.message.warning("Please enter at least one keyword");
          return;
        }
        if (keywords.some((k: string) => k.includes(" "))) {
          this.message.warning(
            "Keywords must be single words (no spaces allowed)",
          );
          return;
        }
      } catch {
        this.message.warning("Invalid keyword format");
        return;
      }
    }

    const metadata = this.buildMetadata();
    const payload: CreateQuestionPayload = {
      type,
      content,
      explanation: this.form.get("explanation")?.value?.trim() || undefined,
      metadataJson: Object.keys(metadata).length
        ? JSON.stringify(metadata)
        : undefined,
      tagNames: this.tagsControl.value?.length
        ? this.tagsControl.value
        : undefined,
    };
    this.save.emit(payload);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
