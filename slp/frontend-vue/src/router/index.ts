import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/features/auth/stores/authStore";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/features/auth/pages/LoginPage.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/features/auth/pages/RegisterPage.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: () => import("@/features/dashboard/pages/DashboardPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("@/features/profile/pages/ProfilePage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("@/features/admin/pages/AdminPage.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/",
      redirect: "/dashboard",
    },
    {
      path: "/quiz",
      name: "quiz-list",
      component: () => import("@/features/quiz/pages/QuizListPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/quiz/new",
      name: "quiz-create",
      component: () => import("@/features/quiz/pages/QuizFormPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/quiz/:id",
      name: "quiz-detail",
      component: () => import("@/features/quiz/pages/QuizDetailPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/quiz/:id/edit",
      name: "quiz-edit",
      component: () => import("@/features/quiz/pages/QuizFormPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/questions",
      name: "question-list",
      component: () => import("@/features/question/pages/QuestionListPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/question/new",
      name: "question-create",
      component: () => import("@/features/question/pages/QuestionFormPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/question/:id/edit",
      name: "question-edit",
      component: () => import("@/features/question/pages/QuestionFormPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/source",
      name: "source-list",
      component: () => import("@/features/source/pages/SourceListPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/source/upload",
      name: "source-upload",
      component: () => import("@/features/source/pages/SourceUploadPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/source/new-url",
      name: "source-url-create",
      component: () =>
        import("@/features/source/pages/SourceUrlCreatePage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/source/:id",
      name: "source-detail",
      component: () => import("@/features/source/pages/SourceDetailPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/source/new-note",
      name: "SourceTextCreate",
      component: () =>
        import("@/features/source/pages/SourceNoteCreatePage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/quiz/:quizId/attempt/:attemptId?",
      name: "QuizPlayer",
      component: () => import("@/features/quiz-attempt/pages/QuizPlayer.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/quiz/attempt/:attemptId/review",
      name: "AttemptReview",
      component: () =>
        import("@/features/quiz-attempt/pages/AttemptReview.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/search",
      name: "search",
      component: () => import("@/features/search/pages/SearchPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/quiz/view/:id",
      name: "QuizView",
      component: () => import("@/features/quiz/pages/QuizViewPage.vue"),
      meta: { requiresAuth: false }, // or true if you want to require login to view
    },
    {
      path: "/reports",
      name: "user-reports",
      component: () => import("@/features/report/pages/UserReportsPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/admin/health",
      name: "admin-health",
      component: () => import("@/features/admin/pages/AdminHealthPage.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // For routes that need auth or admin, ensure user is loaded
  if (to.meta.requiresAuth || to.meta.requiresAdmin) {
    await authStore.fetchUserIfNeeded();
  }

  const isAuthenticated = authStore.isAuthenticated;
  const isAdmin = authStore.isAdmin;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next("/login");
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next("/dashboard");
  } else if (to.meta.requiresAdmin && !isAdmin) {
    next("/dashboard");
  } else {
    next();
  }
});

export default router;
