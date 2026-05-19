import { NextResponse } from 'next/server';
import { SearchResults } from '@/hooks/useSearchProducts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    if (!query || query.length < 3) {
      return NextResponse.json(
        { error: 'Search query must be at least 3 characters' },
        { status: 400 }
      );
    }

    // TODO: Implement actual Elasticsearch query here
    // This is a mock implementation
    const mockResults: SearchResults = {
      results: [
        {
          id: '1',
          name: 'Sample Product',
          price: 99.99,
          image: '/sample.jpg',
          category: 'Electronics',
          availability: true,
        },
      ],
      total: 1,
      page: page,
      pages: 1,
    };

    return NextResponse.json(mockResults);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
