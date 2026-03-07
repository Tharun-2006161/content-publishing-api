process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'cms_db';
process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'cms_user';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'cms_password';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.UPLOAD_DIR = '/tmp/cms_test_uploads';

const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');

describe('Auth API', () => {
    const testUser = {
        username: `auth_user_${Date.now()}`,
        email: `auth_${Date.now()}@test.com`,
        password: 'Password123!',
    };

    afterAll(async () => {
        await sequelize.query(`DELETE FROM users WHERE email = '${testUser.email}'`);
        await sequelize.close();
    });

    describe('POST /auth/register', () => {
        it('should register a new user and return JWT', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send(testUser);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe(testUser.email);
            expect(res.body.user.role).toBe('author');
        });

        it('should reject duplicate email', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send(testUser);

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
        });

        it('should reject invalid email format', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({ username: 'testuser', email: 'not-an-email', password: 'Password123!' });

            expect(res.status).toBe(400);
        });

        it('should reject short password', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({ username: 'newuser2', email: 'new2@test.com', password: '123' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /auth/login', () => {
        it('should login and return JWT token', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ email: testUser.email, password: testUser.password });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe(testUser.email);
        });

        it('should reject wrong password', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ email: testUser.email, password: 'wrongpassword' });

            expect(res.status).toBe(401);
        });

        it('should reject non-existent email', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'nobody@example.com', password: 'Password123!' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /auth/me', () => {
        let token;

        beforeAll(async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ email: testUser.email, password: testUser.password });
            token = res.body.token;
        });

        it('should return user info for valid token', async () => {
            const res = await request(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.user.email).toBe(testUser.email);
        });

        it('should reject request without token', async () => {
            const res = await request(app).get('/auth/me');
            expect(res.status).toBe(401);
        });

        it('should reject request with invalid token', async () => {
            const res = await request(app)
                .get('/auth/me')
                .set('Authorization', 'Bearer invalidtoken123');
            expect(res.status).toBe(401);
        });
    });
});
