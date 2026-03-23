import request from 'supertest';
import { createApp } from '../src/app';

describe('App (e2e)', () => {
  const app = createApp();

  it('GET /health returns ok', () => {
    return request(app).get('/health').expect(200).expect({ status: 'ok' });
  });
});
