import { Routes } from '@angular/router';
import { MobileLayoutComponent } from './core/layouts/mobile-layout/mobile-layout.component';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [() => !localStorage.getItem('session_token')] // guest guard
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent),
    canActivate: [() => !localStorage.getItem('session_token')]
  },
  {
    path: '',
    component: MobileLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      // { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule) },
      // { path: 'quiz', loadChildren: () => import('./features/quiz/quiz.module').then(m => m.QuizModule) },
      // { path: 'questions', loadChildren: () => import('./features/question/question.module').then(m => m.QuestionModule) },
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
    ]
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
  },
  { path: '**', redirectTo: '' }
];