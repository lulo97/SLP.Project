// src/features/comment/components/comments-section/comments-section.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { CommentService } from '../../services/comment.service';
import { AuthService } from '../../../../features/auth/auth.service';
import { CommentItemComponent } from '../comment-item/comment-item.component';
import { ReportModalComponent } from '../../../features/report/components/report-modal.component'; // adjust path

@Component({
  selector: 'app-comments-section',
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
    ReportModalComponent
  ],
  template: `
    <nz-card nzTitle="{{ 'comment.title' | translate }}" class="shadow-sm mt-4" data-testid="comments-section">
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
            {{ 'comment.addComment' | translate }}
          </button>
        </div>
        <div *ngIf="!isAuthenticated" class="text-gray-500 mb-4">
          <a routerLink="/login" data-testid="login-to-comment">{{ 'comment.loginToComment' | translate }}</a>
        </div>

        <!-- Comments list -->
        <div *ngIf="(comments$ | async)?.length === 0" class="text-gray-400 text-sm py-2" data-testid="no-comments-message">
          {{ 'comment.noComments' | translate }}
        </div>
        <div *ngIf="(comments$ | async)?.length" class="space-y-4">
          <app-comment-item
            *ngFor="let comment of comments$ | async"
            [comment]="comment"
            [targetType]="targetType"
            [targetId]="targetId"
            (reply)="openReplyForm($event)"
            (edit)="() => {}"
            (delete)="handleDeleteComment($event)"
            (report)="openReportModal($event)"
          ></app-comment-item>
        </div>
      </div>

      <!-- Reply modal -->
      <nz-modal
        [(nzVisible)]="replyModalVisible"
        nzTitle="{{ 'comment.reply' | translate }}"
        [nzConfirmLoading]="loading$ | async"
        (nzOnOk)="handleReplySubmit()"
        [nzOkText]="'comment.reply' | translate"
        [nzCancelText]="'common.cancel' | translate"
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

      <!-- Report modal -->
      <app-report-modal
        [(visible)]="reportModalVisible"
        [targetType]="'comment'"
        [targetId]="reportingCommentId!"
        (reported)="onReported()"
      ></app-report-modal>
    </nz-card>
  `,
  styles: []
})
export class CommentsSectionComponent implements OnInit, OnDestroy {
  @Input() targetType!: string;
  @Input() targetId!: number;

  newCommentContent = '';
  replyModalVisible = false;
  replyContent = '';
  replyingTo: number | null = null;
  reportModalVisible = false;
  reportingCommentId: number | null = null;

  comments$ = this.commentService.comments$;
  loading$ = this.commentService.loading$;

  isAuthenticated = false;
  currentUserId: number | null = null;
  isAdmin = false;

  constructor(
    private commentService: CommentService,
    private authService: AuthService,
    private message: NzMessageService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.currentUserId = user?.id || null;
      this.isAdmin = user?.role === 'admin';
    });
    this.fetchComments();
  }

  ngOnDestroy(): void {
    // No need to unsubscribe because we use async pipe
  }

  fetchComments(): void {
    this.commentService.fetchComments(this.targetType, this.targetId);
  }

  async handleAddComment(): Promise<void> {
    if (!this.newCommentContent.trim()) {
      this.message.warning(this.translate.instant('comment.contentRequired'));
      return;
    }
    try {
      await this.commentService.createComment({
        targetType: this.targetType,
        targetId: this.targetId,
        content: this.newCommentContent
      }).toPromise();
      this.newCommentContent = '';
      this.message.success(this.translate.instant('comment.addSuccess'));
    } catch {
      // error handled in service
    }
  }

  openReplyForm(commentId: number): void {
    this.replyingTo = commentId;
    this.replyContent = '';
    this.replyModalVisible = true;
  }

  async handleReplySubmit(): Promise<void> {
    if (!this.replyContent.trim()) {
      this.message.warning(this.translate.instant('comment.contentRequired'));
      return;
    }
    try {
      await this.commentService.createComment({
        parentId: this.replyingTo!,
        targetType: this.targetType,
        targetId: this.targetId,
        content: this.replyContent
      }).toPromise();
      this.replyModalVisible = false;
      this.message.success(this.translate.instant('comment.replySuccess'));
    } catch {
      // handled
    }
  }

  async handleDeleteComment(commentId: number): Promise<void> {
    try {
      await this.commentService.deleteComment(commentId).toPromise();
      this.message.success(this.translate.instant('comment.deleteSuccess'));
    } catch {
      this.message.error(this.translate.instant('comment.deleteError'));
    }
  }

  openReportModal(commentId: number): void {
    this.reportingCommentId = commentId;
    this.reportModalVisible = true;
  }

  onReported(): void {
    this.reportModalVisible = false;
    this.reportingCommentId = null;
  }
}