import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AsyncPipe, NgFor, NgIf, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subscription, combineLatest, map } from "rxjs";
import {
  SearchType,
  SearchResultItem,
  SearchStore,
  CategoryCounts,
} from "./search.store";

@Component({
  selector: "app-search-page",
  templateUrl: "./search.component.html",
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, FormsModule],
})

export class SearchPageComponent implements OnInit, OnDestroy {
  // Store observables used in template
  query$;
  activeType$;
  page$;
  results$;
  totalCount$;
  totalPages$;
  categoryCounts$;
  loading$;
  error$;
  lastQuery$;

  hasSearched$;
  hasResults$;

  tabs: { type: SearchType; label: string; icon: string }[] = [
    { type: "all", label: "All", icon: "layout-grid" },
    { type: "quiz", label: "Quizzes", icon: "file-text" },
    { type: "question", label: "Questions", icon: "help-circle" },
    { type: "source", label: "Sources", icon: "folder-open" },
    { type: "favorite", label: "Favorites", icon: "star" },
  ];

  typeConfig: Record<
    Exclude<SearchType, "all">,
    { icon: string; bg: string; color: string; pill: string }
  > = {
    quiz: {
      icon: "file-text",
      bg: "bg-blue-50",
      color: "text-blue-500",
      pill: "bg-blue-50 text-blue-600",
    },
    question: {
      icon: "help-circle",
      bg: "bg-violet-50",
      color: "text-violet-500",
      pill: "bg-violet-50 text-violet-600",
    },
    source: {
      icon: "folder-open",
      bg: "bg-amber-50",
      color: "text-amber-500",
      pill: "bg-amber-50 text-amber-600",
    },
    favorite: {
      icon: "star",
      bg: "bg-rose-50",
      color: "text-rose-500",
      pill: "bg-rose-50 text-rose-600",
    },
  };

  private sub = new Subscription();

  constructor(
    public store: SearchStore,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.query$ = this.store.query$;
    this.activeType$ = this.store.activeType$;
    this.page$ = this.store.page$;
    this.results$ = this.store.results$;
    this.totalCount$ = this.store.totalCount$;
    this.totalPages$ = this.store.totalPages$;
    this.categoryCounts$ = this.store.categoryCounts$;
    this.loading$ = this.store.loading$;
    this.error$ = this.store.error$;
    this.lastQuery$ = this.store.lastQuery$;

    this.hasSearched$ = this.store.lastQuery$.pipe(map((q) => q.length > 0));
    this.hasResults$ = this.store.results$.pipe(map((r) => r.length > 0));
  }

  ngOnInit() {
    // Watcher A: store → URL (replace)
    this.sub.add(
      combineLatest([
        this.store.lastQuery$,
        this.store.activeType$,
        this.store.page$,
      ]).subscribe(([q, type, page]) => {
        if (!q) return;

        const currentQuery = this.route.snapshot.queryParams;
        if (
          currentQuery["q"] !== q ||
          currentQuery["type"] !== type ||
          +currentQuery["page"] !== page
        ) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { q, type, page },
            replaceUrl: true,
          });
        }
      }),
    );

    // Watcher B: URL → store
    this.sub.add(
      this.route.queryParams.subscribe((params) => {
        const q = params["q"] || "";
        const type = (params["type"] as SearchType) || "all";
        const page = parseInt(params["page"], 10) || 1;

        if (!q) return;

        if (
          q === this.store.lastQuery &&
          type === this.store.activeType &&
          page === this.store.page
        )
          return;

        this.store.setQuery(q);
        this.store.setType(type);

        if (page !== 1) {
          this.store.setPage(page);
        } else {
          this.store.search();
        }
      }),
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  getTabCount(type: SearchType): number | null {
    const counts = this.store.categoryCountsSubject.value;
    if (!counts) return null;
    if (type === "all") return this.store.totalCount;

    const map: Record<SearchType, keyof CategoryCounts | null> = {
      all: null,
      quiz: "quizzes",
      question: "questions",
      source: "sources",
      favorite: "favorites",
    };

    const key = map[type];
    return key ? counts[key] : null;
  }

  formatDate(iso: Date): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  navigateTo(item: SearchResultItem) {
    switch (item.resultType) {
      case "quiz":
        this.router.navigate(["/quiz/view", item.id]);
        break;
      case "question":
        this.router.navigate(["/question", item.id, "edit"]);
        break;
      case "source":
        this.router.navigate(["/source", item.id]);
        break;
      case "favorite":
        this.router.navigate(["/favourites", item.id]);
        break;
    }
  }

  onSearch() {
    this.store.search(true);
  }

  onTypeChange(type: SearchType) {
    this.store.setType(type);
  }

  onPageChange(page: number) {
    this.store.setPage(page);
  }
}
