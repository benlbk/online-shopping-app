import { Order } from '@/types/order'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

interface OrderTimelineProps {
  order: Order
}

export default function OrderTimeline({ order }: OrderTimelineProps) {
  const timeline = [
    {
      status: 'PENDING',
      label: 'Order Placed',
      date: order.createdAt,
    },
    {
      status: 'PROCESSING',
      label: 'Processing',
      date: order.processedAt,
    },
    {
      status: 'SHIPPED',
      label: 'Shipped',
      date: order.shippedAt,
    },
    {
      status: 'DELIVERED',
      label: 'Delivered',
      date: order.deliveredAt,
    },
  ]

  const currentStep = timeline.findIndex((step) => step.status === order.status)

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-6">Order Status</h2>
      <div className="space-y-4">
        {timeline.map((step, index) => (
          <div key={step.status} className="flex items-start">
            <div className="flex-shrink-0">
              <CheckCircleIcon
                className={`w-6 h-6 ${index <= currentStep ? 'text-blue-500' : 'text-gray-300'}`}
              />
            </div>
            <div className="ml-4">
              <p className={`font-medium ${index <= currentStep ? 'text-gray-900' : 'text-gray-500'}`}>
                {step.label}
              </p>
              {step.date && (
                <p className="text-sm text-gray-500">
                  {step.date.toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}