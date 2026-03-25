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

  constructor(private tagService: TagService) {}

  // Getter để tạo danh sách options (giống logic computed trong Vue)
  get options() {
    const apiTags = this.tags.map((t) => ({ value: t.name, label: t.name }));
    const currentValues = (this.control.value || []).map((v) => ({
      value: v,
      label: v,
    }));

    // De-duplicate dựa trên lowercase value
    const map = new Map();
    [...apiTags, ...currentValues].forEach((opt) => {
      map.set(opt.value.toLowerCase(), opt);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }

  get atLimit(): boolean {
    return (this.control.value?.length || 0) >= this.maxTags;
  }

  ngOnInit(): void {
    this.loadTags();
    this.control.valueChanges.subscribe((value) => {
      this.onChange(value);
    });
  }

  loadTags(): void {
    this.loading = true;
    this.error = null;
    this.tagService
      .fetchTags()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (tags) => (this.tags = tags),
        error: (err) => {
          this.error = "Failed to load tags";
          console.error(err);
        },
      });
  }

  handleChange(newVal: string[]): void {
    if (!newVal) return;

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

    // Cập nhật lại control với dữ liệu đã làm sạch (tránh vòng lặp vô tận bằng emitEvent: false)
    this.control.setValue(clean, { emitEvent: false });
    this.onChange(clean);
    this.onTouched();
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
