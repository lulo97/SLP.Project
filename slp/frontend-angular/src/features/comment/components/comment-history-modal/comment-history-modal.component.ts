// src/features/comment/components/comment-history-modal/comment-history-modal.component.ts
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzTimelineModule } from "ng-zorro-antd/timeline";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzTagModule } from "ng-zorro-antd/tag";
import { TranslateModule } from "@ngx-translate/core";
import { CommentService } from "../../services/comment.service";
import { CommentHistoryEntry } from "../../models/comment.model";
import { Observable } from "rxjs";

@Component({
  selector: "app-comment-history-modal",
  standalone: true,
  imports: [
    CommonModule,
    NzModalModule,
    NzTimelineModule,
    NzSpinModule,
    NzTagModule,
    TranslateModule,
  ],
  template: `
    <nz-modal
      [(nzVisible)]="visible"
      nzTitle="{{ 'comment.editHistory' | translate }}"
      [nzFooter]="null"
      nzWidth="600px"
      (nzVisibleChange)="onVisibleChange($event)"
    >
      <div data-testid="comment-history-modal">
        <div *ngIf="historyLoading$ | async" class="text-center py-6">
          <nz-spin />
        </div>

        <div
          *ngIf="(history$ | async)?.length === 0 && !(historyLoading$ | async)"
          class="text-gray-400 text-sm py-4"
        >
          {{ "comment.noHistory" | translate }}
        </div>

        <nz-timeline *ngIf="(history$ | async)?.length">
          <nz-timeline-item
            *ngFor="let entry of history$ | async; let i = index"
            [attr.data-testid]="'history-entry-' + entry.id"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-gray-400">
                {{
                  i === 0
                    ? ("comment.original" | translate)
                    : ("comment.edit" | translate) + " " + i
                }}
                &mdash;
                {{ entry.editedAt | date: "medium" }}
              </span>
              <nz-tag
                *ngIf="i === ((history$ | async)?.length ?? 0) - 1"
                nzColor="blue"
                class="text-xs"
              >
                {{ "comment.latestSaved" | translate }}
              </nz-tag>
            </div>
            <div class="bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap">
              {{ entry.content }}
            </div>
          </nz-timeline-item>
        </nz-timeline>
      </div>
    </nz-modal>
  `,
  styles: [],
})
export class CommentHistoryModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() commentId: number | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  history$: Observable<CommentHistoryEntry[]>;
  historyLoading$: Observable<boolean>;

  constructor(private commentService: CommentService) {
    this.history$ = this.commentService.history$;
    this.historyLoading$ = this.commentService.historyLoading$;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["visible"] && this.visible && this.commentId) {
      this.commentService.fetchHistory(this.commentId);
    }
  }

  onVisibleChange(value: boolean): void {
    this.visibleChange.emit(value);
  }
}
