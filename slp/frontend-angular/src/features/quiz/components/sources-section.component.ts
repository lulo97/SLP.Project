import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzCheckboxModule } from "ng-zorro-antd/checkbox";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMessageService } from "ng-zorro-antd/message";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { SourceDto } from "../quiz.model";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-sources-section",
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzTagModule,
    NzButtonModule,
    FormsModule,
    NzModalModule,
    NzCheckboxModule,
    NzSpinModule,
    NzIconModule,
    TranslateModule,
    RouterModule,
  ],
  template: `
    <nz-card
      [nzTitle]="'quiz.sources' | translate"
      class="shadow-sm"
      data-testid="sources-card"
    >
      <!-- Loading -->
      <div
        *ngIf="loading"
        class="text-center py-4"
        data-testid="sources-loading"
      >
        <nz-spin size="small"></nz-spin>
      </div>

      <!-- Empty state -->
      <div
        *ngIf="!loading && sources.length === 0"
        class="text-gray-400 text-sm py-2"
        data-testid="no-sources-message"
      >
        No sources attached.
      </div>

      <!-- Sources tags -->
      <div
        *ngIf="!loading && sources.length > 0"
        class="flex flex-wrap gap-2 mb-3"
        data-testid="sources-tags-container"
      >
        <nz-tag
          *ngFor="let src of sources"
          [nzMode]="!readonly && canEdit ? 'closeable' : 'default'"
          (nzOnClose)="detach.emit(src.id)"
          [attr.data-testid]="'source-tag-' + src.id"
          class="flex items-center gap-1"
        >
          <i
            nz-icon
            nzType="eye"
            class="cursor-pointer hover:text-primary"
            (click)="view.emit(src.id)"
            [attr.data-testid]="'source-view-' + src.id"
          ></i>
          {{ src.title }}
        </nz-tag>
      </div>

      <!-- Attach button (always shown if not readonly) -->
      <button
        *ngIf="!readonly"
        nz-button
        nzType="dashed"
        block
        class="mt-2"
        [disabled]="!canEdit"
        (click)="openAttachModal()"
        data-testid="attach-source-button"
      >
        <i nz-icon nzType="plus"></i>
        {{ "quiz.attachSources" | translate }}
      </button>
    </nz-card>

    <!-- Attach Source Modal -->
    <nz-modal
      [(nzVisible)]="modalVisible"
      nzTitle="{{ 'quiz.attachSources' | translate }}"
      [nzFooter]="modalFooter"
      data-testid="attach-source-modal"
    >
      <ng-template nzModalContent>
        <div *ngIf="availableSourcesLoading" class="text-center py-4">
          <nz-spin></nz-spin>
        </div>

        <div
          *ngIf="!availableSourcesLoading && availableSources.length === 0"
          class="text-gray-400"
        >
          {{ "quiz.noSourcesAvailable" | translate }}
          <a routerLink="/source/upload">
            {{ "source.uploadFile" | translate }} </a
          >.
        </div>

        <nz-checkbox-group
          *ngIf="!availableSourcesLoading && availableSources.length > 0"
          [(ngModel)]="selectedIds"
          class="flex flex-col gap-2"
          data-testid="source-checkbox-group"
        >
          <label
            nz-checkbox
            *ngFor="let src of availableSources"
            [nzValue]="src.id"
            [nzDisabled]="isAlreadyAttached(src.id)"
            [attr.data-testid]="'source-checkbox-' + src.id"
          >
            {{ src.title }} ({{ src.type }})
          </label>
        </nz-checkbox-group>
      </ng-template>
    </nz-modal>

    <!-- Custom modal footer with testable buttons -->
    <ng-template #modalFooter>
      <button
        nz-button
        (click)="modalVisible = false"
        data-testid="attach-sources-cancel"
      >
        {{ "common.cancel" | translate }}
      </button>
      <button
        nz-button
        nzType="primary"
        [nzLoading]="attaching"
        (click)="handleAttach()"
        data-testid="attach-sources-submit"
      >
        {{ "quiz.attach" | translate }}
      </button>
    </ng-template>
  `,
  styles: [
    `
      .flex {
        display: flex;
      }
      .flex-wrap {
        flex-wrap: wrap;
      }
      .gap-2 {
        gap: 8px;
      }
      .mb-3 {
        margin-bottom: 12px;
      }
      .mt-2 {
        margin-top: 8px;
      }
      .text-sm {
        font-size: 0.875rem;
      }
      .text-gray-400 {
        color: #9ca3af;
      }
      .cursor-pointer {
        cursor: pointer;
      }
    `,
  ],
})
export class SourcesSectionComponent {
  @Input() sources: SourceDto[] = [];
  @Input() loading = false;
  @Input() canEdit = false;
  @Input() readonly = false;
  @Input() availableSources: SourceDto[] = [];
  @Input() availableSourcesLoading = false;
  @Output() attach = new EventEmitter<number[]>();
  @Output() detach = new EventEmitter<number>();
  @Output() view = new EventEmitter<number>();

  modalVisible = false;
  selectedIds: number[] = [];
  attaching = false;

  isAlreadyAttached(sourceId: number): boolean {
    return this.sources.some((s) => s.id === sourceId);
  }

  openAttachModal(): void {
    this.selectedIds = [];
    this.modalVisible = true;
  }

  handleAttach(): void {
    if (this.selectedIds.length === 0) {
      this.message.warning(
        this.translate.instant("quiz.selectAtLeastOneSource"),
      );
      return;
    }
    this.attaching = true;
    this.attach.emit(this.selectedIds);
    this.modalVisible = false;
    this.selectedIds = [];
    this.attaching = false;
  }

  constructor(
    private translate: TranslateService,
    private message: NzMessageService,
  ) {}
}
