"use client";

import { useState, useEffect } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/Button';

interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export default function PaymentMethods() {
  const stripe = useStripe();
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const response = await fetch('/api/payment-methods');
        if (!response.ok) throw new Error('Failed to load payment methods');
        const data = await response.json();
        setMethods(data.paymentMethods);
      } catch (err) {
        setError('Unable to load saved payment methods');
      } finally {
        setLoading(false);
      }
    };

    loadPaymentMethods();
  }, []);

  const handleDelete = async (methodId: string) => {
    try {
      const response = await fetch(`/api/payment-methods/${methodId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete payment method');
      setMethods(methods.filter(method => method.id !== methodId));
    } catch (err) {
      setError('Failed to delete payment method');
    }
  };

  if (loading) return <div>Loading saved payment methods...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      {methods.length === 0 ? (
        <p>No saved payment methods</p>
      ) : (
        methods.map((method) => (
          <div key={method.id} className="flex items-center justify-between p-4 border rounded">
            <div>
              <p className="font-medium">{method.brand} •••• {method.last4}</p>
              <p className="text-sm text-gray-500">
                Expires {method.expMonth}/{method.expYear}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(method.id)}
            >
              Remove
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
