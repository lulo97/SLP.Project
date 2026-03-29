import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  ChangeDetectorRef,
  AfterViewInit,
  TemplateRef,
} from "@angular/core";
import { MobileHeaderService } from "../../../layouts/mobile-layout/mobile-header.service";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { Subject, fromEvent, debounceTime, takeUntil, finalize } from "rxjs";

// NG-ZORRO
import { NzMessageService } from "ng-zorro-antd/message";
import { NzModalService } from "ng-zorro-antd/modal";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzToolTipModule } from "ng-zorro-antd/tooltip";
import { NzRadioModule } from "ng-zorro-antd/radio";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzModalModule } from "ng-zorro-antd/modal";

// Services
import { SourceService } from "../services/source.service";
import { LlmService } from "../../llm/llm.service";
import { TtsService } from "../../tts/tts.service";

// Components
import { SelectionBubbleComponent } from "../components/selection-bubble.component";
import { ExplanationPanelComponent } from "../components/explanation-panel.component";
import { TtsPlayerComponent } from "../../tts/tts-player.component";
import { FavoriteModalComponent } from "../components/favorite-modal.component";

// Models
import {
  SourceDetail,
  ExplanationItem,
  FavoriteRequest,
  ProgressDto,
} from "../models/source.model";
import { trigger, transition, style, animate } from "@angular/animations";

@Component({
  selector: "app-source-detail",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSpinModule,
    NzToolTipModule,
    NzRadioModule,
    NzInputModule,
    NzButtonModule,
    SelectionBubbleComponent,
    ExplanationPanelComponent,
    TtsPlayerComponent,
    NzModalModule,
  ],
  template: `
    <div
      class="fixed top-0 left-0 right-0 h-[3px] bg-black/[0.06] z-[300]"
      data-testid="reading-progress-bar-track"
    >
      <div
        class="h-full bg-gradient-to-r from-[#7c6af5] to-[#a78bfa] transition-all duration-[400ms] ease-linear rounded-r-[2px]"
        [style.width.%]="readPercent"
        data-testid="reading-progress-bar-fill"
      ></div>
    </div>

    <div>
      <ng-template #headerLeftTpl>
        <button
          class="flex items-center gap-1.5 bg-transparent border-0 cursor-pointer text-[13px] font-medium text-gray-500 py-1.5 pr-2.5 pl-1.5 rounded-[7px] transition-all duration-150 hover:text-[#1a1a2e] hover:bg-black/[0.05] font-[inherit] whitespace-nowrap"
          (click)="router.navigate(['/source'])"
          data-testid="source-detail-back-btn"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m12 19-7-7 7-7"></path>
            <path d="M19 12H5"></path>
          </svg>
          <span class="hidden sm:inline">Sources</span>
        </button>
      </ng-template>

      <ng-template #headerCenterTpl>
        <span
          *ngIf="source"
          class="text-[11px] font-semibold tracking-[0.06em] uppercase py-[3px] px-2.5 rounded-full bg-[#ede9fe] text-[#7c6af5]"
          [attr.data-type]="source.type"
          data-testid="source-detail-type-badge"
        >
          {{ typeLabel }}
        </span>
      </ng-template>

      <ng-template #headerRightTpl>
        <button
          *ngIf="savedScrollPosition > 100"
          nz-button
          nz-tooltip
          nzTooltipTitle="Resume reading"
          class="relative flex items-center gap-[5px] px-3 py-1.5 border-0 rounded-lg cursor-pointer text-xs font-medium text-[#059669] bg-[rgba(5,150,105,0.08)] font-[inherit] whitespace-nowrap transition-all duration-150 hover:bg-[rgba(5,150,105,0.15)]"
          (click)="resumeReading()"
          data-testid="source-detail-resume-btn"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon
              points="3 11 19 11 14 6 20 12 14 18 19 13 3 13 3 11"
            ></polygon>
          </svg>
          <span class="hidden sm:inline">Resume</span>
        </button>

        <button
          nz-button
          nz-tooltip
          nzTooltipTitle="Explanations"
          class="relative flex items-center gap-[5px] px-3 py-1.5 border-0 bg-transparent rounded-lg cursor-pointer text-xs font-medium text-gray-500 font-[inherit] whitespace-nowrap transition-all duration-150 hover:bg-[rgba(124,106,245,0.1)] hover:text-[#7c6af5]"
          [class.bg-[rgba(124,106,245,0.1)]]="panelOpen"
          [class.!text-[#7c6af5]]="panelOpen"
          (click)="panelOpen = !panelOpen"
          data-testid="source-detail-explanations-toggle-btn"
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
            <path
              d="M12 3v1M12 8v1M12 13v1M12 18v1M5.6 5.6l.7.7M17.6 5.6l-.7.7M5.6 18.4l.7-.7M17.6 18.4l-.7-.7"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span
            *ngIf="explanations.length"
            class="absolute top-0.5 right-1 bg-[#7c6af5] text-white text-[9px] font-bold min-w-[14px] h-[14px] rounded-[7px] flex items-center justify-center px-[3px]"
            data-testid="source-detail-explanations-badge"
          >
            {{ explanations.length }}
          </span>
        </button>

        <button
          nz-button
          nz-tooltip
          nzTooltipTitle="Font size"
          class="relative flex items-center gap-[5px] px-3 py-1.5 border-0 bg-transparent rounded-lg cursor-pointer text-xs font-medium text-gray-500 font-[inherit] whitespace-nowrap transition-all duration-150 hover:bg-[rgba(124,106,245,0.1)] hover:text-[#7c6af5]"
          (click)="cycleFontSize()"
          data-testid="source-detail-font-size-btn"
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
            <path d="M12 4v16"></path>
            <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"></path>
            <path d="M9 20h6"></path>
          </svg>
        </button>
      </ng-template>

      <main
        #scrollContainer
        class="flex-1 overflow-y-auto px-6 pt-10 pb-[120px]"
        data-testid="source-detail-main"
      >
        <div
          *ngIf="loading"
          class="max-w-[680px] mx-auto"
          data-testid="source-detail-loading"
        >
          <div
            class="skeleton-shimmer mb-4"
            style="height: 36px; width: 75%"
          ></div>
          <div
            class="skeleton-shimmer"
            style="height: 14px; width: 40%; margin-bottom: 32px"
          ></div>
          <div class="flex flex-col gap-2">
            <div
              *ngFor="let w of skeletonWidths; let i = index"
              class="skeleton-shimmer"
              style="height: 16px"
              [style.width]="w"
            ></div>
          </div>
        </div>

        <div
          *ngIf="!loading && error"
          class="max-w-[680px] mx-auto flex flex-col items-center justify-center gap-4 py-20 px-5 text-gray-400 text-center"
          data-testid="source-detail-error"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p data-testid="source-detail-error-message">{{ error }}</p>
          <button
            class="px-6 py-2 bg-[#7c6af5] text-white border-0 rounded-lg cursor-pointer text-sm font-[inherit] transition-colors hover:bg-[#6c5ce7]"
            (click)="loadSource()"
            data-testid="source-detail-retry-btn"
          >
            Try again
          </button>
        </div>

        <article
          *ngIf="!loading && source"
          #articleRef
          class="max-w-[680px] mx-auto"
          data-testid="source-detail-article"
        >
          <header
            class="mb-10 pb-8 border-b border-[#e8e4dc]"
            data-testid="source-detail-article-header"
          >
            <div class="flex items-center gap-2.5 mb-4">
              <span
                class="text-[10px] font-bold tracking-[0.1em] uppercase py-[3px] px-[9px] rounded bg-[#ede9fe] text-[#7c6af5]"
                [attr.data-type]="source.type"
                data-testid="source-detail-article-type"
                >{{ typeLabel }}</span
              >
              <span
                class="text-[13px] text-gray-400"
                data-testid="source-detail-article-date"
                >{{ formatDate(source.createdAt) }}</span
              >
            </div>
            <h1
              class="text-[clamp(26px,4vw,36px)] font-bold leading-[1.25] text-[#1a1a2e] tracking-[-0.03em] mt-0 mb-[14px]"
              data-testid="source-detail-article-title"
            >
              {{ source.title }}
            </h1>
            <div
              *ngIf="source.url"
              class="flex items-center gap-1.5 mb-3"
              data-testid="source-detail-article-url"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="gray"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                />
                <path
                  d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                />
              </svg>
              <a
                [href]="source.url"
                target="_blank"
                rel="noopener"
                class="text-xs text-[#7c6af5] no-underline break-all hover:underline"
                data-testid="source-detail-article-url-link"
                >{{ source.url }}</a
              >
            </div>
            <div
              class="text-xs text-gray-400 flex flex-wrap gap-x-0"
              data-testid="source-detail-article-stats"
            >
              <span *ngIf="wordCount" data-testid="source-detail-word-count"
                >{{ wordCount.toLocaleString() }} words</span
              >
              <span *ngIf="readTime" data-testid="source-detail-read-time"
                >&nbsp;· {{ readTime }} min read</span
              >
              <span
                *ngIf="readPercent > 0"
                class="text-[#7c6af5] font-medium"
                data-testid="source-detail-read-percent"
                >&nbsp;· {{ Math.round(readPercent) }}% read</span
              >
            </div>
          </header>

          <div
            *ngIf="showResumeToast"
            @toastAnim
            class="flex items-center gap-2.5 bg-[#1a1a2e] text-white text-[13px] font-medium px-4 py-3 rounded-[10px] mb-8 cursor-pointer shadow-[0_4px_16px_rgba(26,26,46,0.15)] transition-colors hover:bg-[#16213e]"
            (click)="resumeReading()"
            data-testid="source-detail-resume-toast"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon
                points="3 11 19 11 14 6 20 12 14 18 19 13 3 13 3 11"
              ></polygon>
            </svg>
            <span>Resume from where you left off</span>
            <button
              class="ml-auto bg-transparent border-0 text-white/50 cursor-pointer p-[2px] flex transition-colors hover:text-white"
              (click)="$event.stopPropagation(); showResumeToast = false"
              data-testid="source-detail-resume-toast-dismiss-btn"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
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
            #contentRef
            class="article-body leading-[1.82] text-[#2d2926] font-serif"
            [class.text-sm]="fontSizeIndex === 0"
            [class.text-base]="fontSizeIndex === 1"
            [class.text-lg]="fontSizeIndex === 2"
            data-testid="source-detail-content-plain"
          >
            <p *ngFor="let para of paragraphs" class="mb-[1.4em]">{{ para }}</p>
          </div>

          <div
            *ngIf="!source.rawText && !source.contentJson"
            class="flex flex-col items-center gap-3 py-[60px] px-5 text-[#c4bfb5] text-center"
            data-testid="source-detail-no-content"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p>No readable content available for this source.</p>
          </div>

          <div
            *ngIf="source.rawText || source.contentJson"
            class="flex items-center gap-4 mt-[60px] text-[#c4bfb5] text-xs tracking-[0.06em] uppercase"
            data-testid="source-detail-article-end"
          >
            <div class="flex-1 h-px bg-[#e8e4dc]"></div>
            <span>End of source</span>
            <div class="flex-1 h-px bg-[#e8e4dc]"></div>
          </div>
        </article>
      </main>
    </div>

    <app-selection-bubble
      *ngIf="!loading && source"
      [containerRef]="contentRef?.nativeElement"
      (explain)="handleExplain($event)"
      (grammar)="handleGrammar($event)"
      (tts)="handleTts($event)"
      (favorite)="handleFavorite($event)"
    />

    <app-explanation-panel
      [isOpen]="panelOpen"
      [pendingText]="pendingExplainText"
      [explanations]="explanations"
      [loading]="explanationsLoading"
      (close)="panelOpen = false"
      (open)="panelOpen = true"
      (requestExplain)="submitExplanation($event)"
      (clearPending)="pendingExplainText = ''"
    />

    <app-tts-player />
  `,
  styles: [
    `
      @keyframes shimmer {
        from {
          background-position: -600px 0;
        }
        to {
          background-position: 600px 0;
        }
      }
      .skeleton-shimmer {
        background: linear-gradient(
          90deg,
          #e8e4dc 25%,
          #f0ece3 50%,
          #e8e4dc 75%
        );
        background-size: 600px 100%;
        animation: shimmer 1.4s infinite linear;
        border-radius: 6px;
      }
      .article-body ::selection {
        background: #c4b5fd;
      }
      .article-body :deep(p) {
        margin-bottom: 1.4em;
      }
      .article-body :deep(h1),
      .article-body :deep(h2),
      .article-body :deep(h3),
      .article-body :deep(h4) {
        font-family:
          system-ui,
          -apple-system,
          sans-serif;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #1a1a2e;
        margin: 1.8em 0 0.6em;
      }
      .article-body :deep(h2) {
        font-size: 1.4em;
      }
      .article-body :deep(h3) {
        font-size: 1.2em;
      }
      .article-body :deep(blockquote) {
        border-left: 3px solid #7c6af5;
        padding-left: 18px;
        margin: 1.6em 0;
        color: #6b7280;
        font-style: italic;
      }
      .article-body :deep(code) {
        font-family: "Courier New", monospace;
        font-size: 0.88em;
        background: #f3f0ea;
        padding: 1px 5px;
        border-radius: 3px;
        color: #d63384;
      }
      .article-body :deep(pre) {
        background: #1a1a2e;
        color: #e2e8f0;
        padding: 20px;
        border-radius: 10px;
        overflow-x: auto;
        font-size: 0.85em;
        margin: 1.6em 0;
      }
      .article-body :deep(pre code) {
        background: none;
        color: inherit;
        padding: 0;
      }
      .article-body :deep(ul),
      .article-body :deep(ol) {
        padding-left: 1.6em;
        margin-bottom: 1.4em;
      }
      .article-body :deep(li) {
        margin-bottom: 0.4em;
      }
      .article-body :deep(a) {
        color: #7c6af5;
        text-decoration: underline;
        text-decoration-color: rgba(124, 106, 245, 0.3);
      }
      .article-body :deep(hr) {
        border: none;
        border-top: 1px solid #e8e4dc;
        margin: 2em 0;
      }
    `,
  ],
  animations: [
    trigger("toastAnim", [
      transition(":enter", [
        style({ opacity: 0, transform: "translateY(-10px)" }),
        animate(
          "0.25s ease",
          style({ opacity: 1, transform: "translateY(0)" }),
        ),
      ]),
      transition(":leave", [
        animate(
          "0.2s ease",
          style({ opacity: 0, transform: "translateY(-6px)" }),
        ),
      ]),
    ]),
  ],
})
export class SourceDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  Math = Math;
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private sourceService = inject(SourceService);
  private llm = inject(LlmService);
  private tts = inject(TtsService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private currentSourceId = 0;
  containerEl?: HTMLElement;
  private mobileHeaderService = inject(MobileHeaderService);

  @ViewChild("scrollContainer") scrollContainer?: ElementRef;
  @ViewChild("contentRef") contentRef?: ElementRef;

  source: SourceDetail | null = null;
  loading = true;
  error: string | null = null;

  readPercent = 0;
  savedScrollPosition = 0;
  showResumeToast = false;

  panelOpen = false;
  pendingExplainText = "";
  explanations: ExplanationItem[] = [];
  explanationsLoading = false;

  fontSizeIndex = 1; // 0=sm,1=base,2=lg
  skeletonWidths = ["100%", "94%", "100%", "87%", "96%", "100%", "78%", "100%"];

  private destroy$ = new Subject<void>();
  private scrollSaveTimer: any;

  get typeLabel(): string {
    const map: Record<string, string> = {
      pdf: "PDF",
      link: "URL",
      text: "Text",
    };
    return (
      map[this.source?.type ?? ""] ?? (this.source?.type ?? "").toUpperCase()
    );
  }

  get paragraphs(): string[] {
    return (this.source?.rawText ?? "")
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  get wordCount(): number {
    const t = this.source?.rawText?.trim() ?? "";
    return t ? t.split(/\s+/).length : 0;
  }

  get readTime(): number {
    return this.wordCount ? Math.ceil(this.wordCount / 200) : 0;
  }

  @ViewChild("headerLeftTpl", { static: true })
  headerLeftTpl!: TemplateRef<unknown>;
  @ViewChild("headerCenterTpl", { static: true })
  headerCenterTpl!: TemplateRef<unknown>;
  @ViewChild("headerRightTpl", { static: true })
  headerRightTpl!: TemplateRef<unknown>;

  ngAfterViewInit(): void {
    this.containerEl = this.contentRef?.nativeElement;

    this.mobileHeaderService.setHeader({
      left: this.headerLeftTpl,
      center: this.headerCenterTpl,
      right: this.headerRightTpl,
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (id) {
      this.currentSourceId = id;
      this.loadSource(id);
    }
    fromEvent(window, "scroll")
      .pipe(debounceTime(50), takeUntil(this.destroy$))
      .subscribe(() => this.onScroll());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.mobileHeaderService.clearHeader();

    if (this.scrollSaveTimer) clearTimeout(this.scrollSaveTimer);
    // Save final progress
    const id = Number(this.route.snapshot.paramMap.get("id"));
    if (id) {
      const scrollTop = window.scrollY;
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const percent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      this.sourceService
        .updateProgress(id, {
          lastPosition: {
            scrollPosition: Math.round(scrollTop),
            percentComplete: Math.round(percent),
          },
        })
        .subscribe({ error: () => {} });
    }
  }

  private cdr = inject(ChangeDetectorRef);

  loadSource(id: number = this.currentSourceId): void {
    this.currentSourceId = id;
    this.loading = true;
    this.error = null;
    this.sourceService.getSourceDetail(id).subscribe({
      next: (src) => {
        this.source = src;
        this.loadProgress(id);
        this.loadExplanations(id);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || "Could not load this source.";
        this.loading = false;
      },
    });
  }

  loadProgress(id: number): void {
    this.sourceService.getProgress(id).subscribe({
      next: (prog) => {
        const pos = prog.lastPosition?.scrollPosition;
        if (pos && pos > 100) {
          this.savedScrollPosition = pos;
          this.readPercent = prog.lastPosition?.percentComplete ?? 0;
          this.showResumeToast = true;
        }
      },
      error: () => {},
    });
  }

  loadExplanations(id: number): void {
    this.explanationsLoading = true;
    this.sourceService.getExplanations(id).subscribe({
      next: (exps) => {
        this.explanations = exps;
        this.explanationsLoading = false;
      },
      error: () => {
        this.explanationsLoading = false;
      },
    });
  }

  onScroll(): void {
    const scrollTop = window.scrollY;
    const scrollHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    this.readPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

    if (this.scrollSaveTimer) clearTimeout(this.scrollSaveTimer);
    this.scrollSaveTimer = setTimeout(() => {
      const id = Number(this.route.snapshot.paramMap.get("id"));
      if (id) {
        this.sourceService
          .updateProgress(id, {
            lastPosition: {
              scrollPosition: Math.round(scrollTop),
              percentComplete: Math.round(this.readPercent),
            },
          })
          .subscribe({ error: () => {} });
        this.savedScrollPosition = Math.round(scrollTop);
      }
    }, 800);
  }

  resumeReading(): void {
    this.showResumeToast = false;
    window.scrollTo({ top: this.savedScrollPosition, behavior: "smooth" });
  }

  cycleFontSize(): void {
    this.fontSizeIndex = (this.fontSizeIndex + 1) % 3;
    this.message.info("Font size changed");
  }

  handleExplain(text: string): void {
    this.pendingExplainText = text;
    this.panelOpen = true;
    window.getSelection()?.removeAllRanges();
  }

  submitExplanation(text: string): void {
    this.pendingExplainText = "";
    const sourceId = Number(this.route.snapshot.paramMap.get("id"));
    const placeholder: ExplanationItem = {
      id: Date.now(),
      sourceId,
      textRange: { text },
      content: "",
      authorType: "user",
      editable: true,
      createdAt: new Date().toISOString(),
    };
    this.explanations.unshift(placeholder);

    this.llm.requestExplanation({ sourceId, selectedText: text }).subscribe({
      next: (explanationText) => {
        this.sourceService
          .createExplanation({
            sourceId,
            textRange: { text },
            content: explanationText,
          })
          .subscribe({
            next: (saved) => {
              const idx = this.explanations.findIndex(
                (e) => e.id === placeholder.id,
              );
              if (idx !== -1) this.explanations[idx] = saved;
            },
            error: () => {
              const idx = this.explanations.findIndex(
                (e) => e.id === placeholder.id,
              );
              if (idx !== -1) this.explanations.splice(idx, 1);
              this.message.error("Failed to save explanation");
            },
          });
      },
      error: () => {
        const idx = this.explanations.findIndex((e) => e.id === placeholder.id);
        if (idx !== -1) this.explanations.splice(idx, 1);
        this.message.error("Failed to generate explanation");
      },
    });
  }

  handleGrammar(text: string): void {
    window.getSelection()?.removeAllRanges();
    const loadingRef = this.message.loading("Checking grammar...", {
      nzDuration: 0,
    });

    this.llm.requestGrammarCheck({ text }).subscribe({
      next: (corrected) => {
        this.message.remove(loadingRef.messageId);
        this.modal.info({
          nzTitle: "Grammar Check Result",
          nzContent: `
            <div><strong>Input text:</strong></div>
            <div style="margin-bottom:16px;color:#666;">${escapeHtml(text)}</div>
            <div><strong>Corrected text:</strong></div>
            <div style="color:#059669;">${escapeHtml(corrected)}</div>
          `,
          nzOkText: "Close",
          nzWidth: 600,
        });
      },
      error: () => {
        const loadingRef = this.message.loading("Checking grammar...", {
          nzDuration: 0,
        });
        this.message.remove(loadingRef.messageId);
        this.message.error("Grammar check failed");
      },
    });
  }

  handleTts(text: string): void {
    window.getSelection()?.removeAllRanges();
    this.tts.play(text);
  }

  handleFavorite(text: string): void {
    const modalRef = this.modal.create({
      nzTitle: "Save to Favorites",
      nzContent: FavoriteModalComponent,
      nzData: { text },
      nzOkText: "Save",
      nzOkLoading: false,
      nzOnOk: (comp: FavoriteModalComponent) => comp.submit(),
      nzCancelText: "Cancel",
    });

    modalRef.afterClose.subscribe((result) => {
      if (result) {
        this.sourceService.createFavorite(result).subscribe({
          next: () => this.message.success("Saved to favorites"),
          error: () => this.message.error("Failed to save"),
        });
      }
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}
