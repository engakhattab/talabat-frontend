import { Component, booleanAttribute, computed, input } from '@angular/core';

@Component({
  selector: 'tal-card',
  template: `
    <div [class]="cardClass()">
      <ng-content select="[card-media]" />
      <div class="tal-card__content"><ng-content /></div>
      <ng-content select="[card-footer]" />
    </div>
  `,
})
export class CardComponent {
  readonly elevated = input(false, { transform: booleanAttribute });

  protected readonly cardClass = computed(
    () => `tal-card${this.elevated() ? ' tal-card--elevated' : ''}`,
  );
}
