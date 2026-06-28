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

describe('Posts API', () => {
    let token;
    let userId;
    let postId;
    const suffix = Date.now();
    const authorData = {
        username: `posts_author_${suffix}`,
        email: `posts_${suffix}@test.com`,
        password: 'Password123!',
    };

    beforeAll(async () => {
        await connectDB();
        // Register and login
        const regRes = await request(app).post('/auth/register').send(authorData);
        token = regRes.body.token;
        userId = regRes.body.user.id;
    });

    afterAll(async () => {
        const { Post, User } = require('../src/models'); await Post.deleteMany({ author_id: userId });
        await User.deleteMany({ _id: userId });
        await mongoose.connection.close();
    });

    describe('POST /posts', () => {
        it('should create a draft post with auto-generated slug', async () => {
            const res = await request(app)
                .post('/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'My First Post', content: 'Hello world' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.post.status).toBe('draft');
            expect(res.body.post.slug).toContain('my-first-post');
            postId = res.body.post.id;
        });

        it('should generate unique slug for duplicate title', async () => {
            const res = await request(app)
                .post('/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'My First Post', content: 'Duplicate title' });

            expect(res.status).toBe(201);
            expect(res.body.post.slug).not.toBe('my-first-post');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/posts')
                .send({ title: 'Test', content: 'Content' });
            expect(res.status).toBe(401);
        });
    });

    describe('GET /posts', () => {
        it('should list author posts with pagination', async () => {
            const res = await request(app)
                .get('/posts?page=1&limit=5')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.posts).toBeInstanceOf(Array);
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination.page).toBe(1);
        });
    });

    describe('GET /posts/:id', () => {
        it('should get a post by id', async () => {
            const res = await request(app)
                .get(`/posts/${postId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.post.id).toBe(postId);
        });

        it('should return 404 for non-existent post', async () => {
            const res = await request(app)
                .get('/posts/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /posts/:id (creates revision)', () => {
        it('should update post and create a revision', async () => {
            const res = await request(app)
                .put(`/posts/${postId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Updated Title', content: 'Updated content' });

            expect(res.status).toBe(200);
            expect(res.body.post.title).toBe('Updated Title');

            // Verify revision was created
            const revRes = await request(app)
                .get(`/posts/${postId}/revisions`)
                .set('Authorization', `Bearer ${token}`);

            expect(revRes.status).toBe(200);
            expect(revRes.body.revisions.length).toBeGreaterThan(0);
            expect(revRes.body.revisions[0].title_snapshot).toBe('My First Post');
        });
    });

    describe('POST /posts/:id/publish', () => {
        it('should publish a draft post', async () => {
            const res = await request(app)
                .post(`/posts/${postId}/publish`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.post.status).toBe('published');
            expect(res.body.post.published_at).toBeDefined();
        });

        it('should reject publishing already published post', async () => {
            const res = await request(app)
                .post(`/posts/${postId}/publish`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });
    });

    describe('POST /posts/:id/schedule', () => {
        let draftPostId;

        beforeAll(async () => {
            const res = await request(app)
                .post('/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: `Schedule Test ${suffix}`, content: 'Scheduled content' });
            draftPostId = res.body.post.id;
        });

        it('should schedule a post for future publishing', async () => {
            const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            const res = await request(app)
                .post(`/posts/${draftPostId}/schedule`)
                .set('Authorization', `Bearer ${token}`)
                .send({ scheduled_for: futureDate });

            expect(res.status).toBe(200);
            expect(res.body.post.status).toBe('scheduled');
            expect(res.body.post.scheduled_for).toBeDefined();
        });

        it('should reject past date for scheduling', async () => {
            const pastDate = new Date(Date.now() - 1000).toISOString();
            const res = await request(app)
                .post(`/posts/${draftPostId}/schedule`)
                .set('Authorization', `Bearer ${token}`)
                .send({ scheduled_for: pastDate });

            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /posts/:id', () => {
        let deletePostId;

        beforeAll(async () => {
            const res = await request(app)
                .post('/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: `Delete Me ${suffix}`, content: 'Will be deleted' });
            deletePostId = res.body.post.id;
        });

        it('should delete a post', async () => {
            const res = await request(app)
                .delete(`/posts/${deletePostId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should return 404 for deleted post', async () => {
            const res = await request(app)
                .get(`/posts/${deletePostId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });
});
