import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withNavigationErrorHandler } from '@angular/router';
import { recoverAdminNavigation } from './core/guards/stale-admin-navigation';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withNavigationErrorHandler(event => recoverAdminNavigation(event.error, event.url))),
    provideHttpClient()
  ]
};
