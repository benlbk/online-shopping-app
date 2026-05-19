'use client';

import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import Pagination from './Pagination';
import { Product } from '@/types';

interface ProductGridProps {
  page: number;
  categoryId?: string;
}

interface ProductResponse {
  products: Product[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

export default function ProductGrid({ page, categoryId }: ProductGridProps) {
  const [data, setData] = useState<ProductResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          ...(categoryId && { categoryId })
        });
        const response = await fetch(`/api/products?${params}`);
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [page, categoryId]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {data.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      <Pagination
        currentPage={data.pagination.page}
        totalPages={data.pagination.totalPages}
      />
    </div>
  );
}
