import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        children: true,
        parent: true
      },
      orderBy: {
        name: 'asc'
      },
      cacheStrategy: { ttl: 86400 } // 24 hour cache
    });

    if (!categories.length) {
      return NextResponse.json(
        { error: 'No categories found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      categories,
      total: categories.length
    });

  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch categories',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}