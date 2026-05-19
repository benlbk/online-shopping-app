'use client';

import { useState, useEffect } from 'react';
import { Cart, CartItem } from '../types/cart';

const CART_STORAGE_KEY = 'shopping-cart';
const TAX_RATE = 0.1; // 10% tax rate

export function useCart() {
  const [cart, setCart] = useState<Cart>(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      return savedCart ? JSON.parse(savedCart) : { items: [], subtotal: 0, tax: 0, total: 0 };
    }
    return { items: [], subtotal: 0, tax: 0, total: 0 };
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const calculateTotals = (items: CartItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const addItem = (newItem: CartItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.items.find(item => item.id === newItem.id);
      let updatedItems;

      if (existingItem) {
        updatedItems = prevCart.items.map(item =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      } else {
        updatedItems = [...prevCart.items, newItem];
      }

      return {
        ...prevCart,
        items: updatedItems,
        ...calculateTotals(updatedItems)
      };
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 0) return;
    
    setCart(prevCart => {
      const updatedItems = prevCart.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );

      return {
        ...prevCart,
        items: updatedItems,
        ...calculateTotals(updatedItems)
      };
    });
  };

  const removeItem = (itemId: string) => {
    setCart(prevCart => {
      const updatedItems = prevCart.items.filter(item => item.id !== itemId);
      return {
        ...prevCart,
        items: updatedItems,
        ...calculateTotals(updatedItems)
      };
    });
  };

  const clearCart = () => {
    setCart({ items: [], subtotal: 0, tax: 0, total: 0 });
  };

  return {
    cart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart
  };
}
