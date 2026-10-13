import { bootstrapApplication } from '@angular/platform-browser';

import { renderBootstrapFailure } from './bootstrap-failure';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch(() => {
  renderBootstrapFailure();
});
