import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RestaurantSummaryDto } from '@talabat/api-customer';
import { CardComponent, StatusChipComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-restaurant-card',
  imports: [CardComponent, RouterLink, StatusChipComponent],
  template: `
    <a
      [routerLink]="['/restaurants', restaurant().id]"
      class="block text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2 rounded-food-md"
      (click)="select.emit(restaurant().id)"
    >
      <tal-card elevated class="h-full transition-shadow hover:shadow-food-md">
        <div card-media class="relative aspect-video overflow-hidden bg-food-subtle">
          @if (hasUsableImage()) {
            <img
              [alt]="restaurant().name + ' restaurant'"
              [src]="restaurant().imageUrl"
              class="h-full w-full object-cover"
              (error)="onImageError()"
            />
          } @else {
            <div
              [attr.aria-label]="restaurant().name + ' image unavailable'"
              class="flex h-full w-full items-center justify-center bg-food-tint text-food-muted"
              role="img"
            >
              <svg aria-hidden="true" class="h-12 w-12" fill="none" viewBox="0 0 24 24">
                <path
                  d="m4 16 4-5 3 3 3-4 6 6M5 20h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1Z"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                />
              </svg>
            </div>
          }
        </div>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="font-display text-lg leading-6 font-semibold text-food-ink">
              {{ restaurant().name }}
            </h2>
            <p class="mt-1 text-sm leading-5 text-food-muted">{{ restaurant().description }}</p>
          </div>
          <tal-status-chip [label]="availabilityLabel()" [tone]="availabilityTone()" />
        </div>
      </tal-card>
    </a>
  `,
})
export class RestaurantCardComponent {
  readonly restaurant = input.required<RestaurantSummaryDto>();
  readonly select = output<number>();

  private readonly imageFailed = signal(false);

  protected readonly hasUsableImage = computed(
    () => this.restaurant().imageUrl !== null && !this.imageFailed(),
  );
  protected readonly availabilityLabel = computed(() =>
    this.restaurant().isActive ? 'Available' : 'Unavailable',
  );
  protected readonly availabilityTone = computed(() =>
    this.restaurant().isActive ? 'success' : 'neutral',
  );

  protected onImageError(): void {
    this.imageFailed.set(true);
  }
}
