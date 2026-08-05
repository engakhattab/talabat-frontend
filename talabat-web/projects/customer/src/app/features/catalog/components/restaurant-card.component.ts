import { Component, computed, input, signal } from '@angular/core';
import { RestaurantSummaryDto } from '@talabat/api-customer';
import { CardComponent, StatusChipComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-restaurant-card',
  imports: [CardComponent, StatusChipComponent],
  template: `
    <tal-card elevated>
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
  `,
})
export class RestaurantCardComponent {
  readonly restaurant = input.required<RestaurantSummaryDto>();

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
