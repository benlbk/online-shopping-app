import { renderHook, act } from '@testing-library/react';
import { useCart } from '../hooks/useCart';

describe('useCart', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockItem = {
    id: '1',
    name: 'Test Item',
    price: 10.00,
    quantity: 1
  };

  test('should add item to cart', async () => {
    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.addItem(mockItem);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toEqual(mockItem);
  });

  test('should update item quantity', async () => {
    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.addItem(mockItem);
      await result.current.updateQuantity('1', 2);
    });

    expect(result.current.items[0].quantity).toBe(2);
  });

  test('should remove item from cart', async () => {
    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.addItem(mockItem);
      await result.current.removeItem('1');
    });

    expect(result.current.items).toHaveLength(0);
  });

  test('should calculate totals correctly', async () => {
    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.addItem(mockItem);
    });

    const { subtotal, tax, total } = result.current.calculateTotal('US');
    expect(subtotal).toBe(10.00);
    expect(tax).toBe(0.725);
    expect(total).toBe(10.725);
  });

  test('should persist cart data', async () => {
    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.addItem(mockItem);
    });

    const savedCart = JSON.parse(localStorage.getItem('shopping-cart') || '[]');
    expect(savedCart).toHaveLength(1);
    expect(savedCart[0]).toEqual(mockItem);
  });
});
