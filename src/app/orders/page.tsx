import { Suspense } from 'react'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import OrderList from '@/components/orders/OrderList'
import OrderFilters from '@/components/orders/OrderFilters'
import { OrderListSkeleton } from '@/components/orders/OrderListSkeleton'
import ErrorBoundary from '@/components/common/ErrorBoundary'

export default async function OrdersPage() {
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

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      
      <OrderFilters />
      
      <ErrorBoundary fallback={<div>Error loading orders</div>}>
        <Suspense fallback={<OrderListSkeleton />}>
          <OrderList userId={session.user.id} />
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}