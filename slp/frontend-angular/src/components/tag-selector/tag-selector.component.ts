import { Component, forwardRef, OnInit } from "@angular/core";
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormControl,
  ReactiveFormsModule,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { NzSelectModule } from "ng-zorro-antd/select";
import { TagService, TagDto } from "../../features/tag/tag.service";
import { finalize } from "rxjs/operators";

@Component({
  selector: "app-tag-selector",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzSelectModule],
  template: `
    <nz-select
      nzMode="multiple"
      nzPlaceHolder="Select tags"
      [formControl]="control"
      [nzLoading]="loading"
    >
      <nz-option
        *ngFor="let tag of tags"
        [nzValue]="tag.name"
        [nzLabel]="tag.name"
      ></nz-option>
    </nz-select>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagSelectorComponent),
      multi: true,
    },
  ],
})
export class TagSelectorComponent implements ControlValueAccessor, OnInit {
  tags: TagDto[] = [];
  loading = false;
  control = new FormControl<string[]>([]);

  private onChange: any = () => {};
  private onTouched: any = () => {};

  constructor(private tagService: TagService) {}

  ngOnInit(): void {
    this.loadTags();
    // Đồng bộ giá trị từ control ra ngoài
    this.control.valueChanges.subscribe((value) => {
      this.onChange(value);
      this.onTouched();
    });
  }

  loadTags(): void {
    this.loading = true;
    this.tagService
      .fetchTags()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (tags) => (this.tags = tags),
        error: (err) => console.error("Failed to load tags", err),
      });
  }

  // ControlValueAccessor methods
  writeValue(value: string[] | null): void {
    if (value) {
      this.control.setValue(value, { emitEvent: false });
    } else {
      this.control.setValue([], { emitEvent: false });
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.control.disable();
    } else {
      this.control.enable();
    }
  }
}
