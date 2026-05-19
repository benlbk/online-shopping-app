import { useQuery } from '@tanstack/react-query';
import { searchProducts } from '@/lib/api';

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  availability: boolean;
}

export interface SearchResults {
  results: Product[];
  total: number;
  page: number;
  pages: number;
}

export function useSearchProducts(query: string) {
  return useQuery<SearchResults>(
    ['products', query],
    () => searchProducts(query),
    {
      enabled: query.length >= 3,
      staleTime: 1000 * 60 * 5, // 5 minutes
      keepPreviousData: true,
    }
  );
}
