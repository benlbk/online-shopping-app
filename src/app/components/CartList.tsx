'use client';

import { useCart } from '../hooks/useCart';
import CartItem from './CartItem';
import CartSummary from './CartSummary';

export default function CartList() {
  const { cart, clearCart } = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
        <button
          onClick={clearCart}
          className="text-red-500 hover:text-red-700"
        >
          Clear Cart
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {cart.items.map(item => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>
        <div className="md:col-span-1">
          <CartSummary />
        </div>
      </div>
    </div>
  );
}
