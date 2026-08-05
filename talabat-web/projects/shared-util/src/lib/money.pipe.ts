import { Pipe, PipeTransform } from '@angular/core';

export interface MonetaryValue {
  readonly amount: number;
  readonly currency?: string | null;
}

@Pipe({ name: 'talMoney' })
export class MoneyPipe implements PipeTransform {
  transform(value: MonetaryValue | null | undefined, locale = 'en-US'): string {
    if (!value || !Number.isFinite(value.amount)) return '—';

    if (!value.currency) {
      return new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      }).format(value.amount);
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: value.currency,
        maximumFractionDigits: 2,
      }).format(value.amount);
    } catch {
      return new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      }).format(value.amount);
    }
  }
}
