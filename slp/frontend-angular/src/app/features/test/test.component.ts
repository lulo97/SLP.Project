import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="">
      test
    </div>
  `,
  styles: [] // optional, Tailwind handles styling
})
export class TestComponent {}