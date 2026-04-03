import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SearchService } from './search.service';

export type SearchType = 'all' | 'quiz' | 'question' | 'source' | 'favorite';

export interface SearchResultItem {
  resultType: SearchType;
  id: number;
  title: string;
  snippet: string | null;
  rank: number;
  tags: string[];
  createdAt: Date;
  subType: string | null;
  visibility: string | null;
}

export interface CategoryCounts {
  quizzes: number;
  questions: number;
  sources: number;
  favorites: number;
}

export interface SearchResponse {
  query: string;
  type: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  results: SearchResultItem[];
  categoryCounts: CategoryCounts | null;
}

@Injectable({ providedIn: 'root' })
export class SearchStore {
  // State subjects
  private querySubject = new BehaviorSubject<string>('');
  private activeTypeSubject = new BehaviorSubject<SearchType>('all');
  private pageSubject = new BehaviorSubject<number>(1);
  private pageSize = 20;

  private resultsSubject = new BehaviorSubject<SearchResultItem[]>([]);
  private totalCountSubject = new BehaviorSubject<number>(0);
  private totalPagesSubject = new BehaviorSubject<number>(0);
  public categoryCountsSubject = new BehaviorSubject<CategoryCounts | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private lastQuerySubject = new BehaviorSubject<string>('');

  // Public observables
  query$ = this.querySubject.asObservable();
  activeType$ = this.activeTypeSubject.asObservable();
  page$ = this.pageSubject.asObservable();
  results$ = this.resultsSubject.asObservable();
  totalCount$ = this.totalCountSubject.asObservable();
  totalPages$ = this.totalPagesSubject.asObservable();
  categoryCounts$ = this.categoryCountsSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  lastQuery$ = this.lastQuerySubject.asObservable();

  // Getters for immediate use
  get query() { return this.querySubject.value; }
  get activeType() { return this.activeTypeSubject.value; }
  get page() { return this.pageSubject.value; }
  get lastQuery() { return this.lastQuerySubject.value; }
  get totalCount() { return this.totalCountSubject.value; }
  get totalPages() { return this.totalPagesSubject.value; }
  get hasSearched() { return this.lastQuerySubject.value.length > 0; }
  get hasResults() { return this.resultsSubject.value.length > 0; }

  constructor(private searchService: SearchService) {}

  setQuery(q: string) {
    this.querySubject.next(q);
  }

  setType(type: SearchType) {
    this.activeTypeSubject.next(type);
    this.pageSubject.next(1);
    if (this.lastQuery) this.search();
  }

  setPage(page: number) {
    this.pageSubject.next(page);
    this.search();
  }

  async search(resetPage = false) {
    const q = this.query.trim();
    if (!q) return;

    if (resetPage || q !== this.lastQuery) {
      this.pageSubject.next(1);
    }

    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const response = await this.searchService.search(
        q,
        this.activeType,
        this.pageSubject.value,
        this.pageSize
      );
      this.resultsSubject.next(response.results);
      this.totalCountSubject.next(response.totalCount);
      this.totalPagesSubject.next(response.totalPages);
      this.categoryCountsSubject.next(response.categoryCounts || null);
      this.lastQuerySubject.next(q);
    } catch (err: any) {
      this.errorSubject.next(err.message || 'Search failed');
      this.resultsSubject.next([]);
      this.totalCountSubject.next(0);
      this.totalPagesSubject.next(0);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  reset() {
    this.querySubject.next('');
    this.activeTypeSubject.next('all');
    this.pageSubject.next(1);
    this.resultsSubject.next([]);
    this.totalCountSubject.next(0);
    this.totalPagesSubject.next(0);
    this.categoryCountsSubject.next(null);
    this.errorSubject.next(null);
    this.lastQuerySubject.next('');
  }
}