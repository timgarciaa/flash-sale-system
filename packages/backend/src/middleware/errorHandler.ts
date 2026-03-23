import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/saleService';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
