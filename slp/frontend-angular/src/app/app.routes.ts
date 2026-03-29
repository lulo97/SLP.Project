import { Routes } from "@angular/router";
import { MobileLayoutComponent } from "../layouts/mobile-layout/mobile-layout.component";
import { AuthGuard } from "../features/auth/auth.guard";
import { SourceListComponent } from "../features/source/pages/source-list.component";
import { SourceUploadComponent } from "../features/source/pages/source-upload.component";
import { SourceUrlCreateComponent } from "../features/source/pages/source-url-create.component";
import { SourceTextCreateComponent } from "../features/source/pages/source-text-create.component";
// Import các component Quiz
import { QuizListComponent } from "../features/quiz/pages/quiz-list.component";
import { QuizFormComponent } from "../features/quiz/pages/quiz-form.component";
import { QuizDetailComponent } from "../features/quiz/pages/quiz-detail.component";
import { QuizEditComponent } from "../features/quiz/pages/quiz-edit.component";
import { AdminGuard } from "../features/auth/admin.guard";
import { QuizPlayerComponent } from "../features/quiz-attempt/pages/quiz-player.component";
import { AttemptReviewComponent } from "../features/quiz-attempt/pages/attempt-review.component";
import { SourceDetailComponent } from "../features/source/pages/source-detail.component";

export const routes: Routes = [
  {
    path: "login",
    loadComponent: () =>
      import("../features/auth/login.component").then((m) => m.LoginComponent),
    canActivate: [() => !localStorage.getItem("session_token")],
  },
  {
    path: "register",
    loadComponent: () =>
      import("../features/auth/register.component").then(
        (m) => m.RegisterComponent,
      ),
    canActivate: [() => !localStorage.getItem("session_token")],
  },
  {
    path: "",
    component: MobileLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: "test",
        loadComponent: () =>
          import("../features/test/test.component").then(
            (m) => m.TestComponent,
          ),
      },
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () =>
          import("../features/dashboard/pages/dashboard.component").then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        data: { breadcrumb: "Questions" },
        path: "questions",
        loadComponent: () =>
          import("../features/question/pages/question-list.component").then(
            (m) => m.QuestionListComponent,
          ),
      },
      {
        path: "question/new",
        loadComponent: () =>
          import("../features/question/pages/question-form-page.component").then(
            (m) => m.QuestionFormPageComponent,
          ),
        data: { breadcrumb: "New Question" },
      },
      {
        path: "question/:id/edit",
        loadComponent: () =>
          import("../features/question/pages/question-form-page.component").then(
            (m) => m.QuestionFormPageComponent,
          ),
        data: { breadcrumb: "Edit Question" },
      },
      {
        path: "notes",
        loadComponent: () =>
          import("../features/note/note-list.component").then(
            (m) => m.NoteListComponent,
          ),
        data: { breadcrumb: "My Notes" },
      },
      {
        path: "notes/new",
        loadComponent: () =>
          import("../features/note/note-form.component").then(
            (m) => m.NoteFormComponent,
          ),
        data: { breadcrumb: "Create Note" },
      },
      {
        path: "notes/:id",
        loadComponent: () =>
          import("../features/note/note-detail.component").then(
            (m) => m.NoteDetailComponent,
          ),
        data: { breadcrumb: "Note Detail" },
      },
      {
        path: "notes/:id/edit",
        loadComponent: () =>
          import("../features/note/note-form.component").then(
            (m) => m.NoteFormComponent,
          ),
        data: { breadcrumb: "Edit Note" },
      },
      {
        path: "source",
        loadComponent: () =>
          import("../features/source/pages/source-list.component").then(
            (m) => m.SourceListComponent,
          ),
        canActivate: [AuthGuard],
        data: { breadcrumb: "Sources" },
      },
      {
        path: "source/upload",
        loadComponent: () =>
          import("../features/source/pages/source-upload.component").then(
            (m) => m.SourceUploadComponent,
          ),
        canActivate: [AuthGuard],
        data: { breadcrumb: "Upload File" },
      },
      {
        path: "source/new-url",
        loadComponent: () =>
          import("../features/source/pages/source-url-create.component").then(
            (m) => m.SourceUrlCreateComponent,
          ),
        canActivate: [AuthGuard],
        data: { breadcrumb: "Add URL" },
      },
      {
        path: "source/new-text",
        loadComponent: () =>
          import("../features/source/pages/source-text-create.component").then(
            (m) => m.SourceTextCreateComponent,
          ),
        canActivate: [AuthGuard],
        data: { breadcrumb: "Add Text" },
      },
      { path: "source/:id", component: SourceDetailComponent },
      // ========== QUIZ ROUTES ==========
      {
        path: "quiz",
        children: [
          {
            path: "",
            component: QuizListComponent,
            data: { breadcrumb: "Quizzes" },
          },
          {
            path: "new",
            component: QuizFormComponent,
            data: { breadcrumb: "Create Quiz" },
          },
          {
            path: ":id",
            component: QuizDetailComponent,
            data: { breadcrumb: "Quiz Details" },
          },
          {
            path: ":id/edit",
            component: QuizFormComponent,
            data: { breadcrumb: "Edit Quiz" },
          },
        ],
      },
      // ========== END QUIZ ==========
      {
        path: "reports",
        loadComponent: () =>
          import("../features/report/pages/user-reports/user-reports.component").then(
            (m) => m.UserReportsComponent,
          ),
        data: { breadcrumb: "nav.reports" },
      },
      {
        path: "admin/reports",
        loadComponent: () =>
          import("../features/report/pages/admin-reports/admin-reports.component").then(
            (m) => m.AdminReportsComponent,
          ),
        canActivate: [AdminGuard],
        data: { breadcrumb: "Admin Reports" },
      },
      {
        path: "quiz/:quizId/attempt",
        component: QuizPlayerComponent,
      },
      {
        path: "quiz/:quizId/attempt/:attemptId",
        component: QuizPlayerComponent,
      },
      {
        path: "quiz/attempt/:attemptId/review",
        component: AttemptReviewComponent,
      },
    ],
  },
  {
    path: "reset-password",
    loadComponent: () =>
      import("../features/auth/reset-password.component").then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: "verify-email",
    loadComponent: () =>
      import("../features/auth/verify-email.component").then(
        (m) => m.VerifyEmailComponent,
      ),
  },
  { path: "**", redirectTo: "" },
];
