import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthStore } from '@talabat/core-auth';
import { ButtonComponent } from '@talabat/shared-ui';

@Component({
  selector: 'app-root',
  imports: [ButtonComponent, RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected signIn(): void {
    void this.auth.signIn(this.router.url).catch(() => undefined);
  }

  protected signOut(): void {
    void this.auth.signOut().catch(() => undefined);
  }
}
