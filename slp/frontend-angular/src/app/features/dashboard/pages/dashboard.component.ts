import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[calc(100vh-10vh-2rem)] space-y-4">
      <h1 class="text-2xl font-bold text-gray-800">Hello World!</h1>
      <p class="text-gray-600 text-center max-w-md">
        Welcome to your dashboard. This is a mobile‑only view.
      </p>
      <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-700 text-sm">
        🚀 This page is optimised for mobile devices. The right sidebar is accessible via the menu button.
      </div>
    </div>
  `,
  styles: [] // optional, Tailwind handles styling
})
export class DashboardComponent {}