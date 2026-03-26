import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { NzFormModule } from "ng-zorro-antd/form";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzMessageService } from "ng-zorro-antd/message";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

import { NoteService } from "./note.service";
import { combineLatest, filter, Subject, take, takeUntil } from "rxjs";

@Component({
  selector: "app-note-form",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    TranslateModule,
  ],
  template: `
    <div class="space-y-4" data-testid="note-form-container">
      <form
        nz-form
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        data-testid="note-entry-form"
      >
        <nz-form-item>
          <nz-form-label [nzRequired]="true">{{
            "note.title" | translate
          }}</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              formControlName="title"
              [placeholder]="'note.titlePlaceholder' | translate"
              maxlength="255"
              data-testid="note-title-input"
            />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzRequired]="true">{{
            "note.content" | translate
          }}</nz-form-label>
          <nz-form-control>
            <textarea
              nz-input
              formControlName="content"
              rows="10"
              [placeholder]="'note.contentPlaceholder' | translate"
              data-testid="note-content-textarea"
            ></textarea>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <div class="flex justify-end space-x-2">
            <button
              nz-button
              (click)="goBack()"
              data-testid="cancel-form-button"
            >
              {{ "common.cancel" | translate }}
            </button>
            <button
              nz-button
              nzType="primary"
              [disabled]="form.invalid || (loading$ | async)"
              [nzLoading]="(loading$ | async) ?? false"
              data-testid="submit-form-button"
            >
              {{ (isEdit ? "common.save" : "common.create") | translate }}
            </button>
          </div>
        </nz-form-item>
      </form>
    </div>
  `,
})
export class NoteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private noteService = inject(NoteService);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  form!: FormGroup;
  isEdit = false;
  noteId: number | null = null;
  loading$ = this.noteService.loading$;

  private destroy$ = new Subject<void>();
  ngOnInit(): void {
    this.form = this.fb.group({
      title: ["", [Validators.required, Validators.maxLength(255)]],
      content: ["", Validators.required],
    });

    // Determine if edit by checking the URL segments
    this.route.params.subscribe((params) => {
      const id = params["id"];
      // Check if the current route contains the segment 'edit'
      const isEditRoute = this.route.snapshot.url.some(
        (segment) => segment.path === "edit",
      );
      if (id && isEditRoute) {
        this.isEdit = true;
        this.noteId = +id;
        this.loadNote();
      } else {
        this.isEdit = false;
        this.noteId = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNote(): void {
    if (!this.noteId) return;

    this.noteService.fetchNoteById(this.noteId);

    // Combine the loading state and the data stream
    combineLatest([this.noteService.loading$, this.noteService.currentNote$])
      .pipe(
        filter(([loading]) => !loading), // Wait until loading is false
        take(1), // Take the first result and complete
        takeUntil(this.destroy$),
      )
      .subscribe(([_, note]) => {
        if (note) {
          this.form.patchValue({
            title: note.title,
            content: note.content,
          });
        } else {
          this.message.error(this.translate.instant("note.notFound"));
          this.goBack();
        }
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.message.error(this.translate.instant("note.titleContentRequired"));
      return;
    }

    const { title, content } = this.form.value;
    if (this.isEdit && this.noteId) {
      this.noteService.updateNote(this.noteId, title, content).subscribe({
        next: () => {
          this.message.success(this.translate.instant("note.updateSuccess"));
          this.router.navigate(["/notes"]);
        },
        error: () => {
          this.message.error(this.translate.instant("common.error"));
        },
      });
    } else {
      this.noteService.createNote(title, content).subscribe({
        next: () => {
          this.message.success(this.translate.instant("note.createSuccess"));
          this.router.navigate(["/notes"]);
        },
        error: () => {
          this.message.error(this.translate.instant("common.error"));
        },
      });
    }
  }

  goBack(): void {
    this.router.navigate(["/notes"]);
  }
}
