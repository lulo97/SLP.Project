import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  constructor(private translate: TranslateService) {}

  setLanguage(lang: string): void {
    this.translate.use(lang);
    localStorage.setItem('app_language', lang);
  }

  getCurrentLanguage(): string {
    return this.translate.currentLang;
  }
}