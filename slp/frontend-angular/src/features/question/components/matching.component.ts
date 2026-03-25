// src/features/question/components/matching.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFormModule } from 'ng-zorro-antd/form'; // ✅ Added

export interface MatchingPair {
  left: string;
  right: string;
}

@Component({
  selector: 'app-matching',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzButtonModule, NzIconModule, NzFormModule], // ✅ Added NzFormModule
  template: `
    <nz-form-item>
      <nz-form-label>Matching Pairs</nz-form-label>
      <nz-form-control>
        <div *ngFor="let pair of pairs; let i = index" class="matching-row mb-2 flex items-center gap-2 flex-wrap">
          <span class="pair-index">{{ i+1 }}.</span>
          <input nz-input [(ngModel)]="pair.left" placeholder="Left" class="input-left flex-1" (ngModelChange)="onPairsChange()" />
          <input nz-input [(ngModel)]="pair.right" placeholder="Right" class="input-right flex-1" (ngModelChange)="onPairsChange()" />
          <button nz-button nzType="text" nzDanger (click)="removePair(i)" type="button"><i nz-icon nzType="close"></i></button>
        </div>
        <button nz-button nzType="dashed" block (click)="addPair()" type="button">Add Pair</button>
      </nz-form-control>
    </nz-form-item>
  `,
  styles: [`
    .matching-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .pair-index { font-size: 14px; color: #8c8c8c; font-weight: 500; min-width: 28px; text-align: right; }
    .input-left, .input-right { flex: 1 1 0; min-width: 100px; }
    @media (max-width: 480px) {
      .input-left, .input-right { min-width: 80px; }
    }
  `]
})
export class MatchingComponent implements OnInit {
  @Input() pairs: MatchingPair[] = [];
  @Output() pairsChange = new EventEmitter<MatchingPair[]>();

  ngOnInit(): void {
    if (!this.pairs.length) {
      this.pairs = [
        { left: '', right: '' },
        { left: '', right: '' },
        { left: '', right: '' },
        { left: '', right: '' }
      ];
    }
  }

  addPair(): void {
    this.pairs.push({ left: '', right: '' });
    this.pairsChange.emit(this.pairs);
  }

  removePair(index: number): void {
    this.pairs.splice(index, 1);
    this.pairsChange.emit(this.pairs);
  }

  onPairsChange(): void {
    this.pairsChange.emit(this.pairs);
  }
}