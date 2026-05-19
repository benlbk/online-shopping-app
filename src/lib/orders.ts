import { Order } from '@/types/order'
import { db } from '@/lib/db'

export async function getOrders(): Promise<Order[]> {
  try {
    const orders = await db.order.findMany({
      where: {
        userId: 'current-user-id', // Replace with actual user ID from auth
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: true,
        shippingAddress: true,
      },
    })
    return orders
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    throw new Error('Failed to fetch orders')
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  try {
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        shippingAddress: true,
      },
    })
    return order
  } catch (error) {
    console.error(`Failed to fetch order ${id}:`, error)
    throw new Error('Failed to fetch order')
  }
}

export async function updateOrderStatus(
  id: string,
  status: Order['status']
): Promise<Order> {
  try {
    const order = await db.order.update({
      where: { id },
      data: { status },
    })
    return order
  } catch (error) {
    console.error(`Failed to update order ${id}:`, error)
    throw new Error('Failed to update order')
  }
}