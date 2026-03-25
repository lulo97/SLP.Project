import { Component, Input, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { NzIconModule } from "ng-zorro-antd/icon";
import { TranslateService } from "@ngx-translate/core";
import { combineLatest, map, Subject, takeUntil } from "rxjs";

interface BreadcrumbItem {
  label: string;
  path?: string;
  ellipsis?: boolean;
}

@Component({
  selector: "app-breadcrumb",
  standalone: true,
  imports: [CommonModule, RouterModule, NzIconModule],
  templateUrl: "./breadcrumb.component.html",
  styleUrls: ["./breadcrumb.component.scss"],
})
export class BreadcrumbComponent implements OnInit {
  @Input() fallbackTitle = "";
  @Input() maxItems = 3;
  private destroy$ = new Subject<void>();

  items: BreadcrumbItem[] = [];
  displayItems: BreadcrumbItem[] = [];

  constructor(
    private router: Router,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateBreadcrumb());
    this.updateBreadcrumb();
  }

  private updateBreadcrumb(): void {
    const route = this.router.routerState.snapshot.root;
    let items: BreadcrumbItem[] = [];
    let current = route;
    while (current) {
      const data = current.routeConfig?.data as any;
      if (data?.breadcrumb) {
        items.unshift({ label: data.breadcrumb, path: this.getPath(current) });
      }
      if (current.firstChild) {
        current = current.firstChild;
      } else {
        break; // or set current = null;
      }
    }
    if (items.length === 0) {
      items = [{ label: this.fallbackTitle }];
    }
    this.items = items;
    this.updateDisplayItems();
  }

  private getPath(route: any): string {
    let url = "";
    let current = route;
    while (current) {
      if (current.url && current.url.length) {
        url = "/" + current.url.map((seg: any) => seg.path).join("/") + url;
      }
      current = current.parent;
    }
    return url || "/";
  }

  private updateDisplayItems(): void {
    const all = this.items;
    if (all.length <= this.maxItems) {
      this.displayItems = all;
    } else {
      const tailCount = this.maxItems - 2;
      const first = all[0];
      const tail = all.slice(-tailCount);
      this.displayItems = [first, { label: "…", ellipsis: true }, ...tail];
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
