export type { Category, Product } from './types';
export { categories } from './categories';
export { products } from './products';

import { products } from './products';
import { Product } from './types';

export function getProductsByCategory(categoryId: string): Product[] {
  return products.filter((p) => p.categoryId === categoryId);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.isNew === true);
}

export function getOnSaleProducts(): Product[] {
  return products.filter((p) => p.isOnSale === true);
}
