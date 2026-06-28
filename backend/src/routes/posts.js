const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { AppError } = require('../middleware/errorHandler');
const postService = require('../services/postService');

// Apply auth middleware to all post routes
router.use(verifyToken);
router.use(authorize('author', 'admin'));

const createPostSchema = Joi.object({
    title: Joi.string().min(1).max(500).required(),
    content: Joi.string().allow('').default(''),
});

const updatePostSchema = Joi.object({
    title: Joi.string().min(1).max(500),
    content: Joi.string().allow(''),
}).min(1);

const scheduleSchema = Joi.object({
    scheduled_for: Joi.string().isoDate().required(),
});

/**
 * @route GET /posts
 * @desc List authenticated author's posts
 */
router.get('/', async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const result = await postService.listAuthorPosts(req.user.id, page, limit);
    res.json({ success: true, ...result });
});

/**
 * @route POST /posts
 * @desc Create a new draft post
 */
router.post('/', async (req, res) => {
    const { error, value } = createPostSchema.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);

    const post = await postService.createPost({
        title: value.title,
        content: value.content,
        authorId: req.user.id,
    });

    res.status(201).json({ success: true, post });
});

/**
 * @route GET /posts/:id
 * @desc Get a single author post
 */
router.get('/:id', async (req, res) => {
    const post = await postService.getAuthorPost(req.params.id, req.user.id);
    res.json({ success: true, post });
});

/**
 * @route PUT /posts/:id
 * @desc Update a post (creates revision automatically)
 */
router.put('/:id', async (req, res) => {
    const { error, value } = updatePostSchema.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);

    const post = await postService.updatePost(req.params.id, value, req.user.id);
    res.json({ success: true, post });
});

/**
 * @route DELETE /posts/:id
 * @desc Delete a post
 */
router.delete('/:id', async (req, res) => {
    await postService.deletePost(req.params.id, req.user.id);
    res.json({ success: true, message: 'Post deleted successfully' });
});

/**
 * @route POST /posts/:id/publish
 * @desc Publish a post immediately
 */
router.post('/:id/publish', async (req, res) => {
    const post = await postService.publishPost(req.params.id, req.user.id);
    res.json({ success: true, post, message: 'Post published successfully' });
});

/**
 * @route POST /posts/:id/schedule
 * @desc Schedule a post for future publishing
 */
router.post('/:id/schedule', async (req, res) => {
    const { error, value } = scheduleSchema.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);

    const post = await postService.schedulePost(req.params.id, req.user.id, value.scheduled_for);
    res.json({ success: true, post, message: `Post scheduled for ${value.scheduled_for}` });
});

/**
 * @route GET /posts/:id/revisions
 * @desc Get revision history for a post
 */
router.get('/:id/revisions', async (req, res) => {
    const { Post, PostRevision, User } = require('../models');
    const { getCached, setCached, CacheKeys } = require('../services/cacheService');

    const cacheKey = CacheKeys.postRevisions(req.params.id);
    const cached = await getCached(cacheKey);
    if (cached) return res.json({ success: true, revisions: cached });

    // Verify ownership
    const post = await Post.findOne({ _id: req.params.id, author_id: req.user.id });
    if (!post) throw new AppError('Post not found or access denied', 404);

    const revisions = await PostRevision.findAll({
        where: { post_id: req.params.id },
        include: [{ model: User, as: 'revisionAuthor', attributes: ['id', 'username'] }],
        order: [['revision_timestamp', 'ASC']],
    });

    const revisionData = revisions.map(r => ({
        revision_id: r.id,
        post_id: r.post_id,
        title_snapshot: r.title_snapshot,
        content_snapshot: r.content_snapshot,
        revision_author: r.revisionAuthor ? r.revisionAuthor.username : null,
        revision_timestamp: r.revision_timestamp,
    }));

    await setCached(cacheKey, revisionData, 60);
    res.json({ success: true, revisions: revisionData });
});

module.exports = router;
