import { AppError } from '../services/saleService';

// Mock dependencies before importing the service
jest.mock('../db/pool', () => ({
  pool: { query: jest.fn() },
}));
jest.mock('../redis/client', () => ({
  redis: { get: jest.fn() },
}));
jest.mock('../redis/atomicPurchase', () => ({
  atomicPurchase: jest.fn(),
}));

import { pool } from '../db/pool';
import { redis } from '../redis/client';
import { atomicPurchase } from '../redis/atomicPurchase';
import { getSaleStatus, attemptPurchase, getUserPurchase } from '../services/saleService';

const mockQuery = pool.query as jest.Mock;
const mockRedisGet = redis.get as jest.Mock;
const mockAtomicPurchase = atomicPurchase as jest.MockedFunction<typeof atomicPurchase>;

const pastSale = {
  id: 1,
  start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  end_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  stock: 100,
};

const activeSale = {
  id: 1,
  start_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  end_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
  stock: 100,
};

const upcomingSale = {
  id: 1,
  start_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
  end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  stock: 100,
};

describe('getSaleStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 404 when no sale exists', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await expect(getSaleStatus()).rejects.toThrow(AppError);
    await expect(getSaleStatus()).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns active status during sale window', async () => {
    mockQuery.mockResolvedValue({ rows: [activeSale] });
    mockRedisGet.mockResolvedValue('50');
    const result = await getSaleStatus();
    expect(result.status).toBe('active');
    expect(result.stockRemaining).toBe(50);
  });

  it('returns upcoming status before sale starts', async () => {
    mockQuery.mockResolvedValue({ rows: [upcomingSale] });
    mockRedisGet.mockResolvedValue('100');
    const result = await getSaleStatus();
    expect(result.status).toBe('upcoming');
  });

  it('returns ended status after sale ends', async () => {
    mockQuery.mockResolvedValue({ rows: [pastSale] });
    mockRedisGet.mockResolvedValue('0');
    const result = await getSaleStatus();
    expect(result.status).toBe('ended');
  });

  it('clamps negative stock to 0', async () => {
    mockQuery.mockResolvedValue({ rows: [activeSale] });
    mockRedisGet.mockResolvedValue('-5');
    const result = await getSaleStatus();
    expect(result.stockRemaining).toBe(0);
  });
});

describe('attemptPurchase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 400 if userId is empty', async () => {
    await expect(attemptPurchase('')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 if no sale found', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await expect(attemptPurchase('alice')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 if sale not started', async () => {
    mockQuery.mockResolvedValue({ rows: [upcomingSale] });
    await expect(attemptPurchase('alice')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 if sale ended', async () => {
    mockQuery.mockResolvedValue({ rows: [pastSale] });
    await expect(attemptPurchase('alice')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns already_purchased result', async () => {
    mockQuery.mockResolvedValue({ rows: [activeSale] });
    mockAtomicPurchase.mockResolvedValueOnce('already_purchased');
    const result = await attemptPurchase('alice');
    expect(result.success).toBe(false);
    expect(result.alreadyPurchased).toBe(true);
  });

  it('returns out_of_stock result', async () => {
    mockQuery.mockResolvedValue({ rows: [activeSale] });
    mockAtomicPurchase.mockResolvedValueOnce('out_of_stock');
    const result = await attemptPurchase('alice');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/out of stock/i);
  });

  it('returns success and inserts purchase', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [activeSale] })
      .mockResolvedValueOnce({ rows: [] });
    mockAtomicPurchase.mockResolvedValueOnce('success');
    const result = await attemptPurchase('alice');
    expect(result.success).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('handles duplicate key (23505) gracefully on success', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [activeSale] })
      .mockRejectedValueOnce({ code: '23505' });
    mockAtomicPurchase.mockResolvedValueOnce('success');
    const result = await attemptPurchase('alice');
    expect(result.success).toBe(true);
  });
});

describe('getUserPurchase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 404 if no sale found', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await expect(getUserPurchase('alice')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns null if no purchase', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [activeSale] })
      .mockResolvedValueOnce({ rows: [] });
    const result = await getUserPurchase('alice');
    expect(result).toBeNull();
  });

  it('returns purchase record', async () => {
    const purchase = { id: 1, sale_id: 1, user_id: 'alice' };
    mockQuery
      .mockResolvedValueOnce({ rows: [activeSale] })
      .mockResolvedValueOnce({ rows: [purchase] });
    const result = await getUserPurchase('alice');
    expect(result).toEqual(purchase);
  });
});
