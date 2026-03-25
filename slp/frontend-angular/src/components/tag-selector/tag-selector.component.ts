import { Component, forwardRef, Input, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NzSelectModule } from "ng-zorro-antd/select";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { TagService, TagDto } from "../../features/tag/tag.service";
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

  // Change from 'any' to 'string[]' for better type safety
  private onChange: (value: string[]) => void = () => {};
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

  // This is called by nz-select's (ngModelChange) in your .html file
  handleChange(newVal: string[]): void {
    const clean = Array.from(
      new Set(newVal.map((v) => v.trim()).filter((v) => !!v)),
    ).slice(0, this.maxTags);

    this.selected = clean;
    this.atLimit = clean.length >= this.maxTags;
    this.onChange(clean); // Notify the parent form
    this.onTouched();
  }

  writeValue(value: string[] | null): void {
    // Standard CVA practice: handle null/undefined
    this.selected = value || [];
    this.atLimit = this.selected.length >= this.maxTags;
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {}
}
