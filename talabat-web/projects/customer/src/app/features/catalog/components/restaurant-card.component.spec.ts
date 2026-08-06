import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RestaurantSummaryDto } from '@talabat/api-customer';

import { RestaurantCardComponent } from './restaurant-card.component';

describe('RestaurantCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

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

  it('renders a keyboard-accessible anchor with absolute routerLink to /restaurants/:id', () => {
    const fixture = TestBed.createComponent(RestaurantCardComponent);
    fixture.componentRef.setInput('restaurant', restaurant);
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('/restaurants/1');
  });

  it('emits select output with restaurant ID when clicked', () => {
    const fixture = TestBed.createComponent(RestaurantCardComponent);
    fixture.componentRef.setInput('restaurant', restaurant);
    fixture.detectChanges();

    const selectSpy = vi.fn();
    fixture.componentInstance.select.subscribe(selectSpy);

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    anchor.click();

    expect(selectSpy).toHaveBeenCalledWith(1);
  });
});

const restaurant: RestaurantSummaryDto = {
  id: 1,
  name: 'Test Restaurant',
  description: 'Test description',
  imageUrl: null,
  isActive: true,
};
