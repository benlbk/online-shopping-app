import { Suspense } from 'react';
import SearchBar from '../components/SearchBar';
import ProductGrid from '../components/ProductGrid';
import { searchProducts } from '@/lib/products';

export const dynamic = 'force-dynamic';

type SearchPageProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = typeof searchParams.q === 'string' ? searchParams.q : '';
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'relevance';
  
  const products = await searchProducts(query, sort);

  return (
    <main className="container mx-auto px-4 py-8">
      <SearchBar className="mb-8" />
      
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {query ? `Search results for "${query}"` : 'All Products'}
        </h1>
        
        <select
          className="border rounded-lg px-3 py-2"
          defaultValue={sort}
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search);
            params.set('sort', e.target.value);
            window.location.search = params.toString();
          }}
        >
          <option value="relevance">Most Relevant</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name: A to Z</option>
        </select>
      </div>

      <Suspense fallback={<ProductGrid products={[]} loading={true} />}>
        <ProductGrid products={products} />
      </Suspense>
    </main>
  );
}
