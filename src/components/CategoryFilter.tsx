'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Category } from '@/types';

interface CategoryFilterProps {
  categories: Category[];
}

export default function CategoryFilter({ categories }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategoryId = searchParams.get('categoryId');

  const handleCategoryChange = (categoryId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId) {
      params.set('categoryId', categoryId);
    } else {
      params.delete('categoryId');
    }
    params.set('page', '1');
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">Categories</h2>
      <div className="space-y-2">
        <button
          onClick={() => handleCategoryChange(null)}
          className={`w-full text-left px-3 py-2 rounded ${!currentCategoryId ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
        >
          All Products
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`w-full text-left px-3 py-2 rounded ${currentCategoryId === category.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
