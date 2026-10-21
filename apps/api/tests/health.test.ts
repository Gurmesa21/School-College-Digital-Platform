import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';

describe('API Foundation Tests', () => {
  const app = createApp();

  describe('Configuration Validation', () => {
    it('validates and loads valid configuration defaults', () => {
      const config = loadConfig({
        NODE_ENV: 'test',
        PORT: '5001',
      });
      expect(config.NODE_ENV).toBe('test');
      expect(config.PORT).toBe(5001);
      expect(config.API_PREFIX).toBe('/api/v1');
    });

    it('throws an error when invalid port is supplied', () => {
      expect(() => {
        loadConfig({
          PORT: 'invalid-port',
        });
      }).toThrow();
    });
  });

  describe('GET /health (Liveness Probe)', () => {
    it('responds with 200 OK and valid health metadata', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.service).toBe('@school/api');
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.requestId).toBeDefined();
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('responds with 200 OK under versioned prefix /api/v1/health', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
    });
  });

  describe('Central Error Handling', () => {
    it('returns structured JSON 404 for non-existent route with requestId', async () => {
      const res = await request(app).get('/api/v1/non-existent-route');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.requestId).toBeDefined();
      expect(res.body.error.timestamp).toBeDefined();
    });
  });
});
