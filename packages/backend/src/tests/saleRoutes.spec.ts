import request from 'supertest';

// Keep AppError real so errorHandler's instanceof check works
jest.mock('../services/saleService', () => ({
  ...jest.requireActual('../services/saleService'),
  getSaleStatus: jest.fn(),
  attemptPurchase: jest.fn(),
  getUserPurchase: jest.fn(),
}));

import { createApp } from '../app';
import * as saleService from '../services/saleService';

const mockGetSaleStatus = saleService.getSaleStatus as jest.MockedFunction<typeof saleService.getSaleStatus>;
const mockAttemptPurchase = saleService.attemptPurchase as jest.MockedFunction<typeof saleService.attemptPurchase>;
const mockGetUserPurchase = saleService.getUserPurchase as jest.MockedFunction<typeof saleService.getUserPurchase>;

const app = createApp();

const activeSaleStatus = {
  status: 'active' as const,
  stockRemaining: 50,
  startTime: new Date('2026-01-01T00:00:00Z'),
  endTime: new Date('2026-12-31T23:59:59Z'),
};

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/sale/status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns sale status', async () => {
    mockGetSaleStatus.mockResolvedValueOnce(activeSaleStatus);
    const res = await request(app).get('/api/sale/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.stockRemaining).toBe(50);
  });

  it('returns 404 when no sale', async () => {
    mockGetSaleStatus.mockRejectedValueOnce(new saleService.AppError(404, 'No sale found'));
    const res = await request(app).get('/api/sale/status');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No sale found');
  });
});

describe('POST /api/sale/purchase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns success on valid purchase', async () => {
    mockAttemptPurchase.mockResolvedValueOnce({ success: true, message: 'Purchase successful!' });
    const res = await request(app)
      .post('/api/sale/purchase')
      .send({ userId: 'alice' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when userId missing', async () => {
    mockAttemptPurchase.mockRejectedValueOnce(new saleService.AppError(400, 'userId is required'));
    const res = await request(app)
      .post('/api/sale/purchase')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('userId is required');
  });

  it('returns out_of_stock result', async () => {
    mockAttemptPurchase.mockResolvedValueOnce({ success: false, message: 'Sorry, this item is out of stock' });
    const res = await request(app)
      .post('/api/sale/purchase')
      .send({ userId: 'bob' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/sale/purchase/:userId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns purchase record', async () => {
    const purchase = { id: 1, sale_id: 1, user_id: 'alice' };
    mockGetUserPurchase.mockResolvedValueOnce(purchase);
    const res = await request(app).get('/api/sale/purchase/alice');
    expect(res.status).toBe(200);
    expect(res.body.purchase).toEqual(purchase);
  });

  it('returns null when no purchase', async () => {
    mockGetUserPurchase.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/sale/purchase/alice');
    expect(res.status).toBe(200);
    expect(res.body.purchase).toBeNull();
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
  });
});
