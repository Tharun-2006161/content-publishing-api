const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { Post, User } = require('../models');
const { getCached, setCached, CacheKeys } = require('../services/cacheService');

/**
 * @route GET /posts/published
 * @desc List all published posts (public, cached, paginated)
 */
router.get('/', async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

    const cacheKey = CacheKeys.publishedPosts(page, limit);
    const cached = await getCached(cacheKey);
    if (cached) return res.json({ success: true, ...cached, cached: true });

    const offset = (page - 1) * limit;
    const { count, rows } = await Post.findAndCountAll({
        where: { status: 'published' },
        order: [['published_at', 'DESC']],
        limit,
        offset,
        attributes: ['id', 'title', 'slug', 'content', 'status', 'published_at', 'created_at'],
        include: [{ model: User, as: 'author', attributes: ['id', 'username'] }],
    });

    const result = {
        posts: rows,
        pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };

    await setCached(cacheKey, result);
    res.json({ success: true, ...result });
});

/**
 * @route GET /posts/published/:id
 * @desc Get a specific published post (public, cached)
 */
router.get('/:id', async (req, res) => {
    const cacheKey = CacheKeys.publishedPost(req.params.id);
    const cached = await getCached(cacheKey);
    if (cached) return res.json({ success: true, post: cached, cached: true });

    const post = await Post.findOne({
        where: { id: req.params.id, status: 'published' },
        attributes: ['id', 'title', 'slug', 'content', 'status', 'published_at', 'created_at'],
        include: [{ model: User, as: 'author', attributes: ['id', 'username'] }],
    });

    if (!post) {
        return res.status(404).json({ success: false, message: 'Published post not found' });
    }

    await setCached(cacheKey, post);
    res.json({ success: true, post });
});

/**
 * @route GET /search?q=query
 * @desc Full-text search on published posts
 */
router.get('/search', async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) {
        return res.status(400).json({ success: false, message: 'Query parameter "q" is required' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const [results] = await sequelize.query(
        `SELECT
       p.id, p.title, p.slug, p.content, p.status, p.published_at, p.created_at,
       u.id as author_id, u.username as author_username,
       ts_rank(p.search_vector, plainto_tsquery('english', :query)) AS rank,
       COUNT(*) OVER() as total_count
     FROM posts p
     JOIN users u ON p.author_id = u.id
     WHERE p.status = 'published'
       AND p.search_vector @@ plainto_tsquery('english', :query)
     ORDER BY rank DESC
     LIMIT :limit OFFSET :offset`,
        {
            replacements: { query: q, limit, offset },
            type: sequelize.QueryTypes.SELECT,
        }
    );

    const posts = results.map(r => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        content: r.content,
        status: r.status,
        published_at: r.published_at,
        created_at: r.created_at,
        author: { id: r.author_id, username: r.author_username },
        rank: parseFloat(r.rank),
    }));

    const total = results.length > 0 ? parseInt(results[0].total_count) : 0;

    res.json({
        success: true,
        query: q,
        posts,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
});

module.exports = router;
