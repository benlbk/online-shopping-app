'use client';

import { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { CartItem } from '../types/cart';

interface AddToCartButtonProps {
  item: Omit<CartItem, 'quantity'>;
}

export default function AddToCartButton({ item }: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      addItem({ ...item, quantity: 1 });
      // Show success message or animation here
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      // Show error message here
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={isAdding}
      className={`
        px-4 py-2 rounded-lg
        ${isAdding ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}
        text-white font-medium transition-colors
        disabled:cursor-not-allowed
      `}
    >
      {isAdding ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
