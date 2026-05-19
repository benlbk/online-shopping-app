import CartList from '../components/CartList';

export const metadata = {
  title: 'Shopping Cart',
  description: 'View and manage your shopping cart items'
};

export default function CartPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <CartList />
    </main>
  );
}
