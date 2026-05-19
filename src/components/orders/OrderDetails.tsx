import { Order } from '@/types/order'

interface OrderDetailsProps {
  order: Order
}

export default function OrderDetails({ order }: OrderDetailsProps) {
  return (
    <div className="bg-white rounded-lg border p-6">
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

        <div>
          <h2 className="text-xl font-semibold mb-4">Shipping Information</h2>
          <div className="space-y-2 text-gray-600">
            <p>{order.shippingAddress.name}</p>
            <p>{order.shippingAddress.street}</p>
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.zipCode}
            </p>
            <p>{order.shippingAddress.country}</p>
          </div>
        </div>

        {order.trackingNumber && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Tracking</h2>
            <p className="text-gray-600">
              Tracking Number: {order.trackingNumber}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}