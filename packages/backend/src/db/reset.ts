import { pool } from './pool';
import { redis } from '../redis/client';
import { config } from '../config';

async function reset() {
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE purchases RESTART IDENTITY CASCADE');
    console.log('Truncated purchases table');

    await redis.set('flash_sale:stock', config.saleStock);
    console.log(`Reset Redis stock to ${config.saleStock}`);

    const keys = await redis.keys('flash_sale:user:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cleared ${keys.length} user purchase keys`);
    }

    console.log('Reset complete');
  } finally {
    client.release();
    await pool.end();
    redis.disconnect();
  }
}

reset().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
