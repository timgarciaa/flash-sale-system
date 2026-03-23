import { Router, type IRouter, Request, Response, NextFunction } from 'express';
import { getSaleStatus, attemptPurchase, getUserPurchase } from '../services/saleService';

export const saleRouter: IRouter = Router();

saleRouter.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await getSaleStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

saleRouter.post('/purchase', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    const result = await attemptPurchase(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

saleRouter.get('/purchase/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const purchase = await getUserPurchase(userId);
    res.json({ purchase });
  } catch (err) {
    next(err);
  }
});
