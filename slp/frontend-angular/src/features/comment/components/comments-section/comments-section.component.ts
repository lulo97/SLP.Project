import { Component, Input, OnInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzModalModule, NzModalService } from "ng-zorro-antd/modal";
import { NzMessageService } from "ng-zorro-antd/message";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { RouterLink } from "@angular/router";
import { CommentService } from "../../services/comment.service";
import { AuthService } from "../../../../features/auth/auth.service";
import { CommentItemComponent } from "../comment-item/comment-item.component";
import { ReportModalComponent } from "../../../report/components/report-modal/report-modal.component";
import { Observable } from "rxjs";
import { Comment } from "../../models/comment.model";

@Component({
  selector: "app-comments-section",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzSpinModule,
    NzInputModule,
    NzButtonModule,
    NzModalModule,
    TranslateModule,
    RouterLink,
    CommentItemComponent,
    // ReportModalComponent is no longer used directly in template, but kept for modal content
  ],
  template: `
    <nz-card
      nzTitle="{{ 'comment.title' | translate }}"
      class="shadow-sm mt-4"
      data-testid="comments-section"
    >
      <div *ngIf="loading$ | async" class="text-center py-4">
        <nz-spin nzSize="small" data-testid="comments-loading" />
      </div>
      <div *ngIf="!(loading$ | async)">
        <!-- New top‑level comment form -->
        <div *ngIf="isAuthenticated" class="mb-4">
          <textarea
            nz-input
            rows="2"
            placeholder="{{ 'comment.writeComment' | translate }}"
            [(ngModel)]="newCommentContent"
            data-testid="new-comment-input"
          ></textarea>
          <button
            nz-button
            nzType="primary"
            class="mt-2"
            (click)="handleAddComment()"
            [nzLoading]="loading$ | async"
            data-testid="submit-comment-button"
          >
            {{ "comment.addComment" | translate }}
          </button>
        </div>
        <div *ngIf="!isAuthenticated" class="text-gray-500 mb-4">
          <a routerLink="/login" data-testid="login-to-comment">{{
            "comment.loginToComment" | translate
          }}</a>
        </div>

        <!-- Comments list -->
        <div
          *ngIf="(comments$ | async)?.length === 0"
          class="text-gray-400 text-sm py-2"
          data-testid="no-comments-message"
        >
          {{ "comment.noComments" | translate }}
        </div>
        <div *ngIf="(comments$ | async)?.length" class="space-y-4">
          <app-comment-item
            *ngFor="let comment of comments$ | async"
            [comment]="comment"
            [targetType]="targetType"
            [targetId]="targetId"
            (reply)="openReplyForm($event)"
            (delete)="handleDeleteComment($event)"
            (report)="openReportModal($event)"
          ></app-comment-item>
        </div>
      </div>

      <!-- Reply modal -->
      <nz-modal
        [(nzVisible)]="replyModalVisible"
        nzTitle="{{ 'comment.reply' | translate }}"
        [nzOkText]="'comment.reply' | translate"
        [nzCancelText]="'common.cancel' | translate"
        (nzOnOk)="handleReplySubmit()"
        data-testid="reply-modal"
      >
        <textarea
          nz-input
          rows="3"
          placeholder="{{ 'comment.writeReply' | translate }}"
          [(ngModel)]="replyContent"
          data-testid="reply-input"
        ></textarea>
      </nz-modal>
    </nz-card>
  `,
  styles: [],
})
export class CommentsSectionComponent implements OnInit, OnDestroy {
  @Input() targetType!: string;
  @Input() targetId!: number;

  newCommentContent = "";
  replyModalVisible = false;
  replyContent = "";
  replyingTo: number | null = null;

  comments$!: Observable<Comment[]>;
  loading$!: Observable<boolean>;

  isAuthenticated = false;
  currentUserId: number | null = null;
  isAdmin = false;

  private commentService = inject(CommentService);
  private authService = inject(AuthService);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);
  private modalService = inject(NzModalService);

  constructor() {
    // Assign observables after service is available
    this.comments$ = this.commentService.comments$;
    this.loading$ = this.commentService.loading$;
  }

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      this.isAuthenticated = !!user;
      this.currentUserId = user?.id || null;
      this.isAdmin = user?.role === "admin";
    });
    this.fetchComments();
  }

  ngOnDestroy(): void {}

  fetchComments(): void {
    this.commentService.fetchComments(this.targetType, this.targetId);
  }

  async handleAddComment(): Promise<void> {
    if (!this.newCommentContent.trim()) {
      this.message.warning(this.translate.instant("comment.contentRequired"));
      return;
    }
    try {
      await this.commentService
        .createComment({
          targetType: this.targetType,
          targetId: this.targetId,
          content: this.newCommentContent,
        })
        .toPromise();
      this.newCommentContent = "";
      this.message.success(this.translate.instant("comment.addSuccess"));
    } catch {
      // error handled in service
    }
  }

  openReplyForm(commentId: number): void {
    this.replyingTo = commentId;
    this.replyContent = "";
    this.replyModalVisible = true;
  }

  async handleReplySubmit(): Promise<void> {
    if (!this.replyContent.trim()) {
      this.message.warning(this.translate.instant("comment.contentRequired"));
      return;
    }
    try {
      await this.commentService
        .createComment({
          parentId: this.replyingTo!,
          targetType: this.targetType,
          targetId: this.targetId,
          content: this.replyContent,
        })
        .toPromise();
      this.replyModalVisible = false;
      this.message.success(this.translate.instant("comment.replySuccess"));
    } catch {
      // handled
    }
  }

  async handleDeleteComment(commentId: number): Promise<void> {
    try {
      await this.commentService.deleteComment(commentId).toPromise();
      this.message.success(this.translate.instant("comment.deleteSuccess"));
    } catch {
      this.message.error(this.translate.instant("comment.deleteError"));
    }
  }

  openReportModal(commentId: number): void {
    this.modalService.create({
      nzTitle: this.translate.instant("report.reportComment"),
      nzContent: ReportModalComponent,
      nzData: {
        targetType: "comment",
        targetId: commentId,
      },
      nzFooter: null,
    });
  }
}
