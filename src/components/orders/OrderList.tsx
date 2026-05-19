import { getOrders } from '@/lib/orders'
import { OrderStatus } from '@/types/order'
import Link from 'next/link'

export default async function OrderList() {
  const orders = await getOrders()

  if (!orders.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No orders found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/orders/${order.id}`}
          className="block p-6 rounded-lg border hover:border-blue-500 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">Order #{order.id}</p>
              <p className="text-sm text-gray-500">{order.createdAt.toLocaleDateString()}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              getStatusColor(order.status)
            }`}>
              {order.status}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {order.items.length} items · ${order.total.toFixed(2)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}

function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800'
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800'
    case 'SHIPPED':
      return 'bg-purple-100 text-purple-800'
    case 'DELIVERED':
      return 'bg-green-100 text-green-800'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}