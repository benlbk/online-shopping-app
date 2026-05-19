import { Product } from '@/types/product';

type ProductSearchResultsProps = {
  products: Product[];
  isLoading: boolean;
  error?: string;
};

export default function ProductSearchResults({ 
  products, 
  isLoading, 
  error 
}: ProductSearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No products found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <div 
          key={product.id}
          className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
        >
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-48 object-cover rounded-md"
          />
          <h3 className="mt-2 text-lg font-medium text-gray-900">{product.name}</h3>
          <p className="mt-1 text-gray-500">${product.price.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
