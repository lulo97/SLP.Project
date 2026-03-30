import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NzSpinModule } from "ng-zorro-antd/spin";
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from "@angular/animations";
import { ExplanationItem } from "../models/source.model";

@Component({
  selector: "app-explanation-panel",
  standalone: true,
  imports: [CommonModule, NzSpinModule],
  template: `
    <div
      class="fixed top-0 right-0 h-screen w-[320px] bg-[#faf9f6] border-l border-[#e8e4dc] shadow-[-4px_0_24px_rgba(0,0,0,0.06)] z-[200] flex flex-col"
      [@panelAnim]="isOpen ? 'open' : 'closed'"
      data-testid="explanation-panel"
    >
      <button
        class="absolute left-[-32px] top-1/2 -translate-y-1/2 w-8 h-12 bg-[#faf9f6] border border-[#e8e4dc] border-r-0 rounded-l-[8px] cursor-pointer flex items-center justify-center text-gray-400 transition-colors hover:text-gray-700"
        (click)="isOpen ? close.emit() : open.emit()"
        data-testid="explanation-panel-toggle-btn"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <div class="flex-1 overflow-y-auto flex flex-col">
        <div
          class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e8e4dc]"
        >
          <div class="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7c6af5"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M12 3v1M12 8v1M12 13v1M12 18v1M5.6 5.6l.7.7M17.6 5.6l-.7.7M5.6 18.4l.7-.7M17.6 18.4l-.7-.7"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <h3
              class="text-sm font-semibold text-[#1a1a2e] m-0 tracking-[-0.01em]"
            >
              Explanations
            </h3>
          </div>
          <button
            class="bg-transparent border-0 text-gray-400 cursor-pointer p-1 rounded transition-all hover:text-gray-700 hover:bg-gray-100"
            (click)="close.emit()"
            data-testid="explanation-panel-close-btn"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div
          *ngIf="pendingText"
          class="m-4 p-[14px] bg-white border border-[#e8e4dc] rounded-[10px]"
          data-testid="explanation-panel-preview"
        >
          <p
            class="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mt-0 mb-2"
          >
            Selected text
          </p>
          <blockquote
            class="text-[13px] text-gray-700 italic border-l-[3px] border-[#7c6af5] pl-[10px] mt-0 mb-3 leading-[1.5]"
            data-testid="explanation-panel-preview-text"
          >
            {{ truncate(pendingText, 120) }}
          </blockquote>
          <div class="flex gap-2">
            <button
              class="flex items-center gap-[5px] px-3 py-1.5 rounded-[7px] text-xs font-medium cursor-pointer border-0 bg-[#7c6af5] text-white font-[inherit] transition-all hover:bg-[#6c5ce7]"
              (click)="requestExplain.emit(pendingText)"
              data-testid="explanation-panel-explain-btn"
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
              Explain with AI
            </button>
            <button
              class="flex items-center gap-[5px] px-3 py-1.5 rounded-[7px] text-xs font-medium cursor-pointer border border-[#e8e4dc] bg-white text-gray-700 font-[inherit] transition-all hover:bg-gray-50 hover:border-gray-300"
              (click)="clearPending.emit()"
              data-testid="explanation-panel-clear-btn"
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
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Clear
            </button>
          </div>
        </div>

        <div
          *ngIf="loading"
          class="flex flex-col items-center justify-center gap-3 px-5 py-10 text-gray-400 text-[13px] text-center flex-1"
          data-testid="explanation-panel-loading"
        >
          <nz-spin nzSimple size="small"></nz-spin>
          <span>Loading...</span>
        </div>

        <div
          *ngIf="!loading && explanations.length === 0 && !pendingText"
          class="flex flex-col items-center justify-center gap-3 px-5 py-10 text-gray-400 text-[13px] text-center flex-1"
          data-testid="explanation-panel-empty"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-gray-300"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          <p>Select text in the article to get AI explanations.</p>
        </div>

        <div
          *ngIf="!loading && (explanations.length > 0 || pendingText)"
          class="py-3 px-4 flex flex-col gap-3"
          data-testid="explanation-panel-list"
        >
          <div
            *ngFor="let exp of explanations; trackBy: trackById"
            class="bg-white border border-[#e8e4dc] rounded-[10px] p-[14px] transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
            [attr.data-testid]="'explanation-panel-card-' + exp.id"
          >
            <div
              class="text-xs text-gray-500 italic mb-2 leading-[1.4]"
              [attr.data-testid]="'explanation-panel-card-quote-' + exp.id"
            >
              <span
                class="text-lg text-[#7c6af5] leading-none align-[-4px] mr-0.5"
                >"</span
              >
              {{ truncate(exp.textRange?.text ?? "", 80) }}
            </div>
            <div
              *ngIf="exp.content"
              class="text-[13px] text-gray-700 leading-[1.6]"
              [attr.data-testid]="'explanation-panel-card-content-' + exp.id"
            >
              {{ exp.content }}
            </div>
            <div
              *ngIf="!exp.content"
              class="flex items-center gap-2 text-xs text-gray-400"
              [attr.data-testid]="'explanation-panel-card-pending-' + exp.id"
            >
              <nz-spin nzSimple size="small"></nz-spin>
              <span>Generating explanation…</span>
            </div>
            <div
              class="text-[11px] text-[#c4bfb5] mt-2"
              [attr.data-testid]="'explanation-panel-card-meta-' + exp.id"
            >
              {{ formatDate(exp.createdAt) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  animations: [
    trigger("panelAnim", [
      state("open", style({ transform: "translateX(0)" })),
      state("closed", style({ transform: "translateX(100%)" })),
      transition(
        "closed => open",
        animate("280ms cubic-bezier(0.4, 0, 0.2, 1)"),
      ),
      transition(
        "open => closed",
        animate("280ms cubic-bezier(0.4, 0, 0.2, 1)"),
      ),
    ]),
  ],
})
export class ExplanationPanelComponent {
  @Input() isOpen = false;
  @Input() pendingText: string | null = null;
  @Input() explanations: ExplanationItem[] = [];
  @Input() loading = false;

  @Output() close = new EventEmitter<void>();
  @Output() open = new EventEmitter<void>();
  @Output() requestExplain = new EventEmitter<string>();
  @Output() clearPending = new EventEmitter<void>();

  truncate(text: string, max: number): string {
    return text.length <= max ? text : text.slice(0, max) + "…";
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  trackById(_: number, item: ExplanationItem) {
    return item.id;
  }
}
