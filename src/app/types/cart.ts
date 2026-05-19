export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface CartAction {
  type: 'ADD_ITEM' | 'UPDATE_QUANTITY' | 'REMOVE_ITEM' | 'CLEAR_CART';
  payload?: any;
}