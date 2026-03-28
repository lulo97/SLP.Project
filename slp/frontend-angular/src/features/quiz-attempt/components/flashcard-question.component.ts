// src/features/quiz-attempt/components/flashcard-question.component.ts

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-flashcard-question',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 bg-yellow-50 rounded" data-testid="flashcard-container">
      <p class="font-medium" data-testid="flashcard-front-label">Front:</p>
      <p data-testid="flashcard-front-content">{{ front || '' }}</p>
      <p class="font-medium mt-2" data-testid="flashcard-back-label">Back (hidden during attempt):</p>
      <p data-testid="flashcard-back-content">{{ back || '' }}</p>
    </div>
    <p class="text-gray-500 text-sm mt-2" data-testid="flashcard-info">
      Flashcards are informational and not scored.
    </p>
  `,
})
export class FlashcardQuestionComponent {
  @Input() front?: string;
  @Input() back?: string;
}