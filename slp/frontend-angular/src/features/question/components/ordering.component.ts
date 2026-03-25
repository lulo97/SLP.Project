// src/features/question/components/ordering.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form'; // ✅ Added

@Component({
  selector: 'app-ordering',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzButtonModule, NzFormModule], // ✅ Added NzFormModule
  template: `
    <nz-form-item>
      <nz-form-label>Ordered Items (from first to last)</nz-form-label>
      <nz-form-control>
        <div *ngFor="let item of items; let i = index" class="flex items-center mb-2">
          <span class="w-6 text-right">{{ i+1 }}.</span>
          <input nz-input [(ngModel)]="items[i]" placeholder="Item {{ i+1 }}" class="flex-1" (ngModelChange)="onItemsChange()" />
          <button nz-button nzType="text" nzDanger (click)="removeItem(i)" type="button">Remove</button>
        </div>
        <button nz-button nzType="dashed" block (click)="addItem()" type="button">Add Item</button>
      </nz-form-control>
    </nz-form-item>
  `,
  styles: [`
    .flex.items-center { gap: 8px; }
    .flex-1 { flex: 1; }
  `]
})
export class OrderingComponent implements OnInit {
  @Input() items: string[] = [];
  @Output() itemsChange = new EventEmitter<string[]>();

  ngOnInit(): void {
    if (!this.items.length) this.items = ['', '', '', ''];
  }

  addItem(): void {
    this.items.push('');
    this.itemsChange.emit(this.items);
  }

  removeItem(index: number): void {
    this.items.splice(index, 1);
    this.itemsChange.emit(this.items);
  }

  onItemsChange(): void {
    this.itemsChange.emit(this.items);
  }
}