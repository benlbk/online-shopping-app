import { Order } from '@/types/order'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

interface OrderDetailsProps {
  order: Order
}

export default function OrderDetails({ order }: OrderDetailsProps) {
  const { data: session } = useSession()
  const [error, setError] = useState('')

  // Add authorization check
  if (!session || order.userId !== session.user.id) {
    return <div>Not authorized to view this order</div>
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.name} × {item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-4">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}