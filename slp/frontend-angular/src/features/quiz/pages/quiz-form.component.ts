

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TagSelectorComponent } from '../../../components/tag-selector/tag-selector.component';
import { QuizService } from '../quiz.service';
import { take, filter } from 'rxjs/operators';

@Component({
  selector: 'app-quiz-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzRadioModule,
    NzButtonModule,
    TranslateModule,
    TagSelectorComponent,
  ],
  template: `
    <nz-card class="shadow-sm" data-testid="quiz-form-card">
      <form nz-form [formGroup]="form" (ngSubmit)="onSubmit()">
        <nz-form-item>
          <nz-form-label nzRequired>{{ 'quiz.title' | translate }}</nz-form-label>
          <nz-form-control>
            <input nz-input formControlName="title" [placeholder]="'quiz.titlePlaceholder' | translate" data-testid="quiz-title-input" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>{{ 'quiz.description' | translate }}</nz-form-label>
          <nz-form-control>
            <textarea nz-input formControlName="description" rows="3" [placeholder]="'quiz.descriptionPlaceholder' | translate" data-testid="quiz-description-input"></textarea>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>{{ 'quiz.visibility' | translate }}</nz-form-label>
          <nz-form-control>
            <nz-radio-group formControlName="visibility" data-testid="quiz-visibility-radio-group">
              <label nz-radio nzValue="private">{{ 'quiz.visibilityPrivate' | translate }}</label>
              <label nz-radio nzValue="public">{{ 'quiz.visibilityPublic' | translate }}</label>
            </nz-radio-group>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>{{ 'quiz.tags' | translate }}</nz-form-label>
          <nz-form-control>
            <app-tag-selector [formControl]="tagsControl" data-testid="quiz-tags-select"></app-tag-selector>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <button
            nz-button
            nzType="primary"
            htmlType="submit"
            [disabled]="form.invalid"
            [nzLoading]="(quizService.loading$ | async) ?? false"
            block
            data-testid="quiz-submit-button"
          >
            {{ (isEdit ? 'common.save' : 'common.create') | translate }}
          </button>
        </nz-form-item>
      </form>
    </nz-card>
  `,
})
export class QuizFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public quizService = inject(QuizService);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  form!: FormGroup;
  tagsControl = this.fb.control<string[]>([]);
  isEdit = false;
  quizId: number | null = null;

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      visibility: ['public', Validators.required],
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isEdit = true;
      this.quizId = +idParam;
      this.loadQuiz();
    } else {
      this.isEdit = false;
    }
  }

  loadQuiz(): void {
    if (!this.quizId) return;
    this.quizService.fetchQuizById(this.quizId);
    this.quizService.currentQuiz$
      .pipe(
        filter(quiz => quiz !== null),
        take(1)
      )
      .subscribe(quiz => {
        if (quiz) {
          this.form.patchValue({
            title: quiz.title,
            description: quiz.description || '',
            visibility: quiz.visibility,
          });
          this.tagsControl.setValue(quiz.tags || []);
        } else {
          this.message.error(this.translate.instant('quiz.notFound'));
          this.router.navigate(['/quiz']);
        }
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.message.warning(this.translate.instant('quiz.fillRequired'));
      return;
    }

    const payload = {
      title: this.form.value.title,
      description: this.form.value.description || undefined,
      visibility: this.form.value.visibility,
      tagNames: this.tagsControl.value?.length ? this.tagsControl.value : undefined,
    };

    if (this.isEdit && this.quizId) {
      this.quizService.updateQuiz(this.quizId, payload).subscribe({
        next: (updated) => {
          this.message.success(this.translate.instant('quiz.updateSuccess'));
          this.router.navigate(['/quiz', updated.id]);
        },
        error: () => this.message.error(this.translate.instant('quiz.updateError')),
      });
    } else {
      this.quizService.createQuiz(payload).subscribe({
        next: (created) => {
          this.message.success(this.translate.instant('quiz.createSuccess'));
          this.router.navigate(['/quiz', created.id]);
        },
        error: () => this.message.error(this.translate.instant('quiz.createError')),
      });
    }
  }
}