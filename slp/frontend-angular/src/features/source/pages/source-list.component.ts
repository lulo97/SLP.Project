import { Component, OnInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import {
  Subject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  take,
  takeUntil,
} from "rxjs";

import { NzListModule } from "ng-zorro-antd/list";
import { NzPaginationModule } from "ng-zorro-antd/pagination";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzEmptyModule } from "ng-zorro-antd/empty";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMessageService } from "ng-zorro-antd/message";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

import { SourceService } from "../services/source.service";
import { NzAlertModule } from "ng-zorro-antd/alert";

@Component({
  selector: "app-source-list",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzListModule,
    NzPaginationModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    NzSpinModule,
    NzEmptyModule,
    NzPopconfirmModule,
    NzIconModule,
    TranslateModule,
    NzAlertModule,
  ],
  template: `
    <div class="space-y-4">
      <!-- Header actions -->
      <div class="flex justify-end gap-2">
        <button
          nz-button
          nzType="primary"
          (click)="goToUpload()"
          data-testid="source-list-upload-btn"
        >
          <i nz-icon nzType="upload" class="mr-1"></i>
          {{ "source.uploadFile" | translate }}
        </button>
        <button
          nz-button
          nzType="primary"
          (click)="goToUrlCreate()"
          data-testid="source-list-add-url-btn"
        >
          <i nz-icon nzType="link" class="mr-1"></i>
          {{ "source.addUrl" | translate }}
        </button>
        <button
          nz-button
          (click)="goToTextCreate()"
          data-testid="source-list-add-text-btn"
        >
          {{ "source.addText" | translate }}
        </button>
      </div>

      <!-- Search/filter bar -->
      <div class="flex flex-wrap items-center gap-2" data-testid="source-list-filters">
        <input
          nz-input
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearchChange()"
          placeholder="{{ 'source.searchPlaceholder' | translate }}"
          class="max-w-[280px]"
          data-testid="source-list-search-input"
        />
        <nz-select
          [(ngModel)]="typeFilter"
          nzPlaceHolder="{{ 'source.typeFilterPlaceholder' | translate }}"
          nzAllowClear
          style="width: 140px"
          (ngModelChange)="onTypeChange()"
          data-testid="source-list-type-filter"
        >
          <nz-option nzValue="pdf" nzLabel="PDF"></nz-option>
          <nz-option nzValue="link" nzLabel="URL"></nz-option>
          <nz-option nzValue="text" nzLabel="Text"></nz-option>
        </nz-select>
        <span
          *ngIf="(pagination$ | async)!.total > 0"
          class="text-xs text-gray-400 ml-auto"
          data-testid="source-list-total"
        >
          {{ (pagination$ | async)!.total }}
          {{ "source.sourcesCount" | translate }}
        </span>
      </div>

      <!-- Loading -->
      <div
        *ngIf="loading$ | async"
        class="text-center py-8"
        data-testid="source-list-loading"
      >
        <nz-spin></nz-spin>
      </div>

      <!-- Empty state -->
      <nz-empty
        *ngIf="!(loading$ | async) && (sources$ | async)?.length === 0"
        [nzNotFoundContent]="emptyMessage"
        data-testid="source-list-empty"
      >
        <ng-container *ngIf="searchQuery || typeFilter; else noFilters">
          <span>{{ "source.noMatch" | translate }}</span>
        </ng-container>
        <ng-template #noFilters>
          <span>{{ "source.noSources" | translate }}</span>
        </ng-template>
      </nz-empty>

      <!-- List -->
      <nz-list
        *ngIf="(sources$ | async)?.length"
        [nzDataSource]="(sources$ | async) ?? []"
        nzItemLayout="horizontal"
        class="source-list"
        data-testid="source-list"
      >
        <nz-list-item
          *ngFor="let item of sources$ | async"
          [attr.data-testid]="'source-list-item-' + item.id"
        >
          <nz-list-item-meta>
            <nz-list-item-meta-title>
              <a
                [routerLink]="['/source', item.id]"
                [attr.data-testid]="'source-list-item-link-' + item.id"
              >
                {{ item.title || "Untitled" }}
              </a>
            </nz-list-item-meta-title>
            <nz-list-item-meta-description>
              <div
                class="text-xs text-gray-500"
                [attr.data-testid]="'source-list-item-meta-' + item.id"
              >
                <span [attr.data-testid]="'source-list-item-type-' + item.id">
                  {{ "source.type_" + item.type | translate }}
                </span>
                <span class="mx-2">•</span>
                <span [attr.data-testid]="'source-list-item-date-' + item.id">
                  {{ "source.added" | translate }}:
                  {{ formatDate(item.createdAt) }}
                </span>
              </div>
            </nz-list-item-meta-description>
          </nz-list-item-meta>
          <ul nz-list-item-actions>
            <nz-list-item-action>
              <button
                nz-button
                nzType="text"
                [routerLink]="['/source', item.id]"
                [attr.data-testid]="'source-list-view-btn-' + item.id"
              >
                <i nz-icon nzType="eye"></i>
              </button>
            </nz-list-item-action>
            <nz-list-item-action>
              <button
                nz-button
                nzType="text"
                nzDanger
                nz-popconfirm
                nzPopconfirmTitle="{{ 'common.confirm' | translate }}"
                nzOkText="{{ 'common.delete' | translate }}"
                nzCancelText="{{ 'common.cancel' | translate }}"
                (nzOnConfirm)="deleteSource(item.id)"
                [attr.data-testid]="'source-list-delete-confirm-' + item.id"
              >
                <i
                  nz-icon
                  nzType="delete"
                  [attr.data-testid]="'source-list-delete-btn-' + item.id"
                ></i>
              </button>
            </nz-list-item-action>
          </ul>
        </nz-list-item>
      </nz-list>

      <!-- Pagination -->
      <div
        *ngIf="((pagination$ | async)?.totalPages ?? 0) > 1"
        class="flex justify-center py-4"
      >
        <nz-pagination
          [nzPageIndex]="(pagination$ | async)?.page ?? 1"
          [nzTotal]="(pagination$ | async)?.total ?? 0"
          [nzPageSize]="(pagination$ | async)?.pageSize ?? 10"
          (nzPageIndexChange)="onPageChange($event)"
        ></nz-pagination>
      </div>
      <nz-alert
        *ngIf="sourceService.error$ | async as err"
        [nzMessage]="err"
        nzType="error"
        nzShowIcon
        nzClosable
        (nzOnClose)="sourceService.clearError()"
        class="mb-4"
      ></nz-alert>
    </div>
  `,
})
export class SourceListComponent implements OnInit, OnDestroy {
  // FIX 3: Use inject() to avoid "used before initialization" errors
  public sourceService = inject(SourceService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  sources$ = this.sourceService.sources$;
  loading$ = this.sourceService.loading$;
  pagination$ = this.sourceService.pagination$;

  searchQuery = "";
  typeFilter: string | null = null;

  private destroy$ = new Subject<void>();
  private searchDebouncer = new Subject<string>();

  ngOnInit(): void {
    this.loadSources();
    this.searchDebouncer
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadSources(1));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // FIX 4: Use .pipe(take(1)) instead of .value (which doesn't exist on Observables)
  loadSources(page = 1): void {
    this.pagination$.pipe(take(1)).subscribe((pagination) => {
      this.sourceService.fetchSources({
        page,
        pageSize: pagination.pageSize,
        search: this.searchQuery || undefined,
        type: this.typeFilter || undefined,
      });
    });
  }

  onSearchChange(): void {
    this.searchDebouncer.next(this.searchQuery);
  }

  onTypeChange(): void {
    this.loadSources(1);
  }

  onPageChange(page: number): void {
    this.loadSources(page);
  }

  deleteSource(id: number): void {
    this.sourceService.deleteSource(id).subscribe({
      next: () => {
        this.message.success(this.translate.instant("source.deleteSuccess"));

        // FIX 5: Get snapshots of sources and pagination to handle logic after delete
        combineLatest([this.sources$, this.pagination$])
          .pipe(take(1))
          .subscribe(([sources, pagination]) => {
            if (sources.length === 1 && pagination.page > 1) {
              this.loadSources(pagination.page - 1);
            }
          });
      },
      error: () => {
        this.message.error(this.translate.instant("source.deleteError"));
      },
    });
  }

  goToUpload(): void {
    this.router.navigate(["/source/upload"]);
  }

  goToUrlCreate(): void {
    this.router.navigate(["/source/new-url"]);
  }

  goToTextCreate(): void {
    this.router.navigate(["/source/new-text"]);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  get emptyMessage(): string {
    return this.searchQuery || this.typeFilter
      ? this.translate.instant("source.noMatch")
      : this.translate.instant("source.noSources");
  }
}
