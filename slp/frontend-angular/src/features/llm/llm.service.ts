import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../services/api-client.service';

@Injectable({ providedIn: 'root' })
export class LlmService {
  private api = inject(ApiClientService);

  requestExplanation(payload: { sourceId: number; selectedText: string; context?: string }): Observable<string> {
    return this.api.post<string>('/llm/explain', payload);
  }

  requestGrammarCheck(payload: { text: string }): Observable<string> {
    return this.api.post<string>('/llm/grammar', payload);
  }
}