export type { Category, Product } from './types';
export { categories } from './categories';
export { products } from './products';

import { products } from './products';
import { categories } from './categories';
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

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return products.filter((p) => {
    const cat = categoryById.get(p.categoryId);
    const searchable = [
      p.name,
      p.brand,
      p.description,
      ...(p.tags ?? []),
      cat?.name ?? '',
      cat?.slug ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return searchable.includes(q);
  });
}
