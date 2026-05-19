import { cache } from 'react';
import { prisma } from './prisma';

export const getCategories = cache(async () => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        children: true
      }
    });
    return categories;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
});
