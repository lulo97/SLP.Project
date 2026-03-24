import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class ApiClientService {
  private baseUrl = environment.apiBackendUrl;

  constructor(private http: HttpClient) {}

  // ✅ Correct signature
  get<T>(
    url: string,
    options?: {
      headers?: HttpHeaders | { [header: string]: string | string[] };
      params?:
        | HttpParams
        | {
            [param: string]:
              | string
              | number
              | boolean
              | ReadonlyArray<string | number | boolean>;
          };
    },
  ) {
    return this.http.get<T>(`${this.baseUrl}${url}`, options);
  }

  post<T>(
    url: string,
    body: any,
    options?: { headers?: HttpHeaders },
  ): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${url}`, body, options);
  }

  put<T>(
    url: string,
    body: any,
    options?: { headers?: HttpHeaders },
  ): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${url}`, body, options);
  }

  delete<T>(url: string, options?: { headers?: HttpHeaders }): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${url}`, options);
  }
}
