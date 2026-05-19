import { Suspense } from 'react';
import ProductGrid from '@/components/ProductGrid';
import CategoryFilter from '@/components/CategoryFilter';
import { getCategories } from '@/lib/categories';

export const revalidate = 3600; // Revalidate every hour

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; categoryId?: string }
}) {
  const categories = await getCategories();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Products</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="md:col-span-1">
          <CategoryFilter categories={categories} />
        </aside>
        
        <main className="md:col-span-3">
          <Suspense fallback={<div>Loading products...</div>}>
            <ProductGrid
              page={parseInt(searchParams.page || '1')}
              categoryId={searchParams.categoryId}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
