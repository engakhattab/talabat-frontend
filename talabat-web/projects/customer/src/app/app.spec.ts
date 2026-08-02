import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('https://localhost:7056/api/catalog/restaurants').flush({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
    });

    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render restaurants returned by the customer API', async () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('https://localhost:7056/api/catalog/restaurants').flush({
      items: [
        {
          id: 1,
          name: 'Pizza Palace',
          description: 'Fresh pizza and sides',
          imageUrl: null,
          isOpen: true,
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    });
    http.expectOne('https://localhost:7056/api/catalog/restaurants/1/menu').flush({
      restaurantId: 1,
      restaurantName: 'Pizza Palace',
      products: [
        {
          id: 10,
          name: 'Margherita',
          description: 'Tomato, mozzarella, basil',
          currentPrice: { amount: 120 },
          isAvailable: true,
        },
      ],
    });

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Pizza Palace');
    expect(compiled.textContent).toContain('Margherita');
  });
});
