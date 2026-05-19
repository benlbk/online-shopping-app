import { SearchResults } from '@/hooks/useSearchProducts';

export async function searchProducts(query: string): Promise<SearchResults> {
  try {
    const response = await fetch(
      `/api/v1/search?q=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      throw new Error('Search request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}
