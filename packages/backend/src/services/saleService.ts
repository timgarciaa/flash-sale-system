import { pool } from '../db/pool';
import { redis } from '../redis/client';
import { atomicPurchase } from '../redis/atomicPurchase';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

type SaleStatus = 'upcoming' | 'active' | 'ended';

interface SaleStatusResult {
  status: SaleStatus;
  stockRemaining: number;
  startTime: Date;
  endTime: Date;
}

interface PurchaseResult {
  success: boolean;
  message: string;
  alreadyPurchased?: boolean;
}

async function getCurrentSale() {
  const result = await pool.query(
    'SELECT * FROM sales ORDER BY created_at DESC LIMIT 1',
  );
  return result.rows[0] || null;
}

export async function getSaleStatus(): Promise<SaleStatusResult> {
  const sale = await getCurrentSale();
  if (!sale) {
    throw new AppError(404, 'No sale found');
  }

  const now = new Date();
  const startTime = new Date(sale.start_time);
  const endTime = new Date(sale.end_time);

  let status: SaleStatus;
  if (now < startTime) {
    status = 'upcoming';
  } else if (now > endTime) {
    status = 'ended';
  } else {
    status = 'active';
  }

  const stockStr = await redis.get('flash_sale:stock');
  const stockRemaining = Math.max(0, parseInt(stockStr || '0', 10));

  return { status, stockRemaining, startTime, endTime };
}

export async function attemptPurchase(userId: string): Promise<PurchaseResult> {
  if (!userId || !userId.trim()) {
    throw new AppError(400, 'userId is required');
  }

  const sale = await getCurrentSale();
  if (!sale) {
    throw new AppError(404, 'No sale found');
  }

  const now = new Date();
  const startTime = new Date(sale.start_time);
  const endTime = new Date(sale.end_time);

  if (now < startTime) {
    throw new AppError(400, 'Sale has not started yet');
  }
  if (now > endTime) {
    throw new AppError(400, 'Sale has ended');
  }

  const result = await atomicPurchase(userId);

  if (result === 'already_purchased') {
    console.log(`[purchase] duplicate  userId=${userId}`);
    return {
      success: false,
      message: 'You have already purchased this item',
      alreadyPurchased: true,
    };
  }

  if (result === 'out_of_stock') {
    console.log(`[purchase] out_of_stock userId=${userId}`);
    return { success: false, message: 'Sorry, this item is out of stock' };
  }

  // result === 'success' — persist to DB
  try {
    await pool.query(
      'INSERT INTO purchases (sale_id, user_id) VALUES ($1, $2)',
      [sale.id, userId],
    );
  } catch (err: any) {
    // 23505 = unique_violation — already in DB, treat as success
    if (err.code !== '23505') {
      throw err;
    }
  }

  console.log(`[purchase] success    userId=${userId}`);
  return { success: true, message: 'Purchase successful!' };
}

export async function getUserPurchase(userId: string) {
  const sale = await getCurrentSale();
  if (!sale) {
    throw new AppError(404, 'No sale found');
  }

  const result = await pool.query(
    'SELECT * FROM purchases WHERE sale_id = $1 AND user_id = $2',
    [sale.id, userId],
  );

  return result.rows[0] || null;
}
