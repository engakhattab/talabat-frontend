import { Component, computed, input } from '@angular/core';

export type StatusChipTone = 'error' | 'info' | 'neutral' | 'success' | 'warning';

@Component({
  selector: 'tal-status-chip',
  template: `<span [class]="chipClass()">{{ label() }}</span>`,
})
export class StatusChipComponent {
  readonly label = input.required<string>();
  readonly tone = input<StatusChipTone>('neutral');

  protected readonly chipClass = computed(() => `tal-status-chip tal-status-chip--${this.tone()}`);
}
