import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'vi';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  language(language: any = 'vi') {
    return 'vi'
    throw new Error('Method not implemented.');
  }
  private readonly THEME_KEY = 'app_theme';
  private readonly LANGUAGE_KEY = 'app_language';

  private themeSubject = new BehaviorSubject<Theme>(this.getInitialTheme());
  public theme$ = this.themeSubject.asObservable();

  private languageSubject = new BehaviorSubject<Language>(this.getInitialLanguage());
  public language$ = this.languageSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
    this.languageSubject.subscribe(lang => {
      localStorage.setItem(this.LANGUAGE_KEY, lang);
    });
  }

  private getInitialTheme(): Theme {
    const stored = localStorage.getItem(this.THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  private getInitialLanguage(): Language {
    const stored = localStorage.getItem(this.LANGUAGE_KEY);
    if (stored === 'en' || stored === 'vi') return stored;
    return 'en'; // default
  }

  setTheme(theme: Theme): void {
    if (theme === this.themeSubject.value) return;
    this.themeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  get currentTheme(): Theme {
    return this.themeSubject.value;
  }

  get currentLanguage(): Language {
    return this.languageSubject.value;
  }

  setLanguage(lang: Language): void {
    if (lang === this.languageSubject.value) return;
    this.languageSubject.next(lang);
    // The actual language change will be handled by the TranslateService
    // in the component or via a subscription in a higher-level service.
  }
}