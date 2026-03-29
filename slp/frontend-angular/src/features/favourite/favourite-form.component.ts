import { Component, OnInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { Subject, combineLatest, filter, takeUntil } from "rxjs";

import { NzFormModule } from "ng-zorro-antd/form";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzMessageService } from "ng-zorro-antd/message";

import { FavoriteService } from "./favourite.service";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-favourite-form",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    TranslateModule,
  ],
  template: `
    <div class="space-y-4" data-testid="favorite-form-container">
      <form
        nz-form
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        data-testid="favourite-entry-form"
      >
        <nz-form-item>
          <nz-form-label [nzRequired]="true">{{
            "favourite.text" | translate
          }}</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              formControlName="text"
              [placeholder]="'favourite.textPlaceholder' | translate"
              maxlength="255"
              data-testid="favourite-text-input"
            />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>{{ "favourite.type" | translate }}</nz-form-label>
          <nz-form-control>
            <nz-select
              formControlName="type"
              [nzPlaceHolder]="'favourite.typePlaceholder' | translate"
              data-testid="favourite-type-select"
            >
              <nz-option
                nzValue="word"
                [nzLabel]="'favourite.typeWord' | translate"
              ></nz-option>
              <nz-option
                nzValue="phrase"
                [nzLabel]="'favourite.typePhrase' | translate"
              ></nz-option>
              <nz-option
                nzValue="idiom"
                [nzLabel]="'favourite.typeIdiom' | translate"
              ></nz-option>
              <nz-option
                nzValue="other"
                [nzLabel]="'favourite.typeOther' | translate"
              ></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>{{ "favourite.note" | translate }}</nz-form-label>
          <nz-form-control>
            <textarea
              nz-input
              formControlName="note"
              [placeholder]="'favourite.notePlaceholder' | translate"
              rows="4"
              data-testid="favourite-note-textarea"
            ></textarea>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <div
            class="flex justify-end space-x-2"
            data-testid="form-actions-wrapper"
          >
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
export class FavoriteFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private favoriteService = inject(FavoriteService);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  form!: FormGroup;
  isEdit = false;
  favoriteId: number | null = null;
  loading$ = this.favoriteService.loading$;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.form = this.fb.group({
      text: ["", [Validators.required, Validators.maxLength(255)]],
      type: ["word", Validators.required],
      note: [""],
    });

    this.route.params.subscribe((params) => {
      const id = params["id"];
      const isEditRoute = this.route.snapshot.url.some(
        (segment) => segment.path === "edit",
      );
      if (id && isEditRoute) {
        this.isEdit = true;
        this.favoriteId = +id;
        this.loadFavorite();
      } else {
        this.isEdit = false;
        this.favoriteId = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFavorite(): void {
    if (!this.favoriteId) return;
    this.favoriteService.fetchFavoriteById(this.favoriteId);

    combineLatest([
      this.favoriteService.loading$,
      this.favoriteService.currentFavorite$,
    ])
      .pipe(
        filter(([loading]) => !loading),
        takeUntil(this.destroy$),
      )
      .subscribe(([_, fav]) => {
        if (fav) {
          this.form.patchValue({
            text: fav.text,
            type: fav.type,
            note: fav.note || "",
          });
        } else {
          this.message.error(this.translate.instant("favourite.notFound"));
          this.goBack();
        }
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.message.error(this.translate.instant("favourite.textRequired"));
      return;
    }

    const { text, type, note } = this.form.value;
    if (this.isEdit && this.favoriteId) {
      this.favoriteService
        .updateFavorite(this.favoriteId, text.trim(), type, note?.trim() || "")
        .subscribe({
          next: () => {
            this.message.success(
              this.translate.instant("favourite.updateSuccess"),
            );
            this.router.navigate(["/favourites"]);
          },
          error: () =>
            this.message.error(this.translate.instant("common.error")),
        });
    } else {
      this.favoriteService
        .createFavorite(text.trim(), type, note?.trim() || "")
        .subscribe({
          next: () => {
            this.message.success(
              this.translate.instant("favourite.createSuccess"),
            );
            this.router.navigate(["/favourites"]);
          },
          error: () =>
            this.message.error(this.translate.instant("common.error")),
        });
    }
  }

  goBack(): void {
    this.router.navigate(["/favourites"]);
  }
}
