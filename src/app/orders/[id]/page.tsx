import { notFound } from 'next/navigation'
import { getOrderById } from '@/lib/orders'
import OrderDetails from '@/components/orders/OrderDetails'
import OrderTimeline from '@/components/orders/OrderTimeline'

interface OrderPageProps {
  params: {
    id: string
  }
}

export default async function OrderPage({ params }: OrderPageProps) {
  const order = await getOrderById(params.id)

  if (!order) {
    notFound()
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Order Details</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <OrderDetails order={order} />
        </div>
        <div>
          <OrderTimeline order={order} />
        </div>
      </div>
    </main>
  )
}