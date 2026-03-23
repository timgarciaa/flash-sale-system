import express, { Express } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/healthRoute';
import { saleRouter } from './routes/saleRoutes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(healthRouter);
  app.use('/api/sale', saleRouter);
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}
