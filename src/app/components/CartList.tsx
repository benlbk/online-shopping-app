'use client';

import { memo } from 'react';
import { useCart } from '../hooks/useCart';
import CartItem from './CartItem';

const CartList = memo(function CartList() {
  const { items, loading, calculateTotal } = useCart();
  const { subtotal, tax, total } = calculateTotal();

  if (loading) {
    return <div className="p-4">Loading cart...</div>;
  }

  if (items.length === 0) {
    return <div className="p-4">Your cart is empty</div>;
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow">
      <div className="divide-y">
        {items.map(item => (
          <CartItem key={item.id} item={item} />
        ))}
      </div>
      
      <div className="p-4 border-t">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CartList;
