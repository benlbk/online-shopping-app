import Redis from 'ioredis';

export class RedisClient {
  private static instance: Redis | null = null;
  private static connectionPromise: Promise<Redis> | null = null;

  private async getConnection(): Promise<Redis> {
    if (RedisClient.instance) {
      return RedisClient.instance;
    }

    if (!RedisClient.connectionPromise) {
      RedisClient.connectionPromise = new Promise((resolve, reject) => {
        const client = new Redis({
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          tls: process.env.REDIS_TLS === 'true',
          maxRetriesPerRequest: 3,
          connectTimeout: 2000,
          enableReadyCheck: true
        });

        client.on('connect', () => {
          RedisClient.instance = client;
          resolve(client);
        });

        client.on('error', (error) => {
          console.error('Redis connection error:', error);
          reject(error);
        });
      });
    }

    return RedisClient.connectionPromise;
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getConnection();
    return client.get(key);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    const client = await this.getConnection();
    return client.setex(key, seconds, value);
  }

  async incr(key: string): Promise<number> {
    const client = await this.getConnection();
    return client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    const client = await this.getConnection();
    return client.expire(key, seconds);
  }

  async ping(): Promise<string> {
    const client = await this.getConnection();
    return client.ping();
  }
}
