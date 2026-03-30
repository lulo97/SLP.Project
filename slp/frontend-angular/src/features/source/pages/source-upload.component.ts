import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { NzUploadModule, NzUploadFile } from "ng-zorro-antd/upload";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzAlertModule } from "ng-zorro-antd/alert";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMessageService } from "ng-zorro-antd/message";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { NzFormModule } from "ng-zorro-antd/form";
import { SourceService } from "../services/source.service";

@Component({
  selector: "app-source-upload",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzUploadModule,
    NzButtonModule,
    NzInputModule,
    NzCardModule,
    NzAlertModule,
    NzIconModule,
    TranslateModule,
    NzFormModule,
  ],
  template: `
    <nz-card class="shadow-md rounded-lg" data-testid="source-upload-card">
      <form
        nz-form
        nzLayout="vertical"
        (ngSubmit)="handleUpload()"
        data-testid="source-upload-form"
        class="flex flex-col gap-4"
      >
        <nz-form-item class="mb-0">
          <nz-form-label class="font-semibold text-gray-700">
            {{ "source.title" | translate }}
          </nz-form-label>
          <nz-form-control>
            <input
              nz-input
              [(ngModel)]="title"
              name="title"
              [placeholder]="'source.titlePlaceholder' | translate"
              data-testid="source-upload-title-input"
              class="rounded-md"
            />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item class="mb-0">
          <nz-form-control>
            <nz-upload
              nzType="drag"
              [nzFileList]="fileList"
              [nzBeforeUpload]="beforeUpload"
              (nzFileListChange)="handleChange($event)"
              [nzMultiple]="false"
              [nzLimit]="1"
              data-testid="source-upload-dragger"
              class="block w-full"
            >
              <div class="py-4">
                <p class="text-4xl text-blue-500 mb-2">
                  <i nz-icon nzType="inbox"></i>
                </p>
                <p class="text-base font-medium text-gray-800">
                  {{ "source.dragText" | translate }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ "source.uploadHint" | translate }}
                </p>
              </div>
            </nz-upload>

            <div
              *ngIf="fileList.length > 0"
              class="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-md flex items-center gap-2 text-sm text-blue-700"
              data-testid="source-upload-selected-file"
            >
              <i nz-icon nzType="paper-clip"></i>
              <span class="font-medium"
                >{{ "source.selected" | translate }}:</span
              >
              <span class="truncate">{{ fileList[0].name }}</span>
            </div>
          </nz-form-control>
        </nz-form-item>

        <div class="pt-2">
          <button
            nz-button
            nzType="primary"
            type="submit"
            [disabled]="!fileList.length"
            [nzLoading]="(loading$ | async)!"
            class="w-full h-10 font-semibold rounded-md flex justify-center items-center"
            data-testid="source-upload-submit-btn"
          >
            {{ "source.upload" | translate }}
          </button>
        </div>
      </form>

      <nz-alert
        *ngIf="error$ | async as err"
        [nzMessage]="err"
        nzType="error"
        nzShowIcon
        nzClosable
        (nzOnClose)="sourceService.clearError()"
        class="mt-4"
        data-testid="source-upload-error"
      ></nz-alert>
    </nz-card>
  `,
})
export class SourceUploadComponent {
  public sourceService = inject(SourceService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private translate = inject(TranslateService);

  loading$ = this.sourceService.loading$;
  error$ = this.sourceService.error$;

  title = "";
  fileList: NzUploadFile[] = [];

  beforeUpload = (file: NzUploadFile): boolean => {
    const isLt20M = (file.size ?? 0) / 1024 / 1024 < 20;
    if (!isLt20M) {
      this.message.error(this.translate.instant("source.fileTooBig"));
      return false;
    }
    const allowedTypes = ["application/pdf", "text/plain", "text/html"];
    if (!allowedTypes.includes(file.type!)) {
      this.message.error(this.translate.instant("source.fileTypeError"));
      return false;
    }
    return true;
  };

  handleChange(fileList: NzUploadFile[]): void {
    this.fileList = fileList;
  }

  handleUpload(): void {
    if (!this.fileList.length) return;
    const file = this.fileList[0].originFileObj as File;
    this.sourceService
      .uploadSource(file, this.title.trim() || undefined)
      .subscribe({
        next: (result) => {
          this.message.success(this.translate.instant("source.uploadSuccess"));
          this.router.navigate(["/source", result.id]);
        },
        error: () => {
          this.message.error(this.translate.instant("source.uploadError"));
        },
      });
  }
}
