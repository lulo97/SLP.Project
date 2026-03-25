import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'vi';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly THEME_KEY = 'app_theme';
  private readonly LANGUAGE_KEY = 'app_language';

  // 1. Single Source of Truth: Signals only
  theme = signal<Theme>(this.getInitialTheme());
  language = signal<Language>(this.getInitialLanguage());

  constructor() {
    // 2. Automatically sync to LocalStorage and DOM when signals change
    effect(() => {
      const currentTheme = this.theme();
      localStorage.setItem(this.THEME_KEY, currentTheme);
      this.applyTheme(currentTheme);
    });

    effect(() => {
      localStorage.setItem(this.LANGUAGE_KEY, this.language());
    });
  }

  // 3. Simple methods to update state
  setTheme(newTheme: Theme): void {
    this.theme.set(newTheme);
  }

  setLanguage(lang: Language): void {
    this.language.set(lang);
  }

  private applyTheme(theme: Theme): void {
    // Toggles the 'dark' class on <html> for Tailwind/CSS support
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  private getInitialTheme(): Theme {
    const stored = localStorage.getItem(this.THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private getInitialLanguage(): Language {
    const stored = localStorage.getItem(this.LANGUAGE_KEY);
    return (stored === 'en' || stored === 'vi') ? stored : 'en';
  }
}