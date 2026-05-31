import { createClient } from 'redis';

const redisConfig = {
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: true,
    ca: process.env.REDIS_SSL_CA
  }
};

// Create a new client for each request to avoid connection management issues
export async function getRedisClient() {
  const client = createClient(redisConfig);
  
  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  await client.connect();
  return client;
}