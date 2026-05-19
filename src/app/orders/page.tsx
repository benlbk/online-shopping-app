import { Suspense } from 'react'
import OrderList from '@/components/orders/OrderList'
import OrderFilters from '@/components/orders/OrderFilters'
import { OrderListSkeleton } from '@/components/orders/OrderListSkeleton'

export default function OrdersPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      
      <OrderFilters />
      
      <Suspense fallback={<OrderListSkeleton />}>
        <OrderList />
      </Suspense>
    </main>
  )
}