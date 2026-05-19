import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // TODO: Implement actual database search
    // This is a mock implementation
    const products = await mockSearchProducts(query);

    return NextResponse.json(products);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mock function - replace with actual database query
async function mockSearchProducts(query: string) {
  const mockProducts = [
    {
      id: '1',
      name: 'Laptop Pro',
      description: 'High-performance laptop',
      price: 1299.99,
      imageUrl: '/images/laptop.jpg',
      category: 'Electronics',
      inStock: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Add more mock products...
  ];

  return mockProducts.filter(product =>
    product.name.toLowerCase().includes(query.toLowerCase())
  );
}
