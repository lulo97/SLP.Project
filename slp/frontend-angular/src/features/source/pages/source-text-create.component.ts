import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SourceService } from '../services/source.service';

@Component({
  selector: 'app-source-text-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzAlertModule,
    TranslateModule,
  ],
  template: `
      <nz-card class="shadow-sm" data-testid="source-text-create-card">
        <form nz-form (ngSubmit)="handleSubmit()" data-testid="source-text-create-form">
          <nz-form-item>
            <nz-form-label nzRequired>{{ 'source.title' | translate }}</nz-form-label>
            <nz-form-control>
              <input
                nz-input
                [(ngModel)]="form.title"
                name="title"
                [placeholder]="'source.titlePlaceholder' | translate"
                required
                data-testid="source-text-create-title-input"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>{{ 'source.content' | translate }}</nz-form-label>
            <nz-form-control>
              <textarea
                nz-input
                rows="8"
                [(ngModel)]="form.content"
                name="content"
                [placeholder]="'source.contentPlaceholder' | translate"
                required
                data-testid="source-text-create-content-input"
              ></textarea>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <button
              nz-button
              nzType="primary"
              type="submit"
              [disabled]="!form.title.trim() || !form.content.trim()"
              [nzLoading]="(loading$ | async)!"
              block
              data-testid="source-text-create-submit-btn"
            >
              {{ 'source.create' | translate }}
            </button>
          </nz-form-item>
        </form>

        <nz-alert
          *ngIf="(error$ | async) as err"
          [nzMessage]="err"
          nzType="error"
          nzShowIcon
          nzClosable
          (nzOnClose)="sourceService.clearError()"
          class="mt-4"
          data-testid="source-text-create-error"
        ></nz-alert>
      </nz-card>
  `,
})
export class SourceTextCreateComponent {
  public sourceService = inject(SourceService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  loading$ = this.sourceService.loading$;
  error$ = this.sourceService.error$;

  form = { title: '', content: '' };

  handleSubmit(): void {
    if (!this.form.title.trim() || !this.form.content.trim()) {
      this.message.warning(this.translate.instant('source.fillRequired'));
      return;
    }
    this.sourceService.createSourceFromNote(this.form).subscribe({
      next: (result) => {
        this.message.success(this.translate.instant('source.createSuccess'));
        this.router.navigate(['/source', result.id]);
      },
      error: () => {
        this.message.error(this.translate.instant('source.createError'));
      },
    });
  }
}