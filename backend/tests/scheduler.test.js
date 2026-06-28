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
const { connectDB, mongoose } = require('../src/config/database');
const { publishScheduledPosts } = require('../src/worker/scheduler');

describe('Scheduler Worker', () => {
    let token;
    let userId;
    const suffix = Date.now();

    beforeAll(async () => {
        await connectDB();
        const res = await request(app)
            .post('/auth/register')
            .send({
                username: `worker_user_${suffix}`,
                email: `worker_${suffix}@test.com`,
                password: 'Password123!',
            });
        token = res.body.token;
        userId = res.body.user.id;
    });

    afterAll(async () => {
        const { Post, User } = require('../src/models'); await Post.deleteMany({ author_id: userId });
        await User.deleteMany({ _id: userId });
        await mongoose.connection.close();
    });

    it('should automatically publish a post whose scheduled_for is in the past', async () => {
        // Create a post
        const createRes = await request(app)
            .post('/posts')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: `Scheduled Worker Test ${suffix}`, content: 'Will be auto-published' });

        const postId = createRes.body.post.id;

        // Manually set it to scheduled with a past timestamp (bypass validation)
        await Post.updateOne({ _id: postId }, { $set: { status: 'scheduled', scheduled_for: new Date(Date.now() - 60000) } });

        // Run the worker
        const count = await publishScheduledPosts();
        expect(count).toBeGreaterThanOrEqual(1);

        // Verify post is now published
        const checkRes = await request(app)
            .get(`/posts/${postId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(checkRes.body.post.status).toBe('published');
        expect(checkRes.body.post.published_at).toBeDefined();
    });

    it('should be idempotent - running twice does not cause errors', async () => {
        // Run the worker again - should not throw or double-publish
        await expect(publishScheduledPosts()).resolves.not.toThrow();
        await expect(publishScheduledPosts()).resolves.not.toThrow();
    });
});
