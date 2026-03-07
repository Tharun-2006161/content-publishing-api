const sequelize = require('../config/database');
const { Post, PostRevision, User } = require('../models');
const { generateUniqueSlug } = require('../utils/slugify');
const { invalidateCache, invalidatePattern, CacheKeys } = require('./cacheService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Create a new post (draft by default).
 */
async function createPost({ title, content, authorId }) {
    const slug = await generateUniqueSlug(title);

    const post = await Post.create({
        title,
        slug,
        content: content || '',
        status: 'draft',
        author_id: authorId,
    });

    return post;
}

/**
 * Update a post and create a revision of the previous state.
 * Wrapped in a transaction.
 */
async function updatePost(postId, { title, content }, userId) {
    const result = await sequelize.transaction(async (t) => {
        const post = await Post.findOne({
            where: { id: postId, author_id: userId },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!post) {
            throw new AppError('Post not found or access denied', 404);
        }

        // Save current state as revision
        await PostRevision.create({
            post_id: post.id,
            title_snapshot: post.title,
            content_snapshot: post.content,
            revision_author_id: userId,
            revision_timestamp: new Date(),
        }, { transaction: t });

        // Update the post
        const updates = {};
        if (title !== undefined) {
            updates.title = title;
            updates.slug = await generateUniqueSlug(title, postId);
        }
        if (content !== undefined) {
            updates.content = content;
        }

        await post.update(updates, { transaction: t });

        return post;
    });

    // Invalidate cache
    await invalidateCache(CacheKeys.publishedPost(postId));
    await invalidatePattern('posts:published:*');
    await invalidateCache(CacheKeys.postRevisions(postId));

    return result;
}

/**
 * Publish a post immediately.
 */
async function publishPost(postId, userId) {
    return await sequelize.transaction(async (t) => {
        const post = await Post.findOne({
            where: { id: postId, author_id: userId },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!post) {
            throw new AppError('Post not found or access denied', 404);
        }

        if (post.status === 'published') {
            throw new AppError('Post is already published', 400);
        }

        await post.update({
            status: 'published',
            published_at: new Date(),
            scheduled_for: null,
        }, { transaction: t });

        // Invalidate cache
        await invalidateCache(CacheKeys.publishedPost(postId));
        await invalidatePattern('posts:published:*');

        return post;
    });
}

/**
 * Schedule a post for future publishing.
 */
async function schedulePost(postId, userId, scheduledFor) {
    const scheduledDate = new Date(scheduledFor);

    if (scheduledDate <= new Date()) {
        throw new AppError('scheduled_for must be a future date', 400);
    }

    return await sequelize.transaction(async (t) => {
        const post = await Post.findOne({
            where: { id: postId, author_id: userId },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!post) {
            throw new AppError('Post not found or access denied', 404);
        }

        if (post.status === 'published') {
            throw new AppError('Cannot schedule an already published post', 400);
        }

        await post.update({
            status: 'scheduled',
            scheduled_for: scheduledDate,
        }, { transaction: t });

        return post;
    });
}

/**
 * Delete a post.
 */
async function deletePost(postId, userId) {
    const post = await Post.findOne({ where: { id: postId, author_id: userId } });
    if (!post) throw new AppError('Post not found or access denied', 404);

    await post.destroy();
    await invalidateCache(CacheKeys.publishedPost(postId));
    await invalidatePattern('posts:published:*');
}

/**
 * Get a post for an author (their own post).
 */
async function getAuthorPost(postId, userId) {
    const post = await Post.findOne({
        where: { id: postId, author_id: userId },
        include: [{ model: User, as: 'author', attributes: ['id', 'username', 'email'] }],
    });
    if (!post) throw new AppError('Post not found', 404);
    return post;
}

/**
 * List posts for an author with pagination.
 */
async function listAuthorPosts(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Post.findAndCountAll({
        where: { author_id: userId },
        order: [['created_at', 'DESC']],
        limit,
        offset,
        include: [{ model: User, as: 'author', attributes: ['id', 'username'] }],
    });

    return {
        posts: rows,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
        },
    };
}

module.exports = {
    createPost,
    updatePost,
    publishPost,
    schedulePost,
    deletePost,
    getAuthorPost,
    listAuthorPosts,
};
