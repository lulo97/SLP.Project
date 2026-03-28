// src/features/quiz-attempt/components/matching-question.component.ts

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ViewChildren,
  QueryList,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { NzButtonModule } from "ng-zorro-antd/button";

interface Pair {
  id: number;
  left: string;
  right: string;
}

interface Line {
  leftId: number;
  rightId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  d: string;
}

@Component({
  selector: "app-matching-question",
  standalone: true,
  imports: [CommonModule, NzButtonModule],
  template: `
    <div #container class="relative" data-testid="matching-container">
      <svg
        class="absolute inset-0 pointer-events-none"
        style="z-index: 1; overflow: visible;"
        [attr.width]="svgWidth"
        [attr.height]="svgHeight"
        data-testid="matching-svg"
      >
        <path
          *ngFor="let line of lines; let i = index"
          [attr.d]="line.d"
          fill="none"
          [attr.stroke]="lineColors[i % lineColors.length]"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.65"
          [attr.data-testid]="
            'matching-line-' + line.leftId + '-' + line.rightId
          "
        />
        <circle
          *ngFor="let line of lines; let i = index"
          [attr.cx]="line.x1"
          [attr.cy]="line.y1"
          r="3.5"
          [attr.fill]="lineColors[i % lineColors.length]"
          opacity="0.7"
        />
        <circle
          *ngFor="let line of lines; let i = index"
          [attr.cx]="line.x2"
          [attr.cy]="line.y2"
          r="3.5"
          [attr.fill]="lineColors[i % lineColors.length]"
          opacity="0.7"
        />
      </svg>

      <div class="grid grid-cols-2 gap-6">
        <!-- Left column -->
        <div class="flex flex-col gap-2" data-testid="matching-left-column">
          <div
            *ngFor="let item of pairs"
            #leftItem
            [attr.data-id]="item.id"
            (click)="selectLeft(item.id)"
            class="px-3 py-2.5 rounded-xl border-2 cursor-pointer select-none transition-all text-sm relative z-10"
            [class.border-indigo-500]="selectedLeft === item.id"
            [class.bg-indigo-50]="selectedLeft === item.id"
            [class.text-indigo-700]="selectedLeft === item.id"
            [class.border-green-500]="isMatched(item.id, 'left')"
            [class.bg-green-50]="isMatched(item.id, 'left')"
            [class.text-green-700]="isMatched(item.id, 'left')"
            [class.border-gray-200]="
              !isMatched(item.id, 'left') && selectedLeft !== item.id
            "
            [class.bg-white]="
              !isMatched(item.id, 'left') && selectedLeft !== item.id
            "
            [class.hover:border-indigo-300]="!isMatched(item.id, 'left')"
            [attr.data-testid]="'matching-left-' + item.id"
            [attr.data-matched]="isMatched(item.id, 'left')"
            [attr.data-selected]="selectedLeft === item.id"
          >
            <span class="flex items-center gap-2">
              <span
                *ngIf="isMatched(item.id, 'left')"
                class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[10px] shrink-0"
                [attr.data-testid]="'matching-left-check-' + item.id"
              >
                ✓
              </span>
              <span [attr.data-testid]="'matching-left-text-' + item.id">
                {{ item.left }}
              </span>
            </span>
          </div>
        </div>

        <!-- Right column -->
        <div class="flex flex-col gap-2" data-testid="matching-right-column">
          <div
            *ngFor="let item of shuffledRight"
            #rightItem
            [attr.data-id]="item.id"
            (click)="selectRight(item.id)"
            class="px-3 py-2.5 rounded-xl border-2 cursor-pointer select-none transition-all text-sm relative z-10"
            [class.border-green-500]="isMatched(item.id, 'right')"
            [class.bg-green-50]="isMatched(item.id, 'right')"
            [class.text-green-700]="isMatched(item.id, 'right')"
            [class.border-dashed]="
              !isMatched(item.id, 'right') && selectedLeft !== null
            "
            [class.border-indigo-300]="
              !isMatched(item.id, 'right') && selectedLeft !== null
            "
            [class.bg-indigo-50]="
              !isMatched(item.id, 'right') && selectedLeft !== null
            "
            [class.border-gray-200]="
              !isMatched(item.id, 'right') && selectedLeft === null
            "
            [class.bg-white]="
              !isMatched(item.id, 'right') && selectedLeft === null
            "
            [class.hover:border-indigo-500]="
              !isMatched(item.id, 'right') && selectedLeft !== null
            "
            [attr.data-testid]="'matching-right-' + item.id"
            [attr.data-matched]="isMatched(item.id, 'right')"
          >
            <span [attr.data-testid]="'matching-right-text-' + item.id">
              {{ item.right }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mt-3">
        <span class="text-xs text-gray-400" data-testid="matching-progress">
          {{ value.length }} / {{ pairs.length }} matched
        </span>
        <button
          nz-button
          nzSize="small"
          nzDanger
          nzGhost
          (click)="reset()"
          [disabled]="value.length === 0"
          data-testid="matching-reset"
        >
          Reset
        </button>
      </div>

      <div
        *ngIf="value.length === pairs.length && pairs.length > 0"
        class="mt-2 text-center text-sm text-green-600 font-medium"
        data-testid="matching-complete"
      >
        ✓ All pairs matched!
      </div>
    </div>
  `,
})
export class MatchingQuestionComponent
  implements AfterViewInit, OnDestroy, OnInit
{
  @Input() pairs: Pair[] = [];
  @Input() value: Array<{ leftId: number; rightId: number }> = [];
  @Output() valueChange = new EventEmitter<
    Array<{ leftId: number; rightId: number }>
  >();

  @ViewChild("container") container!: ElementRef<HTMLElement>;
  @ViewChildren("leftItem") leftItems!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren("rightItem") rightItems!: QueryList<ElementRef<HTMLElement>>;

  selectedLeft: number | null = null;
  shuffledRight: Pair[] = [];
  lines: Line[] = [];
  svgWidth = 0;
  svgHeight = 0;
  lineColors = [
    "#6366f1",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
  ];

  private resizeObserver?: ResizeObserver;
  private leftRefs = new Map<number, HTMLElement>();
  private rightRefs = new Map<number, HTMLElement>();

  ngOnInit(): void {
    // Shuffle right column
    this.shuffledRight = [...this.pairs].sort(() => Math.random() - 0.5);
  }

  ngAfterViewInit(): void {
    this.updateRefs();
    // Re‑populate refs if the QueryList changes (e.g., after content projection)
    this.leftItems.changes.subscribe(() => this.updateRefs());
    this.rightItems.changes.subscribe(() => this.updateRefs());

    // Rest of existing ngAfterViewInit (ResizeObserver, etc.)
    this.resizeObserver = new ResizeObserver(() => this.computeLines());
    this.resizeObserver.observe(this.container.nativeElement);
    setTimeout(() => this.computeLines(), 0);
  }
  private updateRefs(): void {
    // Clear maps first (they might have changed)
    this.leftRefs.clear();
    this.rightRefs.clear();

    this.leftItems.forEach((el) => {
      const id = parseInt(el.nativeElement.getAttribute("data-id")!, 10);
      if (!isNaN(id)) this.leftRefs.set(id, el.nativeElement);
    });

    this.rightItems.forEach((el) => {
      const id = parseInt(el.nativeElement.getAttribute("data-id")!, 10);
      if (!isNaN(id)) this.rightRefs.set(id, el.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  isMatched(id: number, side: "left" | "right"): boolean {
    return this.value.some((m) =>
      side === "left" ? m.leftId === id : m.rightId === id,
    );
  }

  selectLeft(id: number): void {
    // If already selected, just clear selection (no change to matches)
    if (this.selectedLeft === id) {
      this.selectedLeft = null;
      return;
    }

    // Remove any existing match that uses this leftId
    const newMatches = this.value.filter((m) => m.leftId !== id);
    if (newMatches.length !== this.value.length) {
      this.valueChange.emit(newMatches);
    }

    // Select this left item for pairing
    this.selectedLeft = id;
  }

  selectRight(id: number): void {
    if (this.selectedLeft === null) return;
    if (this.isMatched(id, "right")) return;
    const newMatches = [
      ...this.value,
      { leftId: this.selectedLeft, rightId: id },
    ];
    this.valueChange.emit(newMatches);
    this.selectedLeft = null;
  }

  reset(): void {
    this.valueChange.emit([]);
    this.selectedLeft = null;
  }

  private computeLines(): void {
    const containerRect = this.container.nativeElement.getBoundingClientRect();
    this.svgWidth = containerRect.width;
    this.svgHeight = containerRect.height;

    const newLines: Line[] = [];
    for (const match of this.value) {
      const leftEl = this.leftRefs.get(match.leftId);
      const rightEl = this.rightRefs.get(match.rightId);
      if (!leftEl || !rightEl) continue;

      const leftRect = leftEl.getBoundingClientRect();
      const rightRect = rightEl.getBoundingClientRect();

      const x1 = leftRect.right - containerRect.left;
      const y1 = leftRect.top + leftRect.height / 2 - containerRect.top;
      const x2 = rightRect.left - containerRect.left;
      const y2 = rightRect.top + rightRect.height / 2 - containerRect.top;
      const cx = (x1 + x2) / 2;

      newLines.push({
        leftId: match.leftId,
        rightId: match.rightId,
        x1,
        y1,
        x2,
        y2,
        d: `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`,
      });
    }
    this.lines = newLines;
  }

  // Helper to set element references
  setLeftRef(id: number, el: HTMLElement) {
    if (el) this.leftRefs.set(id, el);
    else this.leftRefs.delete(id);
  }
  setRightRef(id: number, el: HTMLElement) {
    if (el) this.rightRefs.set(id, el);
    else this.rightRefs.delete(id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["value"] && !changes["value"].firstChange) {
      // Ensure refs are ready and compute lines
      setTimeout(() => this.computeLines(), 0);
    }
  }
}
