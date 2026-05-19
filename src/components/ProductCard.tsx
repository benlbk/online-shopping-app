import Image from 'next/image';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative h-48">
        <Image
          src={product.images[0] || '/placeholder.png'}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
          {product.description}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold">
            ${product.price.toFixed(2)}
          </span>
          <div className="space-x-1">
            {product.categories.map((category) => (
              <span
                key={category.id}
                className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
              >
                {category.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
