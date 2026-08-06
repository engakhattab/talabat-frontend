import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { CartEntryBarComponent } from './cart-entry-bar.component';

@Component({
  selector: 'tal-customer-shell',
  imports: [CartEntryBarComponent, HeaderComponent, RouterOutlet],
  template: `
    <div class="flex min-h-dvh flex-col">
      <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:rounded focus:bg-food-primary focus:px-3 focus:py-2 focus:text-white">
        Skip to main content
      </a>
      <tal-header />
      <main id="main-content" class="mx-auto w-full max-w-6xl flex-1 px-3 py-6 pb-16 sm:px-6 sm:py-9 lg:px-9">
        <router-outlet />
      </main>
      <tal-cart-entry-bar />
    </div>
  `,
})
export class CustomerShellComponent {}
