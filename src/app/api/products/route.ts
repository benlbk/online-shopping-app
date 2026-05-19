import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  page: z.string().regex(/^\\1+$/).transform(Number).default('1'),
  categoryId: z.string().uuid().optional(),
  limit: z.string().regex(/^\\1+$/).transform(Number).default('20')
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, categoryId, limit } = querySchema.parse({
      page: searchParams.get('page'),
      categoryId: searchParams.get('categoryId'),
      limit: searchParams.get('limit')
    });

    const skip = (page - 1) * limit;

    if (skip < 0 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const where = categoryId ? {
      categories: {
        some: {
          id: categoryId
        }
      }
    } : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          categories: true,
          images: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        cacheStrategy: { ttl: 300 } // 5 minute cache
      }),
      prisma.product.count({ where })
    ]);

    if (!products.length && page > 1) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      products,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Product fetch error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input parameters', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}