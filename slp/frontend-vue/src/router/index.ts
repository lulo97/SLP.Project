import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("../views/Login.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/register",
      name: "register",
      component: () => import("../views/Register.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: () => import("../views/Dashboard.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("../views/Profile.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("../views/Admin.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/",
      redirect: "/dashboard",
    },
    {
      path: "/quiz",
      name: "quiz-list",
      component: () => import("../views/quiz/QuizList.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/quiz/new",
      name: "quiz-create",
      component: () => import("../views/quiz/QuizForm.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/quiz/:id",
      name: "quiz-detail",
      component: () => import("../views/quiz/QuizDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/quiz/:id/edit",
      name: "quiz-edit",
      component: () => import("../views/quiz/QuizForm.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/questions",
      name: "question-list",
      component: () => import("../views/question/QuestionList.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/question/new",
      name: "question-create",
      component: () => import("../views/question/QuestionForm.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/question/:id/edit",
      name: "question-edit",
      component: () => import("../views/question/QuestionForm.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/source/upload",
      name: "source-upload",
      component: () => import("../views/source/SourceUpload.vue"),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
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
