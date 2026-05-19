import PaymentForm from '@/components/payment/PaymentForm';
import PaymentMethods from '@/components/payment/PaymentMethods';

export default function PaymentPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Complete Your Payment</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
          <PaymentForm />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Saved Payment Methods</h2>
          <PaymentMethods />
        </div>
      </div>
    </div>
  );
}
