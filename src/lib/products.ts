import { Product } from '@/types/product';

export async function searchProducts(query: string, sort: string = 'relevance'): Promise<Product[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      sort: sort
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/products/search?${params.toString()}`,
      {
        next: { revalidate: 60 }, // Cache for 1 minute
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const data = await response.json();
    return data.products;
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}
