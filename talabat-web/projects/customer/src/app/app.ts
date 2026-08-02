import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly http = inject(HttpClient);
  protected readonly apiBaseUrl = 'https://localhost:7056';
  protected readonly identityBaseUrl = 'https://localhost:7237';

  protected readonly restaurants = signal<RestaurantSummary[]>([]);
  protected readonly selectedRestaurant = signal<RestaurantSummary | null>(null);
  protected readonly menu = signal<MenuResponse | null>(null);
  protected readonly isLoadingRestaurants = signal(true);
  protected readonly isLoadingMenu = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly availableProducts = computed(
    () => this.menu()?.products.filter((product) => product.isAvailable) ?? [],
  );

  constructor() {
    this.loadRestaurants();
  }

  protected loadRestaurants(): void {
    this.isLoadingRestaurants.set(true);
    this.error.set(null);

    this.http.get<RestaurantListResponse>(`${this.apiBaseUrl}/api/catalog/restaurants`).subscribe({
      next: (response) => {
        this.restaurants.set(response.items);
        this.selectedRestaurant.set(response.items[0] ?? null);
        this.isLoadingRestaurants.set(false);

        if (response.items[0]) {
          this.loadMenu(response.items[0]);
        }
      },
      error: () => {
        this.isLoadingRestaurants.set(false);
        this.error.set('Customer API is not reachable. Start Talabat.Customer.API, then try again.');
      },
    });
  }

  protected loadMenu(restaurant: RestaurantSummary): void {
    this.selectedRestaurant.set(restaurant);
    this.isLoadingMenu.set(true);
    this.error.set(null);

    this.http
      .get<MenuResponse>(`${this.apiBaseUrl}/api/catalog/restaurants/${restaurant.id}/menu`)
      .subscribe({
        next: (response) => {
          this.menu.set(response);
          this.isLoadingMenu.set(false);
        },
        error: () => {
          this.menu.set(null);
          this.isLoadingMenu.set(false);
          this.error.set('Menu could not be loaded for this restaurant.');
        },
      });
  }

  protected money(value: MoneyDto): string {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(value.amount);
  }
}

interface RestaurantListResponse {
  items: RestaurantSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}

interface RestaurantSummary {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  isOpen: boolean;
}

interface MenuResponse {
  restaurantId: number;
  restaurantName: string;
  products: MenuProduct[];
}

interface MenuProduct {
  id: number;
  name: string;
  description: string;
  currentPrice: MoneyDto;
  isAvailable: boolean;
}

interface MoneyDto {
  amount: number;
}
