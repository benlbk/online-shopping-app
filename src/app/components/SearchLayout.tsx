'use client';

import { useProductSearch } from '@/hooks/useProductSearch';
import SearchBar from './SearchBar';
import ProductSearchResults from './ProductSearchResults';

export default function SearchLayout() {
  const { products, isLoading, error, searchProducts } = useProductSearch();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SearchBar 
        onSearch={searchProducts}
        className="mb-8"
      />
      <ProductSearchResults 
        products={products}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
