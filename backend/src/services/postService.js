const { Post, PostRevision, User } = require('../models');
const { generateUniqueSlug } = require('../utils/slugify');
const { invalidateCache, invalidatePattern, CacheKeys } = require('./cacheService');
const { AppError } = require('../middleware/errorHandler');
const { mongoose } = require('../config/database');

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

    const doc = post.toObject();
    doc.id = doc._id;
    return doc;
}

/**
 * Update a post and create a revision of the previous state.
 */
async function updatePost(postId, { title, content }, userId) {
    const post = await Post.findOne({ _id: postId, author_id: userId });
    
    if (!post) {
        throw new AppError('Post not found or access denied', 404);
    }

    // Save current state as revision
    await PostRevision.create({
        post_id: post._id,
        title_snapshot: post.title,
        content_snapshot: post.content,
        revision_author_id: userId,
        revision_timestamp: new Date(),
    });

    // Update the post
    if (title !== undefined) {
        post.title = title;
        post.slug = await generateUniqueSlug(title, postId);
    }
    if (content !== undefined) {
        post.content = content;
    }

    await post.save();

    // Invalidate cache
    await invalidateCache(CacheKeys.publishedPost(postId));
    await invalidatePattern('posts:published:*');
    await invalidateCache(CacheKeys.postRevisions(postId));

    const doc = post.toObject();
    doc.id = doc._id;
    return doc;
}

/**
 * Publish a post immediately.
 */
async function publishPost(postId, userId) {
    const post = await Post.findOne({ _id: postId, author_id: userId });

    if (!post) {
        throw new AppError('Post not found or access denied', 404);
    }

    if (post.status === 'published') {
        throw new AppError('Post is already published', 400);
    }

    post.status = 'published';
    post.published_at = new Date();
    post.scheduled_for = null;
    await post.save();

    // Invalidate cache
    await invalidateCache(CacheKeys.publishedPost(postId));
    await invalidatePattern('posts:published:*');

    const doc = post.toObject();
    doc.id = doc._id;
    return doc;
}

/**
 * Schedule a post for future publishing.
 */
async function schedulePost(postId, userId, scheduledFor) {
    const scheduledDate = new Date(scheduledFor);

    if (scheduledDate <= new Date()) {
        throw new AppError('scheduled_for must be a future date', 400);
    }

    const post = await Post.findOne({ _id: postId, author_id: userId });

    if (!post) {
        throw new AppError('Post not found or access denied', 404);
    }

    if (post.status === 'published') {
        throw new AppError('Cannot schedule an already published post', 400);
    }

    post.status = 'scheduled';
    post.scheduled_for = scheduledDate;
    await post.save();

    const doc = post.toObject();
    doc.id = doc._id;
    return doc;
}

/**
 * Delete a post.
 */
async function deletePost(postId, userId) {
    const post = await Post.findOne({ _id: postId, author_id: userId });
    if (!post) throw new AppError('Post not found or access denied', 404);

    await Post.deleteOne({ _id: postId });
    await invalidateCache(CacheKeys.publishedPost(postId));
    await invalidatePattern('posts:published:*');
}

/**
 * Get a post for an author (their own post).
 */
async function getAuthorPost(postId, userId) {
    const post = await Post.findOne({ _id: postId, author_id: userId }).populate('author', 'id username email');
    if (!post) throw new AppError('Post not found', 404);
    
    const doc = post.toObject();
    doc.id = doc._id;
    return doc;
}

/**
 * List posts for an author with pagination.
 */
async function listAuthorPosts(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const count = await Post.countDocuments({ author_id: userId });
    const posts = await Post.find({ author_id: userId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'id username');

    return {
        posts: posts.map(p => {
            const doc = p.toObject();
            doc.id = doc._id;
            return doc;
        }),
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit) || 1,
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
