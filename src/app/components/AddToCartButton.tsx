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
      await addItem({ ...item, quantity: 1 }); // Fixed: Added missing await
      // Show success message using toast/notification system
      window.dispatchEvent(new CustomEvent('cart:itemAdded', { detail: item }));
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      window.dispatchEvent(new CustomEvent('cart:error', { 
        detail: { message: 'Failed to add item to cart' } 
      }));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={isAdding}
      aria-busy={isAdding}
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
