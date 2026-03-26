import { Routes } from "@angular/router";
import { MobileLayoutComponent } from "../layouts/mobile-layout/mobile-layout.component";
import { AuthGuard } from "../features/auth/auth.guard";

export const routes: Routes = [
  {
    path: "login",
    loadComponent: () =>
      import("../features/auth/login.component").then((m) => m.LoginComponent),
    canActivate: [() => !localStorage.getItem("session_token")], // guest guard
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
        data: { breadcrumb: "New Question" }, // <-- add this
      },
      {
        path: "question/:id/edit",
        loadComponent: () =>
          import("../features/question/pages/question-form-page.component").then(
            (m) => m.QuestionFormPageComponent,
          ),
        data: { breadcrumb: "Edit Question" }, // <-- add this
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
      // { path: 'quiz', loadChildren: () => import('./features/quiz/quiz.module').then(m => m.QuizModule) },
      // { path: 'source', loadChildren: () => import('./features/source/source.module').then(m => m.SourceModule) },
      // { path: 'notes', loadChildren: () => import('./features/note/note.module').then(m => m.NoteModule) },
      // { path: 'favourites', loadChildren: () => import('./features/favourite/favourite.module').then(m => m.FavouriteModule) },
      // { path: 'search', loadChildren: () => import('./features/search/search.module').then(m => m.SearchModule) },
      // { path: 'profile', loadChildren: () => import('./features/profile/profile.module').then(m => m.ProfileModule) },
      // { path: 'reports', loadChildren: () => import('./features/report/report.module').then(m => m.ReportModule) },
      // {
      //   path: 'admin',
      //   canActivate: [AdminGuard],
      //   loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule)
      // }
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
