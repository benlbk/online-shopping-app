import { notFound } from 'next/navigation'
import { getOrderById } from '@/lib/orders'
import OrderDetails from '@/components/orders/OrderDetails'
import OrderTimeline from '@/components/orders/OrderTimeline'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

interface OrderPageProps {
  params: {
    id: string
  }
}

export default async function OrderPage({ params }: OrderPageProps) {
  // Add authentication check
  const session = await getServerSession(authOptions)
  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    }
  }

  try {
    const order = await getOrderById(params.id)

    // Add authorization check - verify order belongs to user
    if (!order || order.userId !== session.user.id) {
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
  } catch (error) {
    // Add error handling
    console.error('Error fetching order:', error)
    throw new Error('Failed to load order details')
  }
}