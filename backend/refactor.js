const fs = require('fs');
const path = require('path');

const files = {
    'package.json': (content) => {
        const pkg = JSON.parse(content);
        delete pkg.dependencies['sequelize'];
        delete pkg.dependencies['pg'];
        delete pkg.dependencies['pg-hstore'];
        pkg.dependencies['mongoose'] = '^8.2.1';
        return JSON.stringify(pkg, null, 2);
    },
    'src/config/database.js': () => `const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cms_db';
        await mongoose.connect(mongoUri);
        logger.info('MongoDB connected successfully');
    } catch (err) {
        logger.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

module.exports = { connectDB, mongoose };
`,
    'src/models/User.js': () => `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, maxlength: 255 },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['author', 'admin'], default: 'author' }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

userSchema.virtual('id').get(function() { return this._id.toHexString(); });
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
`,
    'src/models/Post.js': () => `const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 500 },
    slug: { type: String, required: true, unique: true, maxlength: 600 },
    content: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'scheduled', 'published'], default: 'draft' },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scheduled_for: { type: Date, default: null },
    published_at: { type: Date, default: null }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

postSchema.index({ title: 'text', content: 'text' });
postSchema.virtual('id').get(function() { return this._id.toHexString(); });
postSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
`,
    'src/models/PostRevision.js': () => `const mongoose = require('mongoose');

const postRevisionSchema = new mongoose.Schema({
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    title_snapshot: { type: String, required: true, maxlength: 500 },
    content_snapshot: { type: String, default: '' },
    revision_author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    revision_timestamp: { type: Date, default: Date.now }
});

postRevisionSchema.virtual('id').get(function() { return this._id.toHexString(); });
postRevisionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('PostRevision', postRevisionSchema);
`,
    'src/models/index.js': () => `const User = require('./User');
const Post = require('./Post');
const PostRevision = require('./PostRevision');

module.exports = { User, Post, PostRevision };
`,
    'src/routes/auth.js': (content) => {
        let text = content.replace(/User\.findOne\(\{ where: \{ (.*?): (.*?) \} \}\)/g, 'User.findOne({ $1: $2 })');
        text = text.replace(/User\.findByPk\(req\.user\.id/g, 'User.findById(req.user.id');
        return text;
    },
    'src/routes/posts.js': (content) => {
        let text = content.replace(/Post\.findAndCountAll\(\{\s*where: \{ author_id: req\.user\.id \},\s*order: \[\[\'created_at\', \'DESC\'\]\],\s*limit,\s*offset,\s*\}\)/g, 
            'Promise.all([Post.find({ author_id: req.user.id }).sort({ created_at: -1 }).skip(offset).limit(limit), Post.countDocuments({ author_id: req.user.id })]).then(([rows, count]) => ({ rows, count }))');
        text = text.replace(/Post\.findOne\(\{ where: \{ id: req\.params\.id, author_id: req\.user\.id \} \}\)/g, 'Post.findOne({ _id: req.params.id, author_id: req.user.id })');
        text = text.replace(/PostRevision\.findAll\(\{ where: \{ post_id: post\.id \}, order: \[\[\'revision_timestamp\', \'DESC\'\]\] \}\)/g, 'PostRevision.find({ post_id: post.id }).sort({ revision_timestamp: -1 })');
        return text;
    },
    'src/routes/public.js': (content) => {
        let text = content.replace(/Post\.findAndCountAll\(\{\s*where: \{ status: \'published\' \},\s*order: \[\[\'published_at\', \'DESC\'\]\],\s*limit,\s*offset,\s*\}\)/g,
            'Promise.all([Post.find({ status: "published" }).sort({ published_at: -1 }).skip(offset).limit(limit), Post.countDocuments({ status: "published" })]).then(([rows, count]) => ({ rows, count }))');
        text = text.replace(/Post\.findOne\(\{ where: \{ slug: req\.params\.slug, status: \'published\' \} \}\)/g, 'Post.findOne({ slug: req.params.slug, status: "published" })');
        return text;
    },
    'src/routes/search.js': (content) => {
        return `const express = require('express');
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
module.exports = router;`;
    },
    'src/worker/scheduler.js': () => `require('dotenv').config();
const { connectDB } = require('../config/database');
const { Post } = require('../models');
const logger = require('../utils/logger');
const config = require('../config');

const INTERVAL_MS = config.worker.intervalMs;

async function publishScheduledPosts() {
    try {
        const result = await Post.updateMany(
            { status: 'scheduled', scheduled_for: { $lte: new Date() } },
            { $set: { status: 'published', published_at: new Date(), updated_at: new Date() } }
        );

        const updatedCount = result.modifiedCount;

        if (updatedCount > 0) {
            logger.info(\`[Worker] Published \${updatedCount} scheduled post(s).\`);
            try {
                const { getRedisClient } = require('../config/redis');
                const redis = getRedisClient();
                const keys = await redis.keys('posts:published:*');
                if (keys.length > 0) await redis.del(...keys);
                logger.info(\`[Worker] Invalidated \${keys.length} cache key(s).\`);
            } catch (cacheErr) {
                logger.warn('[Worker] Cache invalidation failed (non-fatal):', cacheErr.message);
            }
        } else {
            logger.debug('[Worker] No scheduled posts to publish.');
        }

        return updatedCount;
    } catch (err) {
        logger.error('[Worker] Error publishing scheduled posts:', err);
        return 0;
    }
}

module.exports = { publishScheduledPosts };
`,
    'src/worker/index.js': (content) => {
        return content.replace(/const sequelize = require\('\.\.\/config\/database'\);/g, 'const { connectDB, mongoose } = require(\'../config/database\');')
                      .replace(/await sequelize\.authenticate\(\);/g, 'await connectDB();')
                      .replace(/sequelize\.close\(\);/g, 'mongoose.connection.close();');
    },
    'src/server.js': (content) => {
        return content.replace(/const sequelize = require\('\.\/config\/database'\);/g, 'const { connectDB } = require(\'./config/database\');')
                      .replace(/await sequelize\.authenticate\(\);/g, 'await connectDB();');
    },
    'src/db/migrate.js': () => `const { connectDB, mongoose } = require('../config/database');
const logger = require('../utils/logger');
(async () => {
    await connectDB();
    logger.info('MongoDB migration complete (schema is dynamic, no action needed).');
    await mongoose.connection.close();
    process.exit(0);
})();`,
    'src/db/seed.js': (content) => {
        let text = content.replace(/const sequelize = require\('\.\.\/config\/database'\);/g, 'const { connectDB, mongoose } = require(\'../config/database\');')
                      .replace(/await sequelize\.authenticate\(\);/g, 'await connectDB();')
                      .replace(/await sequelize\.sync\(\{ force: true \}\);/g, 'await mongoose.connection.dropDatabase();')
                      .replace(/await User\.bulkCreate/g, 'await User.insertMany')
                      .replace(/await Post\.bulkCreate/g, 'await Post.insertMany')
                      .replace(/sequelize\.close\(\);/g, 'mongoose.connection.close();');
        return text;
    },
    '../docker-compose.yml': (content) => {
        return content.replace(/postgres:16-alpine/g, 'mongo:6')
                      .replace(/POSTGRES_DB: cms_db/g, 'MONGO_INITDB_DATABASE: cms_db')
                      .replace(/POSTGRES_USER:/g, '#POSTGRES_USER:')
                      .replace(/POSTGRES_PASSWORD:/g, '#POSTGRES_PASSWORD:')
                      .replace(/5432:5432/g, '27017:27017')
                      .replace(/POSTGRES_HOST=db/g, 'MONGO_URI=mongodb://db:27017/cms_db');
    },
    '../render.yaml': (content) => {
        let text = content.replace(/fromDatabase:\n\s+name: content-db\n\s+property: host/g, 'generateValue: true');
        return text; 
    }
};

for (const [file, replacer] of Object.entries(files)) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (typeof replacer === 'function') {
            content = replacer(content);
        } else {
            content = replacer;
        }
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + file);
    }
}
