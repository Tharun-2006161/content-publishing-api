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

describe('Search API', () => {
    let token;
    let userId;
    const suffix = Date.now();

    beforeAll(async () => {
        // Register user
        const res = await request(app)
            .post('/auth/register')
            .send({
                username: `search_user_${suffix}`,
                email: `search_${suffix}@test.com`,
                password: 'Password123!',
            });
        token = res.body.token;
        userId = res.body.user.id;

        // Create and publish a post with searchable content
        const createRes = await request(app)
            .post('/posts')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: `Unique Avocado Toast Recipe ${suffix}`, content: 'Delicious avocado with sourdough bread toast and eggs.' });

        const postId = createRes.body.post.id;

        await request(app)
            .post(`/posts/${postId}/publish`)
            .set('Authorization', `Bearer ${token}`);
    });

    afterAll(async () => {
        await sequelize.query(`DELETE FROM posts WHERE author_id = '${userId}'`);
        await sequelize.query(`DELETE FROM users WHERE id = '${userId}'`);
        await sequelize.close();
    });

    it('should return results for matching published posts', async () => {
        const res = await request(app).get('/search?q=avocado');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.posts.length).toBeGreaterThan(0);
        expect(res.body.posts[0].status).toBe('published');
    });

    it('should return empty for non-matching query', async () => {
        const res = await request(app).get('/search?q=xyznonexistentwordxyz123');
        expect(res.status).toBe(200);
        expect(res.body.posts.length).toBe(0);
    });

    it('should require the q parameter', async () => {
        const res = await request(app).get('/search');
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should support pagination', async () => {
        const res = await request(app).get('/search?q=avocado&page=1&limit=5');
        expect(res.status).toBe(200);
        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.page).toBe(1);
        expect(res.body.pagination.limit).toBe(5);
    });

    it('should not return draft posts in search results', async () => {
        // Create a draft post about avocado - should NOT appear in search
        await request(app)
            .post('/posts')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: `Draft Avocado Post ${suffix}`, content: 'This is a draft avocado post.' });

        const res = await request(app).get('/search?q=avocado');
        const draftPosts = res.body.posts.filter(p => p.status !== 'published');
        expect(draftPosts.length).toBe(0);
    });
});
