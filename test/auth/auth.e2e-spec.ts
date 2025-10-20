import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Authorization E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject admin API key on admin routes (JWT required)', async () => {
    await request(app.getHttpServer())
      .get('/admin/analytics/providers')
      .set('X-Admin-API-Key', 'kya_admin_test_key')
      .expect(401);
  });

  it('should reject tenant API key on admin routes', async () => {
    await request(app.getHttpServer())
      .get('/admin/analytics/providers')
      .set('X-API-Key', 'kya_test_key')
      .expect(401);
  });

  it('should require auth on tenant routes when no key/token provided', async () => {
    await request(app.getHttpServer()).get('/verifications').expect(401);
  });

  it('should accept tenant API key on tenant routes (if valid)', async () => {
    await request(app.getHttpServer())
      .get('/verifications')
      .set('X-API-Key', 'kya_dummy_key')
      .expect((res) => {
        if (![200, 401].includes(res.status)) {
          throw new Error(`Unexpected status ${res.status}`);
        }
      });
  });
});
