export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  description: string;
  inStock: boolean;
  isNew?: boolean;
  isOnSale?: boolean;
  tags?: string[];
}
