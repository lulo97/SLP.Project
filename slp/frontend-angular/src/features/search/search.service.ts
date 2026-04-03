import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SearchResponse } from './search.store';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private apiUrl = '/api/search'; // adjust to your proxy / base URL

  constructor(private http: HttpClient) {}

  search(q: string, type: string, page: number, pageSize: number): Promise<SearchResponse> {
    const params = new HttpParams()
      .set('q', q)
      .set('type', type)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return firstValueFrom(this.http.get<SearchResponse>(this.apiUrl, { params }));
  }
}