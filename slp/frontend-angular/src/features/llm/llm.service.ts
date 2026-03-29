import { Injectable, inject } from "@angular/core";
import { ApiClientService } from "../../services/api-client.service";
import {
  Observable,
  throwError,
  of,
  interval,
  switchMap,
  takeWhile,
  catchError,
  map,
  expand,
  filter,
  timer,
} from "rxjs";
import { NzMessageService } from "ng-zorro-antd/message";

export interface ExplainRequest {
  sourceId: number;
  selectedText: string;
  context?: string;
}

export interface GrammarCheckRequest {
  text: string;
}

interface AsyncJobResponse {
  jobId: string;
  status: "Pending" | "Processing" | "Completed" | "Failed";
}

interface JobStatusResponse extends AsyncJobResponse {
  result?: string;
  error?: string;
}

@Injectable({ providedIn: "root" })
export class LlmService {
  private api = inject(ApiClientService);
  private message = inject(NzMessageService);

  requestExplanation(request: ExplainRequest): Observable<string> {
    return this.api
      .post<AsyncJobResponse | { result: string }>("/llm/explain", request)
      .pipe(
        switchMap((response) => {
          // Check if async mode (response contains jobId)
          if ("jobId" in response && response.jobId) {
            return this.pollJobStatus(response.jobId);
          }
          // Sync mode: return result directly
          if ("result" in response && typeof response.result === "string") {
            return of(response.result);
          }
          return throwError(() => new Error("Unexpected LLM response format"));
        }),
      );
  }

  requestGrammarCheck(request: GrammarCheckRequest): Observable<string> {
    return this.api
      .post<
        AsyncJobResponse | { result: string }
      >("/llm/grammar-check", request)
      .pipe(
        switchMap((response) => {
          if ("jobId" in response && response.jobId) {
            return this.pollJobStatus(response.jobId);
          }
          if ("result" in response && typeof response.result === "string") {
            return of(response.result);
          }
          return throwError(() => new Error("Unexpected LLM response format"));
        }),
      );
  }

  private pollJobStatus(jobId: string): Observable<string> {
    const pollIntervalMs = 2_000;
    const maxAttempts = 120; // 2 minutes total

    return timer(0, pollIntervalMs).pipe(
      // Each tick → one HTTP call; switchMap cancels any in-flight request
      // if the next tick fires before it finishes (safe-guard for slow networks)
      switchMap((attempt) => {
        if (attempt >= maxAttempts) {
          return throwError(() => new Error("LLM job timed out"));
        }
        return this.api.get<JobStatusResponse>(`/llm/job/${jobId}`);
      }),

      // Map response to a discriminated union so takeWhile can signal "stop"
      map((response) => {
        if (response.status === "Completed") {
          if (!response.result) {
            throw new Error("Job completed but no result returned");
          }
          return { done: true, value: response.result };
        }
        if (response.status === "Failed") {
          throw new Error(response.error ?? "LLM job failed");
        }
        // Pending | Processing → keep polling
        return { done: false, value: null as string | null };
      }),

      // Emit the terminal item (inclusive = true), then complete automatically
      takeWhile((r) => !r.done, /* inclusive */ true),

      // Discard intermediate Pending/Processing ticks
      filter((r): r is { done: true; value: string } => r.done),

      map((r) => r.value),
    );
  }
}
