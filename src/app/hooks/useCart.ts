import { useState, useEffect } from 'react';
import { CartItem } from '../types/cart';

const STORAGE_KEY = 'shopping-cart';
const TAX_RATES: Record<string, number> = {
  'US': 0.0725,
  'CA': 0.13,
  'UK': 0.20
};

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load cart data on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const savedCart = localStorage.getItem(STORAGE_KEY);
        if (savedCart) {
          setItems(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCart();
  }, []);

  // Save cart changes to storage with debounce
  useEffect(() => {
    if (!loading) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [items, loading]);

  const addItem = async (item: CartItem): Promise<void> => {
    const response = await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    
    if (!response.ok) {
      throw new Error('Failed to add item to cart');
    }

    setItems(current => {
      const existingItem = current.find(i => i.id === item.id);
      if (existingItem) {
        return current.map(i => 
          i.id === item.id 
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...current, item];
    });
  };

  const updateQuantity = async (itemId: string, quantity: number): Promise<void> => {
    if (quantity < 0) return;

    const response = await fetch(`/api/cart/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity })
    });

    if (!response.ok) {
      throw new Error('Failed to update item quantity');
    }

    setItems(current =>
      current.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = async (itemId: string): Promise<void> => {
    const response = await fetch(`/api/cart/items/${itemId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to remove item from cart');
    }

    setItems(current => current.filter(item => item.id !== itemId));
  };

  const calculateTotal = (countryCode: string = 'US'): {
    subtotal: number;
    tax: number;
    total: number;
  } => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxRate = TAX_RATES[countryCode] ?? TAX_RATES['US'];
    const tax = subtotal * taxRate;
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  };

  return {
    items,
    loading,
    addItem,
    updateQuantity,
    removeItem,
    calculateTotal
  };
}
