import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import dayjs, { Dayjs } from 'dayjs';

@Component({
  selector: 'app-admin-log-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzDatePickerModule,
    NzInputModule,
    NzButtonModule,
  ],
  template: `
    <div class="log-filters">
      <nz-select
        [(ngModel)]="filters.action"
        nzAllowClear
        nzPlaceHolder="Action"
        style="width: 150px"
      >
        <nz-option nzValue="ban_user" nzLabel="ban_user"></nz-option>
        <nz-option nzValue="unban_user" nzLabel="unban_user"></nz-option>
        <nz-option nzValue="disable_quiz" nzLabel="disable_quiz"></nz-option>
        <nz-option nzValue="enable_quiz" nzLabel="enable_quiz"></nz-option>
        <nz-option nzValue="delete_comment" nzLabel="delete_comment"></nz-option>
        <nz-option nzValue="restore_comment" nzLabel="restore_comment"></nz-option>
      </nz-select>

      <nz-select
        [(ngModel)]="filters.targetType"
        nzAllowClear
        nzPlaceHolder="Target type"
        style="width: 120px"
      >
        <nz-option nzValue="user" nzLabel="user"></nz-option>
        <nz-option nzValue="quiz" nzLabel="quiz"></nz-option>
        <nz-option nzValue="comment" nzLabel="comment"></nz-option>
      </nz-select>

      <nz-range-picker
        [(ngModel)]="filters.dateRange"
        [nzShowTime]="true"
        nzFormat="yyyy-MM-dd HH:mm"
        style="width: 280px"
      ></nz-range-picker>

      <nz-input-group [nzSuffix]="suffixTemplate">
        <input nz-input [(ngModel)]="filters.search" placeholder="Search by admin, action, target ID, details..." />
      </nz-input-group>
      <ng-template #suffixTemplate>
        <i nz-icon nzType="search" (click)="apply()"></i>
      </ng-template>

      <button nz-button nzType="primary" (click)="apply()">Apply</button>
    </div>
  `,
  styles: [`
    .log-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
      align-items: center;
    }
    @media (max-width: 768px) {
      .log-filters > * {
        width: 100% !important;
      }
    }
  `]
})
export class AdminLogFiltersComponent {
  applyFilters = output<any>();

  filters = {
    action: null as string | null,
    targetType: null as string | null,
    dateRange: null as [Dayjs, Dayjs] | null,
    search: '',
  };

  apply() {
    const params: any = {
      action: this.filters.action,
      targetType: this.filters.targetType,
      search: this.filters.search || undefined,
    };
    if (this.filters.dateRange) {
      params.from = this.filters.dateRange[0].toISOString();
      params.to = this.filters.dateRange[1].toISOString();
    }
    this.applyFilters.emit(params);
  }
}