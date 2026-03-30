import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzTableModule } from "ng-zorro-antd/table";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzMessageService } from "ng-zorro-antd/message";
import { ApiClientService } from "../../../services/api-client.service";

interface ServiceHealth {
  name: string;
  status: string;
  details?: string;
  responseTimeMs: number;
}

@Component({
  selector: "app-admin-health-page",
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzTableModule,
    NzButtonModule,
    NzTagModule,
    NzSpinModule,
  ],
  template: `
    <div>
      <nz-card>
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">System Services</h2>
          <button
            nz-button
            nzType="primary"
            (click)="refresh()"
            [nzLoading]="loading()"
          >
            Refresh
          </button>
        </div>
        <nz-table
          [nzData]="services()"
          [nzLoading]="loading()"
          [nzShowPagination]="false"
        >
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>Details</th>
              <th>Response Time</th>
            </tr>
          </thead>
          <tbody>
            @for (s of services(); track s.name) {
              <tr>
                <td>{{ s.name }}</td>
                <td>
                  <nz-tag [nzColor]="statusColor(s.status)">{{
                    s.status
                  }}</nz-tag>
                </td>
                <td>{{ s.details }}</td>
                <td>{{ s.responseTimeMs }} ms</td>
              </tr>
            }
          </tbody>
        </nz-table>
        <div class="mt-4 text-xs text-gray-500">
          Last updated: {{ timestamp() ? (timestamp() | date: "medium") : "—" }}
        </div>
      </nz-card>
    </div>
  `,
})
export class AdminHealthPageComponent implements OnInit {
  private api = inject(ApiClientService);
  private message = inject(NzMessageService);
  services = signal<ServiceHealth[]>([]);
  timestamp = signal<string | null>(null);
  loading = signal(false);

  ngOnInit() {
    this.fetchHealth();
  }

  async fetchHealth() {
    this.loading.set(true);
    try {
      const res: any = await this.api
        .get("/HealthDashboard/services")
        .toPromise();
      this.services.set(res.services);
      this.timestamp.set(res.timestamp);
    } catch {
      this.message.error("Failed to load health status");
    } finally {
      this.loading.set(false);
    }
  }

  refresh() {
    this.fetchHealth();
  }

  statusColor(status: string): string {
    switch (status) {
      case "Healthy":
        return "green";
      case "Degraded":
        return "orange";
      default:
        return "red";
    }
  }
}
