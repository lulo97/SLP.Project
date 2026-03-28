import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-answer-display",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="!hasAnswer()"
      class="text-xs text-gray-400 italic"
      data-testid="answer-display-empty"
    >
      No answer
    </div>

    <!-- Multiple choice -->
    <div
      *ngIf="type === 'multiple_choice'"
      class="flex flex-col gap-1"
      data-testid="answer-display-multiple-choice"
    >
      <span
        *ngFor="let id of ids"
        class="text-sm"
        [attr.data-testid]="'answer-display-option-' + id"
      >
        • {{ getOptionText(id) }}
      </span>
    </div>

    <!-- Single choice -->
    <div
      *ngIf="type === 'single_choice'"
      class="text-sm"
      data-testid="answer-display-single-choice"
    >
      {{ getOptionText(selectedId) }}
    </div>

    <!-- True/False -->
    <div
      *ngIf="type === 'true_false'"
      class="text-sm font-medium"
      data-testid="answer-display-true-false"
    >
      {{ boolValue ? "True" : "False" }}
    </div>

    <!-- Fill blank -->
    <div
      *ngIf="type === 'fill_blank'"
      class="text-sm font-medium"
      data-testid="answer-display-fill-blank"
    >
      {{ stringValue }}
    </div>

    <!-- Ordering -->
    <div
      *ngIf="type === 'ordering'"
      class="flex flex-col gap-1"
      data-testid="answer-display-ordering"
    >
      <span
        *ngFor="let item of orderedItems; let i = index"
        class="text-sm"
        [attr.data-testid]="'answer-display-ordering-item-' + i"
      >
        {{ i + 1 }}. {{ item.text }}
      </span>
    </div>

    <!-- Matching -->
    <div
      *ngIf="type === 'matching'"
      class="flex flex-col gap-1"
      data-testid="answer-display-matching"
    >
      <!-- User's answer: show matches with dynamic testid -->
      <ng-container *ngIf="userAnswer; else correctPairs">
        <span
          *ngFor="let m of matches"
          class="text-sm"
          [attr.data-testid]="
            'answer-display-match-' + m.leftId + '-' + m.rightId
          "
        >
          {{ getLeftText(m.leftId) }} → {{ getRightText(m.rightId) }}
        </span>
      </ng-container>

      <!-- Correct answer: show pairs with green styling and specific testid -->
      <ng-template #correctPairs>
        <span
          *ngFor="let p of meta.pairs || []"
          class="text-sm text-green-700"
          [attr.data-testid]="'answer-display-pair-' + p.id"
        >
          {{ p.left }} → {{ p.right }}
        </span>
      </ng-template>
    </div>

    <div
      *ngIf="type === 'unknown'"
      class="text-xs text-gray-400 italic"
      data-testid="answer-display-na"
    >
      N/A
    </div>
  `,
})
export class AnswerDisplayComponent {
  @Input() ans!: any;
  @Input() userAnswer!: boolean;

  get snapshot(): any {
    const raw = this.ans.questionSnapshotJson;
    if (!raw) return {};
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return raw;
  }

  get answer(): any {
    const raw = this.ans.answerJson;
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  }

  get type(): string {
    return this.snapshot.type || "unknown";
  }

  get meta(): any {
    return this.snapshot.metadata || {};
  }

  // Helpers
  hasAnswer(): boolean {
    if (this.type === "flashcard") return true;
    if (this.userAnswer) {
      if (!this.answer) return false;
      switch (this.type) {
        case "multiple_choice":
          return (
            Array.isArray(this.answer.selected) &&
            this.answer.selected.length > 0
          );
        case "single_choice":
          return this.answer.selected != null;
        case "true_false":
          return this.answer.selected != null;
        case "fill_blank":
          return (
            typeof this.answer.answer === "string" &&
            this.answer.answer.trim() !== ""
          );
        case "ordering":
          return (
            Array.isArray(this.answer.order) && this.answer.order.length > 0
          );
        case "matching":
          return (
            Array.isArray(this.answer.matches) && this.answer.matches.length > 0
          );
        default:
          return true;
      }
    } else {
      // Correct answer
      switch (this.type) {
        case "multiple_choice":
          return (
            Array.isArray(this.meta.correctAnswers) &&
            this.meta.correctAnswers.length > 0
          );
        case "single_choice":
          return (
            this.meta.correctAnswers && this.meta.correctAnswers.length > 0
          );
        case "true_false":
          return this.meta.correctAnswer != null;
        case "fill_blank":
          return (
            Array.isArray(this.meta.answers) && this.meta.answers.length > 0
          );
        case "ordering":
          return Array.isArray(this.meta.items) && this.meta.items.length > 0;
        case "matching":
          return Array.isArray(this.meta.pairs) && this.meta.pairs.length > 0;
        default:
          return false;
      }
    }
  }

  // Multiple choice
  get ids(): string[] {
    if (this.userAnswer) return this.answer?.selected || [];
    return this.meta.correctAnswers || [];
  }

  getOptionText(id: string | null): string {
    const opt = (this.meta.options || []).find(
      (o: any) => String(o.id) === String(id),
    );
    return opt?.text || id;
  }

  // Single choice
  get selectedId(): string | null {
    if (this.userAnswer) return this.answer?.selected ?? null;
    return this.meta.correctAnswers?.[0] ?? null;
  }

  // True/False
  get boolValue(): boolean | null {
    if (this.userAnswer) return this.answer?.selected ?? null;
    return this.meta.correctAnswer ?? null;
  }

  // Fill blank
  get stringValue(): string {
    if (this.userAnswer) return this.answer?.answer ?? "";
    return (this.meta.answers || []).join(" / ");
  }

  // Ordering
  get orderedItems(): any[] {
    const items = this.meta.items || [];
    if (this.userAnswer) {
      const order = this.answer?.order || [];
      return order
        .map((id: any) => items.find((i: any) => i.order_id === id))
        .filter(Boolean);
    } else {
      return [...items].sort((a, b) => a.order_id - b.order_id);
    }
  }

  // Matching
  get matches(): any[] {
    if (this.userAnswer) return this.answer?.matches || [];
    // For correct answer, return pairs with left=right (since matching is 1:1)
    return (this.meta.pairs || []).map((p: any) => ({
      leftId: p.id,
      rightId: p.id,
    }));
  }

  getLeftText(id: number): string {
    const pair = (this.meta.pairs || []).find((p: any) => p.id === id);
    return pair?.left || String(id);
  }

  getRightText(id: number): string {
    const pair = (this.meta.pairs || []).find((p: any) => p.id === id);
    return pair?.right || String(id);
  }
}
