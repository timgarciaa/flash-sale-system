import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/flashsale',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  saleStart: process.env.SALE_START || '2026-01-01T00:00:00Z',
  saleEnd: process.env.SALE_END || '2026-12-31T23:59:59Z',
  saleStock: parseInt(process.env.SALE_STOCK || '100', 10),
};
