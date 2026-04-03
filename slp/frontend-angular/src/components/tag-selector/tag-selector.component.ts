import { Component, forwardRef, OnInit, Input } from "@angular/core";
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormControl,
  ReactiveFormsModule,
  FormsModule,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { NzSelectModule } from "ng-zorro-antd/select";
import { TagService, TagDto } from "./tag.service";
import { finalize } from "rxjs/operators";

@Component({
  selector: "app-tag-selector",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NzSelectModule],
  templateUrl: "./tag-selector.component.html",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagSelectorComponent),
      multi: true,
    },
  ],
})
export class TagSelectorComponent implements ControlValueAccessor, OnInit {
  @Input() placeholder = "Select or create tags...";

  tags: TagDto[] = [];
  loading = false;
  error: string | null = null;
  maxTags = 10;
  control = new FormControl<string[]>([]);

  private onChange: any = () => {};
  private onTouched: any = () => {};
  options: { value: string; label: string }[] = [];

  constructor(private tagService: TagService) {}
  private rebuildOptions(): void {
    const apiTags = this.tags.map((t) => ({ value: t.name, label: t.name }));
    const currentValues = (this.control.value || []).map((v) => ({
      value: v,
      label: v,
    }));
    const map = new Map();
    [...apiTags, ...currentValues].forEach((opt) =>
      map.set(opt.value.toLowerCase(), opt),
    );
    this.options = Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }

  loadTags(): void {
    this.loading = true;
    this.tagService
      .fetchTags()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (tags) => {
          this.tags = tags;
          this.rebuildOptions();
        },
        error: (err) => {
          this.error = "Failed to load tags";
        },
      });
  }

  get atLimit(): boolean {
    return (this.control.value?.length || 0) >= this.maxTags;
  }

  ngOnInit(): void {
    this.loadTags();

    this.control.valueChanges.subscribe((value: string[] | null) => {
      const rawValue = value || [];
      const cleaned = this.cleanValues(rawValue);

      // Only update the control if the cleaned version is different
      // from the current version to prevent infinite loops.
      if (JSON.stringify(rawValue) !== JSON.stringify(cleaned)) {
        this.control.setValue(cleaned, { emitEvent: false });
        this.onChange(cleaned);
      } else {
        this.onChange(rawValue);
      }

      this.onTouched();
    });
  }

  // Helper method to keep logic clean
  private cleanValues(values: string[]): string[] {
    const seen = new Set<string>();
    return values
      .map((v) => v.trim())
      .filter((v) => {
        if (!v) return false;
        const key = v.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, this.maxTags);
  }

  // ControlValueAccessor methods
  writeValue(value: string[] | null): void {
    this.control.setValue(value || [], { emitEvent: false });
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.control.disable() : this.control.enable();
  }
}
