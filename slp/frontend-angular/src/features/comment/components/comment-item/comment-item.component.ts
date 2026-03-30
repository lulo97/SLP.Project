import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  forwardRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NzCommentModule } from "ng-zorro-antd/comment";
import { NzAvatarModule } from "ng-zorro-antd/avatar";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { NzIconModule } from "ng-zorro-antd/icon";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { CommentHistoryModalComponent } from "../comment-history-modal/comment-history-modal.component";
import { NzMessageService } from "ng-zorro-antd/message";
import { AuthService } from "../../../auth/auth.service";
import { CommentService } from "../../services/comment.service";
import { Comment } from "../../models/comment.model";

@Component({
  selector: "app-comment-item",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    // NG-ZORRO Modules
    NzCommentModule,
    NzAvatarModule,
    NzInputModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzIconModule,
    // Custom
    CommentHistoryModalComponent,
    // Recursion
    forwardRef(() => CommentItemComponent),
  ],
  template: `
    <div
      class="comment-item"
      [attr.data-testid]="'comment-' + comment.id"
      [attr.key]="comment.id + '-' + (comment.updatedAt || comment.createdAt)"
    >
      <nz-comment [nzAuthor]="comment.username">
        <span nz-comment-avatar>
          <nz-avatar [nzSize]="32" [style.background-color]="'#87d068'">
            {{ comment.username.charAt(0).toUpperCase() }}
          </nz-avatar>
        </span>
        <nz-comment-content>
          <div *ngIf="!editing">
            <p>{{ comment.content }}</p>
            <div
              *ngIf="comment.editedAt"
              class="text-xs text-gray-400"
              data-testid="comment-edited-indicator"
            >
              ({{ "comment.edited" | translate }})
            </div>
          </div>
          <div *ngIf="editing">
            <textarea
              nz-input
              [rows]="2"
              [(ngModel)]="editContent"
              data-testid="edit-comment-input"
            ></textarea>
            <div class="mt-2 space-x-2">
              <button
                nz-button
                nzType="primary"
                nzSize="small"
                (click)="saveEdit()"
                data-testid="save-edit-button"
              >
                {{ "common.save" | translate }}
              </button>
              <button
                nz-button
                nzSize="small"
                (click)="cancelEdit()"
                data-testid="cancel-edit-button"
              >
                {{ "common.cancel" | translate }}
              </button>
            </div>
          </div>
        </nz-comment-content>
        <nz-comment-action>
          <span
            *ngIf="isAuthenticated"
            (click)="handleReplyClick()"
            data-testid="reply-button"
          >
            <i nz-icon nzType="message" nzTheme="outline"></i>
            {{ "comment.reply" | translate }}
          </span>
          <span *ngIf="canEdit" (click)="startEdit()" data-testid="edit-button">
            <i nz-icon nzType="edit" nzTheme="outline"></i>
            {{ "common.edit" | translate }}
          </span>
          <span (click)="openHistory()" data-testid="history-button">
            <i nz-icon nzType="history" nzTheme="outline"></i>
            {{ "comment.history" | translate }}
          </span>
          <span
            *ngIf="isAuthenticated && !isOwner"
            (click)="handleReportClick()"
            data-testid="report-button"
          >
            <i nz-icon nzType="flag" nzTheme="outline"></i>
            {{ "comment.report" | translate }}
          </span>
          <span
            *ngIf="canDelete"
            nz-popconfirm
            [nzPopconfirmTitle]="'comment.deleteConfirm' | translate"
            [nzOkText]="'common.yes' | translate"
            [nzCancelText]="'common.no' | translate"
            (nzOnConfirm)="handleDeleteClick()"
            data-testid="delete-button"
          >
            <i nz-icon nzType="delete"></i> {{ "common.yes" | translate }}
          </span>
        </nz-comment-action>
      </nz-comment>

      <app-comment-history-modal
        [(visible)]="historyModalVisible"
        [commentId]="comment.id"
      ></app-comment-history-modal>

      <div
        *ngIf="comment.replies && comment.replies.length > 0"
        class="ml-8 mt-2 space-y-2"
      >
        <app-comment-item
          *ngFor="let replyItem of comment.replies"
          [comment]="replyItem"
          [targetType]="targetType"
          [targetId]="targetId"
          (reply)="onReply($event)"
          (edit)="onEdit($event)"
          (delete)="onDelete($event)"
          (report)="onReport($event)"
        ></app-comment-item>
      </div>
    </div>
  `,
  styles: [],
})
export class CommentItemComponent implements OnInit, OnDestroy {
  @Input() comment!: Comment;
  @Input() targetType!: string;
  @Input() targetId!: number;

  @Output() reply = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() delete = new EventEmitter<number>();
  @Output() report = new EventEmitter<number>();

  editing = false;
  editContent = "";
  historyModalVisible = false;

  isAuthenticated = false;
  currentUserId: number | null = null;
  isAdmin = false;

  constructor(
    private commentService: CommentService,
    private authService: AuthService,
    private translate: TranslateService,
    private message: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      this.isAuthenticated = !!user;
      this.currentUserId = user?.id || null;
      this.isAdmin = user?.role === "admin";
    });
  }

  ngOnDestroy(): void {}

  get isOwner(): boolean {
    return this.currentUserId === this.comment.userId;
  }

  get canEdit(): boolean {
    return this.isAuthenticated && (this.isOwner || this.isAdmin);
  }

  get canDelete(): boolean {
    return this.canEdit;
  }

  openHistory(): void {
    this.historyModalVisible = true;
  }

  // Renamed from reply() to handleReplyClick() to avoid conflict with @Output
  handleReplyClick(): void {
    this.reply.emit(this.comment.id);
  }

  startEdit(): void {
    this.editing = true;
    this.editContent = this.comment.content;
  }

  cancelEdit(): void {
    this.editing = false;
  }

  async saveEdit(): Promise<void> {
    if (!this.editContent.trim()) {
      this.message.warning(this.translate.instant("comment.contentRequired"));
      return;
    }
    try {
      await this.commentService
        .updateComment(this.comment.id, { content: this.editContent })
        .toPromise();
      this.editing = false;
      this.message.success(this.translate.instant("comment.updateSuccess"));
    } catch {
      // Error handled by interceptor/service
    }
  }

  handleDeleteClick(): void {
    this.delete.emit(this.comment.id);
  }

  handleReportClick(): void {
    this.report.emit(this.comment.id);
  }

  // Bubble up events from child replies
  onReply(id: number): void {
    this.reply.emit(id);
  }

  onEdit(id: number): void {
    this.edit.emit(id);
  }

  onDelete(id: number): void {
    this.delete.emit(id);
  }

  onReport(id: number): void {
    this.report.emit(id);
  }
}
