// src/features/quiz/components/notes-section.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMessageService } from "ng-zorro-antd/message";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { NoteDto } from "../quiz.model";
import { NzFormModule } from "ng-zorro-antd/form";

@Component({
  selector: "app-notes-section",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzButtonModule,
    NzModalModule,
    NzInputModule,
    NzSpinModule,
    NzFormModule,
    NzIconModule,
    TranslateModule,
  ],
  template: `
    <nz-card
      [nzTitle]="'quiz.notes' | translate"
      class="shadow-sm"
      data-testid="notes-card"
    >
      <div *ngIf="loading" class="text-center py-4" data-testid="notes-loading">
        <nz-spin size="small" />
      </div>
      <div
        *ngIf="!loading && notes.length === 0"
        class="text-gray-400 text-sm py-2"
        data-testid="no-notes-message"
      >
        {{ "quiz.noNotes" | translate }}
      </div>
      <div *ngIf="!loading && notes.length > 0" class="space-y-3">
        <div
          *ngFor="let note of notes"
          class="border rounded p-3 relative"
          [attr.data-testid]="'note-item-' + note.id"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium">{{ note.title }}</h4>
            <div class="flex gap-1">
              <button
                nz-button
                nzType="text"
                size="small"
                (click)="openEditModal(note)"
                [attr.data-testid]="'edit-note-' + note.id"
              >
                <i nz-icon nzType="edit"></i>
              </button>
              <button
                nz-button
                nzType="text"
                nzDanger
                size="small"
                (click)="remove.emit(note.id)"
                [attr.data-testid]="'delete-note-' + note.id"
              >
                <i nz-icon nzType="delete"></i>
              </button>
            </div>
          </div>
          <p class="text-sm whitespace-pre-wrap">{{ note.content }}</p>
          <div class="text-xs text-gray-400 mt-1">
            {{ note.updatedAt | date: "medium" }}
          </div>
        </div>
      </div>
      <button
        nz-button
        nzType="dashed"
        block
        class="mt-2"
        (click)="openAddModal()"
        data-testid="add-note-button"
      >
        <i nz-icon nzType="plus"></i> {{ "quiz.addNote" | translate }}
      </button>
    </nz-card>

    <nz-modal
      [(nzVisible)]="modalVisible"
      [nzTitle]="modalTitle"
      (nzOnOk)="handleSave()"
      [nzOkLoading]="saving"
      nzOkText="{{ 'common.save' | translate }}"
      nzCancelText="{{ 'common.cancel' | translate }}"
      [nzWidth]="320"
      data-testid="note-modal"
    >
      <form nz-form>
        <nz-form-item>
          <nz-form-label nzRequired>{{
            "note.title" | translate
          }}</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              [(ngModel)]="form.title"
              name="title"
              data-testid="note-title-input"
            />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzRequired>{{
            "note.content" | translate
          }}</nz-form-label>
          <nz-form-control>
            <textarea
              nz-input
              [(ngModel)]="form.content"
              name="content"
              rows="4"
              data-testid="note-content-input"
            ></textarea>
          </nz-form-control>
        </nz-form-item>
      </form>
    </nz-modal>
  `,
  styles: [
    `
      .border {
        border: 1px solid #e5e7eb;
      }
      .rounded {
        border-radius: 4px;
      }
      .p-3 {
        padding: 12px;
      }
      .mt-2 {
        margin-top: 8px;
      }
      .mb-2 {
        margin-bottom: 8px;
      }
      .text-sm {
        font-size: 0.875rem;
      }
      .text-xs {
        font-size: 0.75rem;
      }
      .text-gray-400 {
        color: #9ca3af;
      }
      .font-medium {
        font-weight: 500;
      }
      .whitespace-pre-wrap {
        white-space: pre-wrap;
      }
    `,
  ],
})
export class NotesSectionComponent {
  @Input() notes: NoteDto[] = [];
  @Input() loading = false;
  @Output() add = new EventEmitter<{ title: string; content: string }>();
  @Output() edit = new EventEmitter<{
    id: number;
    title: string;
    content: string;
  }>();
  @Output() remove = new EventEmitter<number>();

  modalVisible = false;
  editingId: number | null = null;
  form = { title: "", content: "" };
  saving = false;

  get modalTitle(): string {
    return this.editingId
      ? this.translate.instant("note.editNote")
      : this.translate.instant("note.createNote");
  }

  constructor(
    private translate: TranslateService,
    private message: NzMessageService,
  ) {}

  openAddModal(): void {
    this.editingId = null;
    this.form = { title: "", content: "" };
    this.modalVisible = true;
  }

  openEditModal(note: NoteDto): void {
    this.editingId = note.id;
    this.form = { title: note.title, content: note.content };
    this.modalVisible = true;
  }

  handleSave(): void {
    if (!this.form.title.trim() || !this.form.content.trim()) {
      this.message.warning(this.translate.instant("note.titleContentRequired"));
      return;
    }
    this.saving = true;
    if (this.editingId) {
      this.edit.emit({
        id: this.editingId,
        title: this.form.title,
        content: this.form.content,
      });
    } else {
      this.add.emit({ title: this.form.title, content: this.form.content });
    }
    this.modalVisible = false;
    this.saving = false;
  }
}
