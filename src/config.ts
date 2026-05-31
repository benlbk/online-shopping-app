import { z } from 'zod';

const configSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number(),
    user: z.string(),
    password: z.string(),
    name: z.string(),
    ssl: z.boolean().default(false)
  }),
  security: z.object({
    rateLimitRequests: z.number().default(10),
    rateLimitWindow: z.number().default(60)
  })
});

type Config = z.infer<typeof configSchema>;

const rawConfig = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'postgres',
    ssl: process.env.DB_SSL === 'true'
  },
  security: {
    rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '10', 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60', 10)
  }
};

export const config = configSchema.parse(rawConfig);
