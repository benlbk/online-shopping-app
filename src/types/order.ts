export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface ShippingAddress {
  name: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface Order {
  id: string
  userId: string
  status: OrderStatus
  items: OrderItem[]
  total: number
  shippingAddress: ShippingAddress
  trackingNumber?: string
  createdAt: Date
  processedAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
}