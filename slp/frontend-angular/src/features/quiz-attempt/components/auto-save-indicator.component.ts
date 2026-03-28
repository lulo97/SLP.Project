import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-auto-save-indicator',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  template: `
    <span class="text-xs text-gray-500" data-testid="auto-save-indicator">
      <i *ngIf="saving" nz-icon nzType="sync" nzSpin data-testid="saving-icon"></i>
      <span data-testid="auto-save-label">{{ saving ? 'Saving...' : 'Saved' }}</span>
    </span>
  `,
})
export class AutoSaveIndicatorComponent {
  @Input() saving = false;
}