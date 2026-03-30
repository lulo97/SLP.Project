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
import { NzMessageService } from "ng-zorro-antd/message";

import { NoteService } from "./note.service";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-note-list",
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
    TranslateModule,
  ],
  template: `
    <div class="space-y-4" data-testid="notes-list-container">
      <div
        class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
      >
        <h1 class="text-2xl font-semibold" data-testid="page-title">
          {{ "note.myNotes" | translate }}
        </h1>
        <div class="flex gap-2">
          <input
            nz-input
            [placeholder]="'note.searchPlaceholder' | translate"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            class="w-48"
            data-testid="note-search-input"
          />
          <button
            nz-button
            nzType="primary"
            (click)="goToCreate()"
            data-testid="create-note-button"
          >
            <i nz-icon nzType="plus" class="mr-1"></i>
            {{ "note.createNote" | translate }}
          </button>
        </div>
      </div>

      <nz-spin
        [nzSpinning]="(loading$ | async) ?? false"
        data-testid="list-loading-spinner"
      >
        <div class="space-y-3">
          <nz-empty
            *ngIf="!(loading$ | async) && (notes$ | async)?.length === 0"
            [nzNotFoundContent]="'note.noNotes' | translate"
            data-testid="notes-empty-state"
          >
            <button
              nz-button
              nzType="primary"
              (click)="goToCreate()"
              data-testid="empty-state-create-button"
            >
              {{ "note.createNote" | translate }}
            </button>
          </nz-empty>

          <nz-card
            *ngFor="let note of notes$ | async"
            class="cursor-pointer hover:shadow-md transition-shadow"
            (click)="viewNote(note.id)"
            [attr.data-testid]="'note-card-' + note.id"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3
                  class="text-lg font-semibold"
                  [attr.data-testid]="'note-card-title-' + note.id"
                >
                  {{ note.title }}
                </h3>
                <p
                  class="text-gray-500 text-sm mt-1"
                  [attr.data-testid]="'note-card-date-' + note.id"
                >
                  {{ formatDate(note.updatedAt) }}
                </p>
                <p
                  class="text-gray-700 mt-2 line-clamp-3"
                  [attr.data-testid]="'note-card-excerpt-' + note.id"
                >
                  {{ note.content }}
                </p>
              </div>

              <div class="flex space-x-2 ml-4">
                <button
                  nz-button
                  nzType="text"
                  size="small"
                  (click)="$event.stopPropagation(); editNote(note.id)"
                  [attr.data-testid]="'edit-note-icon-' + note.id"
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
                  nzOkText="{{ 'common.yes' | translate }}"
                  nzCancelText="{{ 'common.cancel' | translate }}"
                  (nzOnConfirm)="deleteNote(note.id)"
                  (click)="$event.stopPropagation()"
                  [attr.data-testid]="'delete-popconfirm-' + note.id"
                >
                  <i
                    nz-icon
                    nzType="delete"
                    [attr.data-testid]="'delete-note-icon-' + note.id"
                  ></i>
                </button>
              </div>
            </div>
          </nz-card>

          <div
            class="flex justify-center mt-4"
            data-testid="notes-pagination-container"
          >
            <nz-pagination
              [nzPageIndex]="(page$ | async) ?? 1"
              [nzTotal]="(total$ | async) ?? 0"
              [nzPageSize]="(pageSize$ | async) ?? 10"
              [nzShowSizeChanger]="false"
              (nzPageIndexChange)="onPageChange($event)"
              data-testid="notes-pagination"
            ></nz-pagination>
          </div>
        </div>
      </nz-spin>
    </div>
  `,
  styles: [
    `
      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class NoteListComponent implements OnInit, OnDestroy {
  private noteService = inject(NoteService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  notes$ = this.noteService.notes$;
  loading$ = this.noteService.loading$;
  total$ = this.noteService.total$;
  page$ = this.noteService.page$;
  pageSize$ = this.noteService.pageSize$;

  searchQuery = "";
  private searchDebounce: any;

  ngOnInit(): void {
    this.loadNotes();
  }

  ngOnDestroy(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }

  loadNotes(): void {
    this.noteService.fetchNotes(this.searchQuery || undefined, 1);
  }

  onSearch(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.noteService.fetchNotes(this.searchQuery || undefined, 1);
    }, 500);
  }

  onPageChange(page: number): void {
    this.noteService.fetchNotes(this.searchQuery || undefined, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }

  goToCreate(): void {
    this.router.navigate(["/notes/new"]);
  }

  viewNote(id: number): void {
    this.router.navigate([`/notes/${id}`]);
  }

  editNote(id: number): void {
    this.router.navigate([`/notes/${id}/edit`]);
  }

  deleteNote(id: number, event?: Event): void {
    // Add a null check before calling stopPropagation
    if (event) {
      event.stopPropagation();
    }
    event?.stopPropagation();
    this.noteService.deleteNote(id).subscribe({
      next: () => {
        this.message.success(this.translate.instant("note.deleteSuccess"));
        // Refresh current page if needed (service already removed from list)
      },
      error: () => {
        this.message.error(this.translate.instant("note.deleteError"));
      },
    });
  }
}
