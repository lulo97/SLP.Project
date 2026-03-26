import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute } from "@angular/router";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzEmptyModule } from "ng-zorro-antd/empty";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMessageService } from "ng-zorro-antd/message";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

import { NoteService } from "./note.service";

@Component({
  selector: "app-note-detail",
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzButtonModule,
    NzSpinModule,
    NzEmptyModule,
    NzPopconfirmModule,
    NzIconModule,
    TranslateModule,
  ],
  template: `
    <div
      *ngIf="loading$ | async"
      class="flex justify-center py-12"
      data-testid="note-loading-spinner"
    >
      <nz-spin data-testid="spinner-icon"></nz-spin>
    </div>

    <div
      *ngIf="!(loading$ | async) && (currentNote$ | async) as note"
      class="space-y-4"
      data-testid="note-content-container"
    >
      <nz-card class="shadow-sm" data-testid="note-card">
        <h1 class="text-2xl font-semibold" data-testid="note-title">
          {{ note.title }}
        </h1>
        <p class="text-gray-500 text-sm mt-1" data-testid="note-updated-at">
          {{ "note.updatedAt" | translate }}: {{ formatDate(note.updatedAt) }}
        </p>
        <div class="mt-4 whitespace-pre-wrap" data-testid="note-body">
          {{ note.content }}
        </div>
      </nz-card>

      <div class="flex justify-end space-x-2" data-testid="note-actions">
        <button
          nz-button
          (click)="editNote(note.id)"
          data-testid="edit-note-button"
        >
          <i nz-icon nzType="edit" class="mr-1"></i>
          {{ "common.edit" | translate }}
        </button>

        <button
          nz-button
          nzDanger
          nz-popconfirm
          [nzPopconfirmTitle]="'common.confirm' | translate"
          nzOkText="{{ 'common.delete' | translate }}"
          nzCancelText="{{ 'common.cancel' | translate }}"
          (nzOnConfirm)="deleteNote(note.id)"
          data-testid="delete-note-confirm"
        >
          <i nz-icon nzType="delete" class="mr-1"></i>
          {{ "common.delete" | translate }}
        </button>
      </div>
    </div>

    <nz-empty
      *ngIf="!(loading$ | async) && !(currentNote$ | async)"
      [nzNotFoundContent]="'note.notFound' | translate"
      data-testid="note-empty-state"
    ></nz-empty>
  `,
})
export class NoteDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private noteService = inject(NoteService);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  currentNote$ = this.noteService.currentNote$;
  loading$ = this.noteService.loading$;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = +params["id"];
      if (id) {
        this.noteService.fetchNoteById(id);
      }
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  editNote(id: number): void {
    this.router.navigate([`/notes/${id}/edit`]);
  }

  deleteNote(id: number): void {
    this.noteService.deleteNote(id).subscribe({
      next: () => {
        this.message.success(this.translate.instant("note.deleteSuccess"));
        this.router.navigate(["/notes"]);
      },
      error: () => {
        this.message.error(this.translate.instant("note.deleteError"));
      },
    });
  }
}