import request from 'supertest';
import app from '../src/app.js';

describe('API smoke tests', () => {
  it('returns the health check payload', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('CareerSync API is running'),
      }),
    );
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/definitely-not-a-real-route');

    expect(res.status).toBe(404);
  });

  it('rejects invalid login input with validation errors', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.any(String),
      }),
    );
  });

  it('rejects invalid job search parameters', async () => {
    const res = await request(app).get('/api/v1/jobs?limit=100');

    expect(res.status).toBe(422);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.any(String),
      }),
    );
  });

  it('blocks analytics access without authentication', async () => {
    const res = await request(app).get('/api/v1/analytics');

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Access token required'),
      }),
    );
  });
});
