import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { FavoriteService } from './favourite.service';

@Component({
  selector: 'app-favourite-detail',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzButtonModule,
    NzSpinModule,
    NzEmptyModule,
    NzPopconfirmModule,
    NzIconModule,
    NzTagModule,
    TranslateModule,
  ],
  template: `
    <div
      *ngIf="loading$ | async"
      class="flex justify-center py-12"
      data-testid="loading-spinner-container"
    >
      <nz-spin data-testid="spinner-icon"></nz-spin>
    </div>

    <div
      *ngIf="!(loading$ | async) && (currentFavorite$ | async) as fav"
      class="space-y-4"
      data-testid="favorite-detail-container"
    >
      <nz-card class="shadow-sm" data-testid="favorite-card">
        <div class="flex items-center gap-2 mb-2" data-testid="favorite-header">
          <h1 class="text-2xl font-semibold" data-testid="favorite-title">
            {{ fav.text }}
          </h1>
          <nz-tag [nzColor]="getTypeColor(fav.type)">
            {{ getTypeLabel(fav.type) }}
          </nz-tag>
        </div>

        <p class="text-gray-500 text-sm" data-testid="favorite-created-at">
          {{ 'favourite.createdAt' | translate }}: {{ formatDate(fav.createdAt) }}
        </p>
        <p class="text-gray-500 text-sm mb-4" data-testid="favorite-updated-at">
          {{ 'favourite.updatedAt' | translate }}: {{ formatDate(fav.updatedAt) }}
        </p>

        <div *ngIf="fav.note" class="mt-4" data-testid="favorite-note-section">
          <h3 class="font-semibold mb-2" data-testid="favorite-note-title">
            {{ 'favourite.note' | translate }}:
          </h3>
          <p class="whitespace-pre-wrap" data-testid="favorite-note-content">
            {{ fav.note }}
          </p>
        </div>
      </nz-card>

      <div class="flex justify-end space-x-2" data-testid="favorite-actions">
        <button nz-button (click)="editFavorite(fav.id)" data-testid="edit-favourite-button">
          <i nz-icon nzType="edit" class="mr-1"></i>
          {{ 'common.edit' | translate }}
        </button>

        <button
          nz-button
          nzDanger
          nz-popconfirm
          [nzPopconfirmTitle]="'common.confirm' | translate"
          nzOkText="{{ 'common.delete' | translate }}"
          nzCancelText="{{ 'common.cancel' | translate }}"
          (nzOnConfirm)="deleteFavorite(fav.id)"
          data-testid="delete-favourite-confirm"
        >
          <i nz-icon nzType="delete" class="mr-1"></i>
          {{ 'common.delete' | translate }}
        </button>
      </div>
    </div>

    <nz-empty
      *ngIf="!(loading$ | async) && !(currentFavorite$ | async)"
      [nzNotFoundContent]="'favourite.notFound' | translate"
      data-testid="favourite-empty-state"
    ></nz-empty>
  `,
})
export class FavoriteDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private favoriteService = inject(FavoriteService);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  currentFavorite$ = this.favoriteService.currentFavorite$;
  loading$ = this.favoriteService.loading$;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = +params['id'];
      if (id) {
        this.favoriteService.fetchFavoriteById(id);
      }
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      word: 'blue',
      phrase: 'green',
      idiom: 'orange',
      other: 'default',
    };
    return colors[type] || 'default';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      word: this.translate.instant('favourite.typeWord'),
      phrase: this.translate.instant('favourite.typePhrase'),
      idiom: this.translate.instant('favourite.typeIdiom'),
      other: this.translate.instant('favourite.typeOther'),
    };
    return labels[type] || type;
  }

  editFavorite(id: number): void {
    this.router.navigate([`/favourites/${id}/edit`]);
  }

  deleteFavorite(id: number): void {
    this.favoriteService.deleteFavorite(id).subscribe({
      next: () => {
        this.message.success(this.translate.instant('favourite.deleteSuccess'));
        this.router.navigate(['/favourites']);
      },
      error: () => {
        this.message.error(this.translate.instant('favourite.deleteError'));
      },
    });
  }
}