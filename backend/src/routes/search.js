const express = require('express');
const router = express.Router();
const { Post } = require('../models');
const { AppError } = require('../middleware/errorHandler');

router.get('/', async (req, res) => {
    const q = req.query.q;
    if (!q) throw new AppError('Search query (q) is required', 400);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const query = { status: 'published', $text: { $search: q } };
    const [rows, count] = await Promise.all([
        Post.find(query, { score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } }).skip(offset).limit(limit),
        Post.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: rows,
        meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
});
module.exports = router;