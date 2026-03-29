import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { TtsService } from './tts.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-tts-player',
  standalone: true,
  imports: [CommonModule, NzSpinModule],
  template: `
    <div *ngIf="(state$ | async) !== 'idle'"
         @playerAnim
         class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9100]
                flex items-center gap-3 px-4 py-2.5 rounded-[28px]
                bg-[#1a1a2e] text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)]
                min-w-[260px] max-w-[420px]"
         data-testid="tts-player">
      <nz-spin *ngIf="(state$ | async) === 'loading'" nzSimple class="[&_.ant-spin-dot-item]:bg-white" />

      <button *ngIf="(state$ | async) !== 'loading'"
              class="flex-shrink-0 w-8 h-8 rounded-full bg-[#7c6af5] flex items-center
                     justify-center border-0 cursor-pointer transition-colors hover:bg-[#6c5ce7]"
              (click)="togglePause()"
              data-testid="tts-player-toggle">
        <svg *ngIf="(state$ | async) === 'playing'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        <svg *ngIf="(state$ | async) !== 'playing'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      </button>

      <span class="flex-1 text-xs text-white/80 truncate" data-testid="tts-player-text">
        {{ truncate((text$ | async) || '', 48) }}
      </span>

      <span *ngIf="(state$ | async) === 'error'" class="text-[10px] text-red-300 shrink-0" data-testid="tts-player-error">
        Error
      </span>

      <button class="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center
                     justify-center border-0 cursor-pointer transition-colors hover:bg-white/20"
              (click)="stop()"
              data-testid="tts-player-stop">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `,
  animations: [
    trigger('playerAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-50%) translateY(16px) scale(0.92)' }),
        animate('0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'translateX(-50%) translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('0.18s ease', style({ opacity: 0, transform: 'translateX(-50%) translateY(10px) scale(0.96)' }))
      ])
    ])
  ]
})
export class TtsPlayerComponent {
  private tts = inject(TtsService);
  state$ = this.tts.state$;
  text$ = this.tts.text$;

  togglePause() { this.tts.togglePause(); }
  stop() { this.tts.stop(); }

  truncate(text: string, max: number): string {
    return text.length <= max ? text : text.slice(0, max) + '…';
  }
}