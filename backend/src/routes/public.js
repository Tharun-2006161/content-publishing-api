const express = require('express');
const router = express.Router();
const { mongoose } = require('../config/database');
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

    const skip = (page - 1) * limit;
    const count = await Post.countDocuments({ status: 'published' });
    const posts = await Post.find({ status: 'published' })
        .sort({ published_at: -1 })
        .skip(skip)
        .limit(limit)
        .select('id title slug content status published_at created_at author_id')
        .populate('author', 'id username');

    const result = {
        posts: posts.map(p => {
            const doc = p.toObject();
            doc.id = doc._id;
            return doc;
        }),
        pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 },
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

    const post = await Post.findOne({ _id: req.params.id, status: 'published' })
        .select('id title slug content status published_at created_at author_id')
        .populate('author', 'id username');

    if (!post) {
        return res.status(404).json({ success: false, message: 'Published post not found' });
    }

    const doc = post.toObject();
    doc.id = doc._id;

    await setCached(cacheKey, doc);
    res.json({ success: true, post: doc });
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
    const skip = (page - 1) * limit;

    const query = { status: 'published', $text: { $search: q } };
    
    const count = await Post.countDocuments(query);
    const posts = await Post.find(query, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limit)
        .populate('author', 'id username');

    const formattedPosts = posts.map(p => {
        const doc = p.toObject();
        doc.id = doc._id;
        doc.rank = doc.score;
        return doc;
    });

    res.json({
        success: true,
        query: q,
        posts: formattedPosts,
        pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 },
    });
});

module.exports = router;
