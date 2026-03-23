import { pool } from './pool';
import { redis } from '../redis/client';
import { config } from '../config';

async function seed() {
  const client = await pool.connect();
  try {
    // Run migrations first
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id         SERIAL PRIMARY KEY,
        start_time TIMESTAMPTZ NOT NULL,
        end_time   TIMESTAMPTZ NOT NULL,
        stock      INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id           SERIAL PRIMARY KEY,
        sale_id      INTEGER NOT NULL REFERENCES sales(id),
        user_id      TEXT NOT NULL,
        purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (sale_id, user_id)
      )
    `);

    // Clear existing data
    await client.query('TRUNCATE purchases, sales RESTART IDENTITY CASCADE');

    // Insert sale
    const result = await client.query(
      `INSERT INTO sales (start_time, end_time, stock) VALUES ($1, $2, $3) RETURNING id`,
      [config.saleStart, config.saleEnd, config.saleStock]
    );

    const saleId = result.rows[0].id;
    console.log(`Inserted sale id=${saleId}`);

    // Set Redis stock
    await redis.set('flash_sale:stock', config.saleStock);
    console.log(`Set Redis stock to ${config.saleStock}`);

    // Clear any user purchase keys
    const keys = await redis.keys('flash_sale:user:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cleared ${keys.length} user purchase keys`);
    }

    console.log('Seed complete');
  } finally {
    client.release();
    await pool.end();
    redis.disconnect();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
