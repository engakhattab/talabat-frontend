import { TestBed } from '@angular/core/testing';
import { RestaurantSummaryDto } from '@talabat/api-customer';

import { RestaurantCardComponent } from './restaurant-card.component';

describe('RestaurantCardComponent', () => {
  it('uses an accessible fallback when the restaurant has no image', () => {
    const fixture = TestBed.createComponent(RestaurantCardComponent);
    fixture.componentRef.setInput('restaurant', restaurant);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[role="img"]')?.getAttribute('aria-label'),
    ).toContain(restaurant.name);
  });

  it('replaces a broken image with the fallback', () => {
    const fixture = TestBed.createComponent(RestaurantCardComponent);
    fixture.componentRef.setInput('restaurant', {
      ...restaurant,
      imageUrl: 'https://example.test/menu.jpg',
    });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('img') as HTMLImageElement).dispatchEvent(
      new Event('error'),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="img"]')).toBeTruthy();
  });
});

const restaurant: RestaurantSummaryDto = {
  id: 1,
  name: 'Test Restaurant',
  description: 'Test description',
  imageUrl: null,
  isActive: true,
};
