import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  HostListener,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { animate, style, transition, trigger } from "@angular/animations";

@Component({
  selector: "app-selection-bubble",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="visible"
      #bubbleRef
      @bubbleAnim
      class="fixed z-[9999] w-max pointer-events-auto [filter:drop-shadow(0_4px_16px_rgba(0,0,0,0.12))]"
      [style.left.px]="position.x"
      [style.top.px]="position.y"
      (mousedown)="$event.preventDefault()"
      data-testid="selection-bubble"
    >
      <div
        class="flex items-center bg-white border border-[#e5e7eb] rounded-[10px] p-1 gap-0.5"
        data-testid="selection-bubble-bar"
      >
        <button
          class="flex items-center gap-[5px] flex-1 justify-center px-2 py-1.5 border-0 bg-transparent text-gray-700 rounded-[7px] cursor-pointer text-xs font-medium whitespace-nowrap font-[inherit] transition-all duration-[120ms] hover:bg-[#f3f4f6] hover:text-gray-900"
          (click)="emitExplain()"
          data-testid="selection-bubble-explain-btn"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M12 3v1M12 8v1M12 13v1M12 18v1M5.6 5.6l.7.7M17.6 5.6l-.7.7M5.6 18.4l.7-.7M17.6 18.4l-.7-.7"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Explain
        </button>
        <button
          class="flex items-center gap-[5px] flex-1 justify-center px-2 py-1.5 border-0 bg-transparent text-gray-700 rounded-[7px] cursor-pointer text-xs font-medium whitespace-nowrap font-[inherit] transition-all duration-[120ms] hover:bg-[#f3f4f6] hover:text-gray-900"
          (click)="emitGrammar()"
          data-testid="selection-bubble-grammar-btn"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Grammar
        </button>
        <button
          class="flex items-center gap-[5px] flex-1 justify-center px-2 py-1.5 border-0 bg-transparent text-gray-700 rounded-[7px] cursor-pointer text-xs font-medium whitespace-nowrap font-[inherit] transition-all duration-[120ms] hover:bg-[#f3f4f6] hover:text-gray-900"
          (click)="emitTts()"
          data-testid="selection-bubble-listen-btn"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
          Listen
        </button>
        <button
          class="flex items-center gap-[5px] flex-1 justify-center px-2 py-1.5 border-0 bg-transparent text-gray-700 rounded-[7px] cursor-pointer text-xs font-medium whitespace-nowrap font-[inherit] transition-all duration-[120ms] hover:bg-[#f3f4f6] hover:text-gray-900"
          (click)="emitFavorite()"
          data-testid="selection-bubble-save-btn"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          Save
        </button>
      </div>
      <div class="bubble-arrow"></div>
    </div>
  `,
  styles: [
    `
      [data-testid="selection-bubble"] {
        transform: translateX(-50%);
      }
      .bubble-arrow {
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid #e5e7eb;
      }
      .bubble-arrow::after {
        content: "";
        position: absolute;
        top: -7px;
        left: -5px;
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 5px solid #ffffff;
      }
    `,
  ],
  animations: [
    trigger("bubbleAnim", [
      transition(":enter", [
        style({
          opacity: 0,
          transform: "translateX(-50%) translateY(6px) scale(0.94)",
        }),
        animate(
          "0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
          style({
            opacity: 1,
            transform: "translateX(-50%) translateY(0) scale(1)",
          }),
        ),
      ]),
      transition(":leave", [
        animate(
          "0.1s ease",
          style({
            opacity: 0,
            transform: "translateX(-50%) translateY(-3px) scale(0.97)",
          }),
        ),
      ]),
    ]),
  ],
})
export class SelectionBubbleComponent implements AfterViewInit, OnDestroy {
  @Input() containerRef?: HTMLElement;
  @Output() explain = new EventEmitter<string>();
  @Output() grammar = new EventEmitter<string>();
  @Output() tts = new EventEmitter<string>();
  @Output() favorite = new EventEmitter<string>();

  visible = false;
  selectedText = "";
  position = { x: 0, y: 0 };
  private bubbleHeight = 40;

  ngAfterViewInit() {
    document.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("selectionchange", this.onSelectionChange);
  }

  ngOnDestroy() {
    document.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("selectionchange", this.onSelectionChange);
  }

  private onMouseUp = () => setTimeout(() => this.handleSelection(), 10);
  private onMouseDown = (e: MouseEvent) => {
    if (
      this.visible &&
      (e.target as HTMLElement).closest('[data-testid="selection-bubble"]')
    )
      return;
    this.visible = false;
  };
  private onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      this.visible = false;
      window.getSelection()?.removeAllRanges();
    } else setTimeout(() => this.handleSelection(), 10);
  };
  private onSelectionChange = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) this.visible = false;
  };

  private handleSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      this.visible = false;
      return;
    }
    const text = selection.toString().trim();
    if (text.length < 2) {
      this.visible = false;
      return;
    }
    if (this.containerRef) {
      const anchor = selection.anchorNode;
      const element =
        anchor instanceof HTMLElement ? anchor : anchor?.parentElement;

      if (
        this.containerRef &&
        element &&
        !this.containerRef.contains(element)
      ) {
        this.visible = false;
        return;
      }
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    let x = rect.left + rect.width / 2; // just the center point
    let y = rect.top - this.bubbleHeight - 14;

    if (rect.top < this.bubbleHeight + 20) y = rect.bottom + 14;

    this.selectedText = text;
    this.position = { x, y };
    this.visible = true;
  }

  emitExplain() {
    this.explain.emit(this.selectedText);
    this.visible = false;
  }
  emitGrammar() {
    this.grammar.emit(this.selectedText);
    this.visible = false;
  }
  emitTts() {
    this.tts.emit(this.selectedText);
    this.visible = false;
  }
  emitFavorite() {
    this.favorite.emit(this.selectedText);
    this.visible = false;
  }
}
