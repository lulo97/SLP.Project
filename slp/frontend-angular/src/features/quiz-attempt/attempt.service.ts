// src/features/quiz-attempt/attempt.service.ts

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../services/api-client.service';
import {
  Attempt,
  AttemptReview,
  StartAttemptResponse,
} from './attempt.model';

@Injectable({ providedIn: 'root' })
export class AttemptService {
  constructor(private apiClient: ApiClientService) {}

  startAttempt(quizId: number, randomizeOrder = false): Observable<StartAttemptResponse> {
    return this.apiClient.post<StartAttemptResponse>(`/quizzes/${quizId}/attempts`, { randomizeOrder });
  }

  fetchAttempt(attemptId: number): Observable<Attempt> {
    return this.apiClient.get<Attempt>(`/attempts/${attemptId}`);
  }

  fetchAttemptReview(attemptId: number): Observable<AttemptReview> {
    return this.apiClient.get<AttemptReview>(`/attempts/${attemptId}/review`);
  }

  submitAnswer(attemptId: number, quizQuestionId: number, answerJson: string): Observable<void> {
    return this.apiClient.post(`/attempts/${attemptId}/answers`, { quizQuestionId, answerJson });
  }

  submitAttempt(attemptId: number): Observable<Attempt> {
    return this.apiClient.post<Attempt>(`/attempts/${attemptId}/submit`, {});
  }

  fetchUserAttemptsForQuiz(quizId: number): Observable<Attempt[]> {
    return this.apiClient.get<Attempt[]>(`/quizzes/${quizId}/attempts`);
  }
}