import { ApplicationConfig, importProvidersFrom } from "@angular/core";
import {
  provideHttpClient,
  HttpClient,
  withInterceptors,
} from "@angular/common/http"; // ✅ thêm withInterceptors
import { provideAnimations } from "@angular/platform-browser/animations";
import { TranslateModule, TranslateLoader } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";

// NG-ZORRO Imports
import { NZ_I18N, en_US } from "ng-zorro-antd/i18n";
import { NzMessageModule } from "ng-zorro-antd/message";
import { provideNzConfig, NzConfig } from "ng-zorro-antd/core/config";
import { provideNzIcons } from "ng-zorro-antd/icon";
import { UserOutline, LockOutline } from "@ant-design/icons-angular/icons";

// Your Routes
import { routes } from "./app.routes";
import { provideRouter } from "@angular/router";
import { authInterceptor } from "./features/auth/auth.interceptor";

// --- YOUR OLD STUFF RESTORED ---
const icons = [UserOutline, LockOutline];

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
  // In v19/v16, we don't need the "as any" hack anymore
  return new TranslateHttpLoader(http, "./assets/i18n/", ".json");
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor]), // ✅ đăng ký interceptor
    ),
    provideAnimations(),

    // Modern way to provide your Zorro config and Icons
    provideNzIcons(icons),
    provideNzConfig(ngZorroConfig),

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
