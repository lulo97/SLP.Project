import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'app-ordering-question',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, NzButtonModule],
  template: `
    <div
      cdkDropList
      class="space-y-2"
      (cdkDropListDropped)="drop($event)"
      data-testid="ordering-container"
    >
      <div
        *ngFor="let item of _items; let i = index"
        cdkDrag
        class="flex items-center gap-2 bg-gray-50 p-2 rounded border cursor-move"
        [attr.data-testid]="'ordering-item-' + item.order_id"
      >
        <i nz-icon nzType="menu" nzTheme="outline" class="drag-handle"></i>
        <span class="flex-1" [attr.data-testid]="'ordering-item-text-' + item.order_id">
          {{ item.text }}
        </span>
        <span class="text-xs text-gray-400" [attr.data-testid]="'ordering-item-position-' + item.order_id">
          {{ i + 1 }}
        </span>
      </div>
    </div>
  `,
})
export class OrderingQuestionComponent {
  _items: Array<{ text: string; order_id: number }> = [];

  private _sourceItems: Array<{ text: string; order_id: number }> = [];
  private _value: number[] = [];

  @Input() set items(value: Array<{ text: string; order_id: number }>) {
    this._sourceItems = value;
    this.applyOrder();
  }

  // Accepts a saved order (array of order_ids) and reorders items to match.
  // Falls back to the original order when empty/null.
  @Input() set value(order: number[]) {
    this._value = order ?? [];
    this.applyOrder();
  }

  @Output() valueChange = new EventEmitter<number[]>();

  drop(event: CdkDragDrop<Array<{ text: string; order_id: number }>>) {
    moveItemInArray(this._items, event.previousIndex, event.currentIndex);
    this.emitOrder();
  }

  private applyOrder(): void {
    if (!this._sourceItems.length) return;

    if (this._value.length) {
      // Restore previously saved ordering
      const itemMap = new Map(this._sourceItems.map(item => [item.order_id, item]));
      const ordered = this._value
        .map(id => itemMap.get(id))
        .filter((item): item is { text: string; order_id: number } => !!item);

      // Append any items not present in the saved value (defensive)
      const orderedIds = new Set(this._value);
      const remainder = this._sourceItems.filter(item => !orderedIds.has(item.order_id));
      this._items = [...ordered, ...remainder];
    } else {
      this._items = [...this._sourceItems];
    }
    // Do NOT emit here — we're restoring state, not recording user input
  }

  private emitOrder(): void {
    this.valueChange.emit(this._items.map(item => item.order_id));
  }
}