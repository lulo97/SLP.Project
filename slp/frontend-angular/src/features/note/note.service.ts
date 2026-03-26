import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap, finalize } from 'rxjs/operators';
import { ApiClientService } from '../../services/api-client.service';
import { Note, PaginatedResult } from './note.model';

@Injectable({ providedIn: 'root' })
export class NoteService {
  // State
  private notesSubject = new BehaviorSubject<Note[]>([]);
  public notes$ = this.notesSubject.asObservable();

  private currentNoteSubject = new BehaviorSubject<Note | null>(null);
  public currentNote$ = this.currentNoteSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  private totalSubject = new BehaviorSubject<number>(0);
  public total$ = this.totalSubject.asObservable();

  private pageSubject = new BehaviorSubject<number>(1);
  public page$ = this.pageSubject.asObservable();

  private pageSizeSubject = new BehaviorSubject<number>(10);
  public pageSize$ = this.pageSizeSubject.asObservable();

  private currentSearchSubject = new BehaviorSubject<string>('');
  public currentSearch$ = this.currentSearchSubject.asObservable();

  constructor(private apiClient: ApiClientService) {}

  fetchNotes(search?: string, page: number = 1, pageSize: number = 10): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const params: any = { page, pageSize };
    if (search) params.search = search;

    this.apiClient
      .get<PaginatedResult<Note>>('/notes', { params })
      .pipe(
        tap((result) => {
          this.notesSubject.next(result.items);
          this.totalSubject.next(result.total);
          this.pageSubject.next(result.page);
          this.pageSizeSubject.next(result.pageSize);
          this.currentSearchSubject.next(search || '');
        }),
        catchError((err) => {
          this.errorSubject.next(err?.error?.message || 'Failed to load notes');
          return throwError(() => err);
        }),
        finalize(() => this.loadingSubject.next(false))
      )
      .subscribe();
  }

  fetchNoteById(id: number): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.apiClient
      .get<Note>(`/notes/${id}`)
      .pipe(
        tap((note) => this.currentNoteSubject.next(note)),
        catchError((err) => {
          this.errorSubject.next(err?.error?.message || 'Failed to load note');
          return throwError(() => err);
        }),
        finalize(() => this.loadingSubject.next(false))
      )
      .subscribe();
  }

  createNote(title: string, content: string): Observable<Note> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient
      .post<Note>('/notes', { title, content })
      .pipe(
        tap((newNote) => {
          // Add to beginning of list
          const current = this.notesSubject.value;
          this.notesSubject.next([newNote, ...current]);
          this.loadingSubject.next(false);
        }),
        catchError((err) => {
          this.errorSubject.next(err?.error?.message || 'Failed to create note');
          this.loadingSubject.next(false);
          return throwError(() => err);
        })
      );
  }

  updateNote(id: number, title: string, content: string): Observable<Note> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient
      .put<Note>(`/notes/${id}`, { title, content })
      .pipe(
        tap((updated) => {
          // Update in list if exists
          const notes = this.notesSubject.value;
          const index = notes.findIndex((n) => n.id === id);
          if (index !== -1) {
            notes[index] = updated;
            this.notesSubject.next([...notes]);
          }
          if (this.currentNoteSubject.value?.id === id) {
            this.currentNoteSubject.next(updated);
          }
          this.loadingSubject.next(false);
        }),
        catchError((err) => {
          this.errorSubject.next(err?.error?.message || 'Failed to update note');
          this.loadingSubject.next(false);
          return throwError(() => err);
        })
      );
  }

  deleteNote(id: number): Observable<void> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.apiClient
      .delete<void>(`/notes/${id}`)
      .pipe(
        tap(() => {
          // Remove from list
          const notes = this.notesSubject.value.filter((n) => n.id !== id);
          this.notesSubject.next(notes);
          if (this.currentNoteSubject.value?.id === id) {
            this.currentNoteSubject.next(null);
          }
          this.loadingSubject.next(false);
        }),
        catchError((err) => {
          this.errorSubject.next(err?.error?.message || 'Failed to delete note');
          this.loadingSubject.next(false);
          return throwError(() => err);
        })
      );
  }

  resetCurrentNote(): void {
    this.currentNoteSubject.next(null);
  }

  clearError(): void {
    this.errorSubject.next(null);
  }
}