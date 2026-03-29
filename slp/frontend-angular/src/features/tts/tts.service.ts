import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TtsState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

@Injectable({ providedIn: 'root' })
export class TtsService {
  private stateSubject = new BehaviorSubject<TtsState>('idle');
  public state$ = this.stateSubject.asObservable();

  private textSubject = new BehaviorSubject<string>('');
  public text$ = this.textSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  private audio: HTMLAudioElement | null = null;
  private onCanPlay: (() => void) | null = null;
  private onEnded: (() => void) | null = null;
  private onPause: (() => void) | null = null;
  private onPlay: (() => void) | null = null;
  private onError: (() => void) | null = null;

  private ttsBaseUrl = import.meta.env?.['VITE_TTS_URL'] || 'http://localhost:3005';

  play(text: string): void {
    this.stop();
    this.textSubject.next(text);
    this.errorSubject.next(null);
    this.stateSubject.next('loading');

    const url = `${this.ttsBaseUrl}/tts?text=${encodeURIComponent(text)}`;
    const el = new Audio(url);
    this.audio = el;

    this.onCanPlay = () => {
      this.stateSubject.next('playing');
      el.play().catch(() => {
        this.stateSubject.next('error');
        this.errorSubject.next('Playback blocked — interact with the page first.');
      });
    };
    this.onEnded = () => this.stateSubject.next('idle');
    this.onPause = () => {
      if (this.stateSubject.value === 'playing') this.stateSubject.next('paused');
    };
    this.onPlay = () => this.stateSubject.next('playing');
    this.onError = () => {
      this.stateSubject.next('error');
      this.errorSubject.next('Failed to load audio from TTS server.');
    };

    el.addEventListener('canplay', this.onCanPlay);
    el.addEventListener('ended', this.onEnded);
    el.addEventListener('pause', this.onPause);
    el.addEventListener('play', this.onPlay);
    el.addEventListener('error', this.onError);
  }

  togglePause(): void {
    if (!this.audio) return;
    if (this.stateSubject.value === 'playing') this.audio.pause();
    else if (this.stateSubject.value === 'paused') this.audio.play();
  }

  stop(): void {
    if (this.audio) {
      if (this.onCanPlay) this.audio.removeEventListener('canplay', this.onCanPlay);
      if (this.onEnded) this.audio.removeEventListener('ended', this.onEnded);
      if (this.onPause) this.audio.removeEventListener('pause', this.onPause);
      if (this.onPlay) this.audio.removeEventListener('play', this.onPlay);
      if (this.onError) this.audio.removeEventListener('error', this.onError);
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.stateSubject.next('idle');
    this.errorSubject.next(null);
    this.textSubject.next('');
  }
}