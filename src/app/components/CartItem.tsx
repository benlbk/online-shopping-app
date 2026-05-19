'use client';

import { CartItem as CartItemType } from '../types/cart';
import { useCart } from '../hooks/useCart';

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex items-center gap-4 p-4 border-b">
      {item.image && (
        <img 
          src={item.image} 
          alt={item.name}
          className="w-16 h-16 object-cover rounded"
        />
      )}
      <div className="flex-1">
        <h3 className="font-medium">{item.name}</h3>
        <p className="text-gray-600">${item.price.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
          className="p-1 rounded-full hover:bg-gray-100"
          aria-label="Decrease quantity"
        >
          -
        </button>
        <span className="w-8 text-center">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.id, item.quantity + 1)}
          className="p-1 rounded-full hover:bg-gray-100"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <button
        onClick={() => removeItem(item.id)}
        className="p-2 text-red-500 hover:text-red-700"
        aria-label="Remove item"
      >
        Remove
      </button>
    </div>
  );
}
