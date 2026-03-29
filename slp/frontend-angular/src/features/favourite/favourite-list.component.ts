import { Component, OnInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs";

import { NzCardModule } from "ng-zorro-antd/card";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzEmptyModule } from "ng-zorro-antd/empty";
import { NzPaginationModule } from "ng-zorro-antd/pagination";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzMessageService } from "ng-zorro-antd/message";

import { FavoriteService } from "./favourite.service";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-favourite-list",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzCardModule,
    NzButtonModule,
    NzInputModule,
    NzSpinModule,
    NzEmptyModule,
    NzPaginationModule,
    NzPopconfirmModule,
    NzIconModule,
    NzTagModule,
    TranslateModule,
  ],
  template: `
    <div class="space-y-4" data-testid="favourites-list-container">
      <div
        class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
        data-testid="list-header"
      >
        <h1 class="text-2xl font-semibold" data-testid="list-title">
          {{ "favourite.myFavourites" | translate }}
        </h1>
        <div class="flex gap-2" data-testid="list-controls">
          <input
            nz-input
            [placeholder]="'favourite.searchPlaceholder' | translate"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            class="w-48"
            data-testid="favourite-search-input"
          />
          <button
            nz-button
            nzType="primary"
            (click)="goToCreate()"
            data-testid="create-favourite-button"
          >
            <i nz-icon nzType="plus" class="mr-1"></i>
            {{ "favourite.addFavourite" | translate }}
          </button>
        </div>
      </div>

      <nz-spin
        [nzSpinning]="(loading$ | async) ?? false"
        data-testid="list-loading-spinner"
      >
        <div class="space-y-3" data-testid="list-content-wrapper">
          <nz-empty
            *ngIf="!(loading$ | async) && (favorites$ | async)?.length === 0"
            [nzNotFoundContent]="'favourite.noFavourites' | translate"
            data-testid="favourites-empty-state"
          >
            <button
              nz-button
              nzType="primary"
              (click)="goToCreate()"
              data-testid="empty-state-create-button"
            >
              {{ "favourite.addFavourite" | translate }}
            </button>
          </nz-empty>

          <nz-card
            *ngFor="let fav of favorites$ | async"
            class="cursor-pointer hover:shadow-md transition-shadow"
            (click)="viewFavorite(fav.id)"
            [attr.data-testid]="'favourite-card-' + fav.id"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div
                  class="flex items-center gap-2"
                  data-testid="favorite-item-header"
                >
                  <h3
                    class="text-lg font-semibold"
                    [attr.data-testid]="'favorite-item-text-' + fav.id"
                  >
                    {{ fav.text }}
                  </h3>
                  <nz-tag [nzColor]="getTypeColor(fav.type)">
                    {{ getTypeLabel(fav.type) }}
                  </nz-tag>
                </div>
                <p
                  *ngIf="fav.note"
                  class="text-gray-500 text-sm mt-1 line-clamp-2"
                  [attr.data-testid]="'favorite-item-note-' + fav.id"
                >
                  {{ fav.note }}
                </p>
                <p
                  class="text-gray-400 text-xs mt-1"
                  [attr.data-testid]="'favorite-item-date-' + fav.id"
                >
                  {{ formatDate(fav.updatedAt) }}
                </p>
              </div>

              <div
                class="flex space-x-2 ml-4"
                data-testid="favorite-item-actions"
              >
                <button
                  nz-button
                  nzType="text"
                  size="small"
                  (click)="$event.stopPropagation(); editFavorite(fav.id)"
                  [attr.data-testid]="'edit-favourite-icon-' + fav.id"
                >
                  <i nz-icon nzType="edit"></i>
                </button>

                <button
                  nz-button
                  nzType="text"
                  nzDanger
                  size="small"
                  nz-popconfirm
                  [nzPopconfirmTitle]="'common.confirm' | translate"
                  nzOkText="{{ 'common.delete' | translate }}"
                  nzCancelText="{{ 'common.cancel' | translate }}"
                  (nzOnConfirm)="deleteFavorite(fav.id)"
                  (click)="$event.stopPropagation()"
                  [attr.data-testid]="'delete-popconfirm-' + fav.id"
                >
                  <i nz-icon nzType="delete"></i>
                </button>
              </div>
            </div>
          </nz-card>

          <div
            class="flex justify-center mt-4"
            data-testid="pagination-wrapper"
          >
            <nz-pagination
              [nzPageIndex]="(page$ | async) ?? 1"
              [nzTotal]="(total$ | async) ?? 0"
              [nzPageSize]="(pageSize$ | async) ?? 10"
              [nzShowSizeChanger]="false"
              (nzPageIndexChange)="onPageChange($event)"
              data-testid="favourites-pagination"
            ></nz-pagination>
          </div>
        </div>
      </nz-spin>
    </div>
  `,
  styles: [
    `
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class FavoriteListComponent implements OnInit, OnDestroy {
  private favoriteService = inject(FavoriteService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  favorites$ = this.favoriteService.favorites$;
  loading$ = this.favoriteService.loading$;
  total$ = this.favoriteService.total$;
  page$ = this.favoriteService.page$;
  pageSize$ = this.favoriteService.pageSize$;

  searchQuery = "";
  private searchDebounce: any;

  ngOnInit(): void {
    this.loadFavorites();
  }

  ngOnDestroy(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }

  loadFavorites(): void {
    this.favoriteService.fetchFavorites(this.searchQuery || undefined, 1);
  }

  onSearch(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.favoriteService.fetchFavorites(this.searchQuery || undefined, 1);
    }, 500);
  }

  onPageChange(page: number): void {
    this.favoriteService.fetchFavorites(this.searchQuery || undefined, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      word: "blue",
      phrase: "green",
      idiom: "orange",
      other: "default",
    };
    return colors[type] || "default";
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      word: this.translate.instant("favourite.typeWord"),
      phrase: this.translate.instant("favourite.typePhrase"),
      idiom: this.translate.instant("favourite.typeIdiom"),
      other: this.translate.instant("favourite.typeOther"),
    };
    return labels[type] || type;
  }

  goToCreate(): void {
    this.router.navigate(["/favourites/new"]);
  }

  viewFavorite(id: number): void {
    this.router.navigate([`/favourites/${id}`]);
  }

  editFavorite(id: number): void {
    this.router.navigate([`/favourites/${id}/edit`]);
  }

  deleteFavorite(id: number): void {
    this.favoriteService.deleteFavorite(id).subscribe({
      next: () => {
        this.message.success(this.translate.instant("favourite.deleteSuccess"));
        // Refresh current page
        this.favoriteService.fetchFavorites(
          this.searchQuery || undefined,
          this.favoriteService.currentPage,
        );
      },
      error: () => {
        this.message.error(this.translate.instant("favourite.deleteError"));
      },
    });
  }
}
