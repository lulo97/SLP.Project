import { Component, OnInit, inject, signal, viewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NzTabsModule } from "ng-zorro-antd/tabs";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzCheckboxModule } from "ng-zorro-antd/checkbox";
import { AdminService } from "../services/admin.service";
import { AdminLogFiltersComponent } from "../components/admin-log-filters.component";
import { AdminReportsComponent } from "../../report/pages/admin-reports/admin-reports.component";

@Component({
  selector: "app-admin-page",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTabsModule,
    NzCardModule,
    NzInputModule,
    NzButtonModule,
    NzTagModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzCheckboxModule,
    AdminLogFiltersComponent,
    AdminReportsComponent,
  ],
  template: `
    <div>
      <nz-tabset [(nzSelectedIndex)]="activeTabIndex" class="admin-tabs">
        <!-- Users Tab -->
        <nz-tab nzTitle="Users">
          <div>
            <nz-input-group [nzSuffix]="userSearchSuffix">
              <input
                nz-input
                [(ngModel)]="userSearch"
                placeholder="Search by username or email..."
                (ngModelChange)="handleUserSearch()"
              />
            </nz-input-group>
            <ng-template #userSearchSuffix>
              <i nz-icon nzType="search"></i>
            </ng-template>

            @if (adminService.loading().users) {
              <div class="loading-state"><nz-spin></nz-spin></div>
            } @else {
              @for (user of adminService.users(); track user.id) {
                <nz-card class="mobile-card" nzSize="small">
                  <div class="field-row">
                    <span class="field-label">ID:</span
                    ><span>{{ user.id }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Username:</span
                    ><span>{{ user.username }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Email:</span
                    ><span>{{ user.email || "—" }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Role:</span>
                    <nz-tag
                      [nzColor]="user.role === 'admin' ? 'red' : 'blue'"
                      >{{ user.role }}</nz-tag
                    >
                  </div>
                  <div class="field-row">
                    <span class="field-label">Status:</span>
                    <nz-tag
                      [nzColor]="user.status === 'active' ? 'green' : 'red'"
                      >{{ user.status }}</nz-tag
                    >
                  </div>
                  <div class="field-row">
                    <span class="field-label">Email Confirmed:</span>
                    <nz-tag
                      [nzColor]="user.emailConfirmed ? 'green' : 'orange'"
                      >{{
                        user.emailConfirmed ? "Verified" : "Unverified"
                      }}</nz-tag
                    >
                  </div>
                  <div class="field-row">
                    <span class="field-label">Created:</span
                    ><span>{{ user.createdAt }}</span>
                  </div>
                  <div class="actions">
                    <button
                      nz-button
                      nz-popconfirm
                      [nzPopconfirmTitle]="
                        user.status === 'active'
                          ? 'Ban this user?'
                          : 'Unban this user?'
                      "
                      (nzOnConfirm)="
                        user.status === 'active'
                          ? adminService.banUser(user.id)
                          : adminService.unbanUser(user.id)
                      "
                      [nzType]="
                        user.status === 'active' ? 'primary' : 'default'
                      "
                      [nzDanger]="user.status === 'active'"
                    >
                      {{ user.status === "active" ? "Ban" : "Unban" }}
                    </button>
                  </div>
                </nz-card>
              }
              @if (!adminService.users().length) {
                <p class="empty-state">No users found.</p>
              }
            }
          </div>
        </nz-tab>

        <!-- Quizzes Tab -->
        <nz-tab nzTitle="Quizzes">
          <div>
            <nz-input-group [nzSuffix]="quizSearchSuffix">
              <input
                nz-input
                [(ngModel)]="quizSearch"
                placeholder="Search by title or username..."
                (ngModelChange)="handleQuizSearch()"
              />
            </nz-input-group>
            <ng-template #quizSearchSuffix
              ><i nz-icon nzType="search"></i
            ></ng-template>

            @if (adminService.loading().quizzes) {
              <div class="loading-state"><nz-spin></nz-spin></div>
            } @else {
              @for (quiz of adminService.quizzes(); track quiz.id) {
                <nz-card class="mobile-card" nzSize="small">
                  <div class="field-row">
                    <span class="field-label">ID:</span
                    ><span>{{ quiz.id }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Title:</span
                    ><span>{{ quiz.title }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">User:</span
                    ><span>{{ quiz.username }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Visibility:</span>
                    <nz-tag
                      [nzColor]="
                        quiz.visibility === 'public' ? 'green' : 'orange'
                      "
                      >{{ quiz.visibility }}</nz-tag
                    >
                  </div>
                  <div class="field-row">
                    <span class="field-label">Status:</span>
                    <nz-tag [nzColor]="quiz.disabled ? 'red' : 'green'">{{
                      quiz.disabled ? "Disabled" : "Enabled"
                    }}</nz-tag>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Created:</span
                    ><span>{{ quiz.createdAt }}</span>
                  </div>
                  <div class="actions">
                    <button
                      nz-button
                      nz-popconfirm
                      [nzPopconfirmTitle]="
                        quiz.disabled
                          ? 'Enable this quiz?'
                          : 'Disable this quiz?'
                      "
                      (nzOnConfirm)="
                        quiz.disabled
                          ? adminService.enableQuiz(quiz.id)
                          : adminService.disableQuiz(quiz.id)
                      "
                      [nzType]="quiz.disabled ? 'primary' : 'default'"
                      [nzDanger]="!quiz.disabled"
                    >
                      {{ quiz.disabled ? "Enable" : "Disable" }}
                    </button>
                  </div>
                </nz-card>
              }
              @if (!adminService.quizzes().length) {
                <p class="empty-state">No quizzes found.</p>
              }
            }
          </div>
        </nz-tab>

        <!-- Comments Tab -->
        <nz-tab nzTitle="Comments">
          <div>
            <div class="mb-4 flex items-center gap-2">
              <label
                nz-checkbox
                [(ngModel)]="includeDeleted"
                (ngModelChange)="handleIncludeDeletedChange()"
                >Show deleted</label
              >
              <button nz-button nzSize="small" (click)="refreshComments()">
                Refresh
              </button>
            </div>
            <nz-input-group [nzSuffix]="commentSearchSuffix">
              <input
                nz-input
                [(ngModel)]="commentSearch"
                placeholder="Search by username or content..."
                (ngModelChange)="handleCommentSearch()"
              />
            </nz-input-group>
            <ng-template #commentSearchSuffix
              ><i nz-icon nzType="search"></i
            ></ng-template>

            @if (adminService.loading().comments) {
              <div class="loading-state"><nz-spin></nz-spin></div>
            } @else {
              @for (comment of adminService.comments(); track comment.id) {
                <nz-card class="mobile-card" nzSize="small">
                  <div class="field-row">
                    <span class="field-label">ID:</span
                    ><span>{{ comment.id }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">User:</span
                    ><span>{{ comment.username }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Content:</span
                    ><span class="line-clamp-2">{{ comment.content }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Target:</span
                    ><span
                      >{{ comment.targetType }} #{{ comment.targetId }}</span
                    >
                  </div>
                  <div class="field-row">
                    <span class="field-label">Status:</span>
                    <nz-tag [nzColor]="comment.deletedAt ? 'red' : 'green'">{{
                      comment.deletedAt ? "Deleted" : "Active"
                    }}</nz-tag>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Created:</span
                    ><span>{{ comment.createdAt }}</span>
                  </div>
                  <div class="actions">
                    @if (!comment.deletedAt) {
                      <nz-popconfirm
                        title="Delete this comment?"
                        (nzOnConfirm)="adminService.deleteComment(comment.id)"
                      >
                        <button nz-button nzDanger>Delete</button>
                      </nz-popconfirm>
                    }
                    @if (comment.deletedAt) {
                      <nz-popconfirm
                        title="Restore this comment?"
                        (nzOnConfirm)="adminService.restoreComment(comment.id)"
                      >
                        <button nz-button nzType="primary">Restore</button>
                      </nz-popconfirm>
                    }
                  </div>
                </nz-card>
              }
              @if (!adminService.comments().length) {
                <p class="empty-state">No comments found.</p>
              }
            }
          </div>
        </nz-tab>

        <!-- Logs Tab -->
        <nz-tab nzTitle="Logs">
          <div>
            <app-admin-log-filters (applyFilters)="handleLogFilters($event)" />
            @if (adminService.loading().logs) {
              <div class="loading-state"><nz-spin></nz-spin></div>
            } @else {
              @for (log of adminService.logs(); track log.id) {
                <nz-card class="mobile-card" nzSize="small">
                  <div class="field-row">
                    <span class="field-label">ID:</span
                    ><span>{{ log.id }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Action:</span
                    ><nz-tag nzColor="blue">{{ log.action }}</nz-tag>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Target:</span
                    ><span>{{ log.targetType }} #{{ log.targetId }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Details:</span
                    ><span>{{ log.details ? "Yes" : "—" }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Created:</span
                    ><span>{{ log.createdAt }}</span>
                  </div>
                </nz-card>
              }
              @if (!adminService.logs().length) {
                <p class="empty-state">No logs found.</p>
              }
            }
          </div>
        </nz-tab>

        <!-- Reports Tab -->
        <nz-tab nzTitle="Reports">
          <app-admin-reports />
        </nz-tab>
      </nz-tabset>
    </div>
  `,
  styles: [
    `
      .mobile-card {
        margin-bottom: 12px;
      }
      .mobile-card .ant-card-body {
        padding: 16px;
      }
      .field-row {
        display: flex;
        margin-bottom: 8px;
        font-size: 14px;
      }
      .field-label {
        width: 120px;
        font-weight: 500;
        color: #666;
        flex-shrink: 0;
      }
      .field-value {
        flex: 1;
        word-break: break-word;
      }
      .actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        flex-wrap: wrap;
      }
      .loading-state {
        display: flex;
        justify-content: center;
        padding: 32px 0;
      }
      .empty-state {
        text-align: center;
        color: #999;
        padding: 32px 0;
        font-size: 14px;
      }
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class AdminPageComponent implements OnInit {
  adminService = inject(AdminService);
  activeTabIndex = 0;
  userSearch = "";
  quizSearch = "";
  commentSearch = "";
  includeDeleted = false;

  ngOnInit() {
    this.adminService.fetchUsers();
    this.adminService.fetchQuizzes();
    this.adminService.fetchComments(false);
    this.adminService.fetchLogs({});
  }

  handleUserSearch() {
    this.adminService.fetchUsers(this.userSearch);
  }
  handleQuizSearch() {
    this.adminService.fetchQuizzes(this.quizSearch);
  }
  handleCommentSearch() {
    this.adminService.fetchComments(this.includeDeleted, this.commentSearch);
  }
  handleIncludeDeletedChange() {
    this.adminService.fetchComments(this.includeDeleted, this.commentSearch);
  }
  refreshComments() {
    this.adminService.fetchComments(this.includeDeleted, this.commentSearch);
  }
  handleLogFilters(filters: any) {
    this.adminService.fetchLogs(filters);
  }
}
