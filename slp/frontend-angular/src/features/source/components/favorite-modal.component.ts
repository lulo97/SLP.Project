import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'app-favorite-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NzRadioModule, NzInputModule, NzButtonModule],
  template: `
    <div class="flex flex-col gap-3">
      <div>
        <div class="text-xs font-semibold text-gray-500 mb-1">Selected text</div>
        <textarea
          nz-input
          [(ngModel)]="text"
          rows="3"
          placeholder="Your selected text…"
          data-testid="source-detail-favorite-text-input"
        ></textarea>
      </div>

      <div>
        <div class="text-xs font-semibold text-gray-500 mb-1">Type</div>
        <nz-radio-group
          [(ngModel)]="type"
          nzButtonStyle="solid"
          nzSize="small"
          data-testid="source-detail-favorite-type-group"
        >
          <label nz-radio-button nzValue="word">Word</label>
          <label nz-radio-button nzValue="phrase">Phrase</label>
          <label nz-radio-button nzValue="idiom">Idiom</label>
          <label nz-radio-button nzValue="other">Other</label>
        </nz-radio-group>
      </div>

      <div>
        <div class="text-xs font-semibold text-gray-500 mb-1">Note (optional)</div>
        <input
          nz-input
          [(ngModel)]="note"
          placeholder="Add a personal note…"
          data-testid="source-detail-favorite-note-input"
        />
      </div>
    </div>
  `,
})
export class FavoriteModalComponent {
  private modalRef = inject(NzModalRef);

  text: string = '';
  type: 'word' | 'phrase' | 'idiom' | 'other' = 'word';
  note: string = '';

  constructor() {
    // Get data passed via nzData
    const data = this.modalRef.getConfig().nzData as { text: string };
    if (data?.text) this.text = data.text;
  }

  submit(): void {
    this.modalRef.close({
      text: this.text,
      type: this.type,
      note: this.note.trim() || undefined,
    });
  }
}