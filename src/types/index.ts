export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  categories: Category[];
  specifications: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
  description: string;
  children?: Category[];
  createdAt: string;
}
