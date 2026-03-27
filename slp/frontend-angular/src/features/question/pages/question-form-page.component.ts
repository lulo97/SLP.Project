
import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { filter, first, firstValueFrom, Subscription, take } from "rxjs";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzMessageService } from "ng-zorro-antd/message";
import { QuestionFormComponent } from "../components/question-form.component";
import { QuestionService } from "../question.service";
import {
  CreateQuestionPayload,
  UpdateQuestionPayload,
  QuestionDto,
} from "../question.model";

@Component({
  selector: "app-question-form-page",
  standalone: true,
  imports: [CommonModule, NzCardModule, QuestionFormComponent],
  template: `
    <nz-card class="shadow-sm">
      <app-question-form
        [initialQuestion]="initialQuestion"
        [loading]="(loading$ | async) ?? false"
        (save)="onSave($event)"
        (cancel)="goBack()"
        data-testid="question-form-add-tags"
      ></app-question-form>
    </nz-card>
  `,
})
export class QuestionFormPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private questionService = inject(QuestionService);
  private message = inject(NzMessageService);

  isEdit = false;
  questionId: number | null = null;
  initialQuestion: QuestionDto | null = null;
  loading$ = this.questionService.loading$;

  private routeSub?: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (id && id !== "new") {
        this.isEdit = true;
        this.questionId = +id;
        this.loadQuestion();
      } else {
        this.isEdit = false;
        this.questionId = null;
        this.initialQuestion = null;
      }
    });
  }

  async loadQuestion(): Promise<void> {
    if (this.questionId) {
      // 🔧 Reset before fetching
      this.questionService.currentQuestionSubject.next(null);

      this.questionService.fetchQuestionById(this.questionId);
      this.initialQuestion = await firstValueFrom(
        this.questionService.currentQuestion$.pipe(
          filter((q) => q !== null),
          first(),
        ),
      );
    }
  }

  onSave(payload: CreateQuestionPayload): void {
    if (this.isEdit && this.questionId) {
      this.questionService
        .updateQuestion(this.questionId, payload as UpdateQuestionPayload)
        .subscribe({
          next: () => {
            this.message.success("Question updated");
            this.router.navigate(["/questions"]);
          },
          error: () =>
            this.message.error(
              this.questionService.errorSubject.value || "Update failed",
            ),
        });
    } else {
      this.questionService.createQuestion(payload).subscribe({
        next: () => {
          this.message.success("Question created");
          this.router.navigate(["/questions"]);
        },
        error: () =>
          this.message.error(
            this.questionService.errorSubject.value || "Create failed",
          ),
      });
    }
  }

  goBack(): void {
    this.router.navigate(["/questions"]);
  }
}
