import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzSkeletonModule } from "ng-zorro-antd/skeleton";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { Subject, takeUntil, Observable, combineLatest } from "rxjs";
import { DashboardService } from "../services/dashboard.service";
import { TtsService } from "../../tts/tts.service";
import { ApiClientService } from "../../../services/api-client.service";
import { WordOfTheDay, UserStats } from "../models/dashboard.models";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzSkeletonModule,
    NzSpinModule,
  ],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("scrollContainer") scrollContainer!: ElementRef<HTMLElement>;

  private destroy$ = new Subject<void>();
  refreshing = false;
  expanded = false;
  savingFavorite = false;

  // Observables from service
  wordOfTheDay$: Observable<WordOfTheDay | null>;
  userStats$: Observable<UserStats | null>;
  loadingWord$: Observable<boolean>;
  loadingStats$: Observable<boolean>;
  errorWord$: Observable<string | null>;

  // Intro chips data
  introChips = [
    {
      id: "quiz",
      label: "Adaptive Quizzes",
      summary:
        "Test your knowledge with AI-generated questions tailored to your level.",
      icon: "file-text",
      color: "blue",
      route: "/quiz",
    },
    {
      id: "question",
      label: "Smart Bank",
      summary:
        "Access thousands of community-driven questions for deep subject mastery.",
      icon: "question-circle",
      color: "green",
      route: "/questions",
    },
    {
      id: "source",
      label: "AI Analyzer",
      summary:
        "Upload documents or links to extract summaries and flashcards instantly.",
      icon: "folder-open",
      color: "purple",
      route: "/source",
    },
    {
      id: "favorite",
      label: "My Library",
      summary:
        "Keep track of your saved vocabulary, notes, and favorite study materials.",
      icon: "star",
      color: "orange",
      route: "/profile?tab=favorites",
    },
  ];

  features = [
    {
      id: "quiz",
      title: "Interactive Learning",
      icon: "book",
      description: "Engage with dynamic content designed to improve retention.",
      route: "/quiz",
    },
    {
      id: "question",
      title: "Knowledge Base",
      icon: "question-circle",
      description:
        "Explore a structured database of academic and professional topics.",
      route: "/questions",
    },
    {
      id: "source",
      title: "Resource Hub",
      icon: "link",
      description: "Manage and analyze external articles and PDF study guides.",
      route: "/source",
    },
  ];

  constructor(
    private dashboardService: DashboardService,
    public ttsService: TtsService,
    private apiClient: ApiClientService,
    private message: NzMessageService,
    public router: Router,
  ) {
    this.wordOfTheDay$ = this.dashboardService.wordOfTheDay$;
    this.userStats$ = this.dashboardService.userStats$;
    this.loadingWord$ = this.dashboardService.loadingWord$;
    this.loadingStats$ = this.dashboardService.loadingStats$;
    this.errorWord$ = this.dashboardService.errorWord$;
  }
  statCards: any[] = [];

  ngOnInit(): void {
    this.dashboardService.refreshAll();
    this.userStats$.pipe(takeUntil(this.destroy$)).subscribe((stats) => {
      this.statCards = this.buildStatCards(stats);
    });
  }

  private boundOnScroll!: (e: Event) => void;

  ngAfterViewInit(): void {
    this.boundOnScroll = this.onScroll.bind(this);
    this.scrollContainer.nativeElement.addEventListener(
      "scroll",
      this.boundOnScroll,
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.scrollContainer?.nativeElement.removeEventListener(
      "scroll",
      this.boundOnScroll,
    );
  }

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.scrollTop <= -50 && !this.refreshing) {
      this.refreshing = true;
      this.dashboardService.refreshAll();
      // Simulate refresh finish (service calls complete, but we add a small delay)
      setTimeout(() => {
        this.refreshing = false;
      }, 500);
    }
  }

  toggleExpand(): void {
    this.expanded = !this.expanded;
  }

  handleListen(word: string): void {
    if (!word) return;
    this.ttsService.play(word);
  }

  handleSaveToFavorites(word: WordOfTheDay): void {
    this.savingFavorite = true;
    this.apiClient
      .post("/favorites", {
        text: word.word,
        type: "word",
        note: "",
      })
      .subscribe({
        next: () => {
          this.message.success("Saved to library!");
          this.dashboardService.fetchUserStats().subscribe();
          this.savingFavorite = false;
        },
        error: (err) => {
          this.message.error("Failed to save");
          this.savingFavorite = false;
        },
      });
  }

  // Helper to get dynamic color class for intro chips
  getChipColorClass(color: string): string {
    switch (color) {
      case "blue":
        return "bg-blue-50 text-blue-600";
      case "green":
        return "bg-green-50 text-green-600";
      case "purple":
        return "bg-purple-50 text-purple-600";
      case "orange":
        return "bg-orange-50 text-orange-600";
      default:
        return "bg-gray-50 text-gray-600";
    }
  }

  private buildStatCards(stats: UserStats | null) {
    if (!stats) {
      return [
        {
          id: "quiz",
          label: "Quizzes",
          icon: "file-text",
          value: 0,
          iconColor: "text-blue-500",
          route: "/quiz?mine=true",
        },
        {
          id: "question",
          label: "Questions",
          icon: "question-circle",
          value: 0,
          iconColor: "text-green-500",
          route: "/questions",
        },
        {
          id: "source",
          label: "Sources",
          icon: "folder-open",
          value: 0,
          iconColor: "text-purple-500",
          route: "/source",
        },
        {
          id: "favorite",
          label: "Favorites",
          icon: "star",
          value: 0,
          iconColor: "text-orange-500",
          route: "/profile?tab=favorites",
        },
      ];
    }
    return [
      {
        id: "quiz",
        label: "Quizzes",
        icon: "file-text",
        value: stats.quizCount,
        iconColor: "text-blue-500",
        route: "/quiz?mine=true",
      },
      {
        id: "question",
        label: "Questions",
        icon: "question-circle",
        value: stats.questionCount,
        iconColor: "text-green-500",
        route: "/questions",
      },
      {
        id: "source",
        label: "Sources",
        icon: "folder-open",
        value: stats.sourceCount,
        iconColor: "text-purple-500",
        route: "/source",
      },
      {
        id: "favorite",
        label: "Favorites",
        icon: "star",
        value: stats.favoriteCount,
        iconColor: "text-orange-500",
        route: "/profile?tab=favorites",
      },
    ];
  }
}
