import { ApplicationConfig, importProvidersFrom } from "@angular/core";
import {
  provideHttpClient,
  HttpClient,
  withInterceptors,
} from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";
import { TranslateModule, TranslateLoader } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";

// NG-ZORRO Imports
import { NZ_I18N, en_US } from "ng-zorro-antd/i18n";
import { NzMessageModule } from "ng-zorro-antd/message";
import { provideNzConfig, NzConfig } from "ng-zorro-antd/core/config";
import { provideNzIcons } from "ng-zorro-antd/icon";

import {
  // Auth / form icons
  UserOutline,
  LockOutline,
  MailOutline,
  EyeOutline,
  EyeInvisibleOutline,
  // Layout icons
  MenuOutline,
  CloseOutline,
  RightOutline,
  // Navigation icons
  DashboardOutline,
  FileTextOutline,
  PlusCircleOutline,
  QuestionCircleOutline,
  PlusOutline,
  FolderOpenOutline,
  UploadOutline,
  LinkOutline,
  StarOutline,
  SearchOutline,
  FlagOutline,
  SecurityScanOutline,
  SettingOutline,
  LogoutOutline,
  // Status icons
  CheckCircleOutline,
  CloseCircleOutline,
  LoadingOutline,
  SunOutline,
  MoonOutline,
  DeleteOutline,
  InboxOutline,
  SyncOutline,
  ClockCircleOutline,
  RiseOutline,
  HeartOutline,
} from "@ant-design/icons-angular/icons";

// Your Routes
import { routes } from "./app.routes";
import { provideRouter } from "@angular/router";
import { authInterceptor } from "../features/auth/auth.interceptor";

// --- Icons Registration ---
const icons = [
  // Auth / form
  UserOutline,
  LockOutline,
  MailOutline,
  EyeOutline,
  EyeInvisibleOutline,
  // Layout
  MenuOutline,
  CloseOutline,
  RightOutline,
  // Navigation
  DashboardOutline,
  FileTextOutline,
  PlusCircleOutline,
  QuestionCircleOutline,
  PlusOutline,
  FolderOpenOutline,
  UploadOutline,
  LinkOutline,
  StarOutline,
  SearchOutline,
  FlagOutline,
  SecurityScanOutline,
  SettingOutline,
  LogoutOutline,
  // Status
  CheckCircleOutline,
  CloseCircleOutline,
  LoadingOutline,
  SunOutline,
  MoonOutline,
  DeleteOutline,
  InboxOutline,
  SyncOutline,
  ClockCircleOutline,
  RiseOutline,
  HeartOutline,
];

import { provideCharts, withDefaultRegisterables } from "ng2-charts";

const ngZorroConfig: NzConfig = {
  theme: {
    primaryColor: "#3b82f6",
    borderRadius: "8",
  },
  message: {
    nzDuration: 3000,
    nzMaxStack: 7,
  },
};

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, "./i18n/", ".json");
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),

    provideNzIcons(icons),
    provideNzConfig(ngZorroConfig),
    provideCharts(withDefaultRegisterables()),

    { provide: NZ_I18N, useValue: en_US },

    importProvidersFrom(
      NzMessageModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
        defaultLanguage: "en",
      }),
    ),
  ],
};
