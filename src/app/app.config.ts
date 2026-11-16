import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FaConfig } from '@fortawesome/angular-fontawesome';

import { routes } from './app.routes';
import { apiErrorInterceptor, apiRequestInterceptor } from './core/api/api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideClientHydration(),
    provideHttpClient(withInterceptors([apiRequestInterceptor, apiErrorInterceptor])),
    { provide: FaConfig, useValue: { autoAddCss: false } },
  ],
};
