import { Injectable, TemplateRef } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export interface MobileHeaderState {
  left?: TemplateRef<unknown> | null;
  center?: TemplateRef<unknown> | null;
  right?: TemplateRef<unknown> | null;
}

@Injectable({ providedIn: "root" })
export class MobileHeaderService {
  private readonly headerStateSubject = new BehaviorSubject<MobileHeaderState>(
    {},
  );

  readonly header$ = this.headerStateSubject.asObservable();

  setHeader(state: MobileHeaderState): void {
    this.headerStateSubject.next(state);
  }

  clearHeader(): void {
    this.headerStateSubject.next({});
  }
}