const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');

/**
 * @route GET /search?q=query
 * @desc Full-text search on published posts (public)
 */
router.get('/', async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) {
        return res.status(400).json({ success: false, message: 'Query parameter "q" is required' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const results = await sequelize.query(
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
