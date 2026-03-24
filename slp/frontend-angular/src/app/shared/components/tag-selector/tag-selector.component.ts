import { Component, forwardRef, Input, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NzSelectModule } from "ng-zorro-antd/select";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { TagService, TagDto } from "../../../features/tag/tag.service";
import { of } from "rxjs";
import { catchError, tap } from "rxjs/operators";

@Component({
  selector: "app-tag-selector",
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule],
  templateUrl: "./tag-selector.component.html",
  styleUrls: ["./tag-selector.component.scss"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagSelectorComponent),
      multi: true,
    },
  ],
})
export class TagSelectorComponent implements OnInit, ControlValueAccessor {
  @Input() placeholder = "Select or create tags…";
  @Input() maxTags = 10;

  selected: string[] = [];
  options: Array<{ value: string; label: string }> = [];
  loading = false;
  error = "";
  atLimit = false;

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private tagService: TagService) {}

  ngOnInit(): void {
    this.loadTags();
  }

  loadTags(): void {
    this.loading = true;
    this.tagService
      .fetchTags()
      .pipe(
        catchError((err) => {
          this.error = err.message || "Failed to load tags";
          return of([]);
        }),
        tap(() => (this.loading = false)),
      )
      .subscribe((tags) => {
        this.options = tags.map((tag: { name: any }) => ({
          value: tag.name,
          label: tag.name,
        }));
      });
  }

  handleChange(newVal: string[]): void {
    // normalize: trim, deduplicate, limit
    const seen = new Set<string>();
    const clean = newVal
      .map((v) => v.trim())
      .filter((v) => {
        if (!v) return false;
        const key = v.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, this.maxTags);
    this.selected = clean;
    this.atLimit = clean.length >= this.maxTags;
    this.onChange(clean);
  }

  // ControlValueAccessor
  writeValue(value: any): void {
    if (value !== undefined && value !== null) {
      this.selected = value;
      this.atLimit = this.selected.length >= this.maxTags;
    }
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {}
}
