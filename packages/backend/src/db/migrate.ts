import { pool } from './pool';

async function migrate() {
  const client = await pool.connect();
  try {
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

    console.log('Migration complete');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
