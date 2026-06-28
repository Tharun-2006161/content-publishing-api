const bcrypt = require('bcryptjs');
const { connectDB, mongoose } = require('../config/database');
const { User } = require('../models');
const logger = require('../utils/logger');

async function seed() {
    try {
        await connectDB();

        // Check if already seeded
        const count = await User.countDocuments();
        if (count > 0) {
            logger.info('Database already seeded, skipping.');
            await mongoose.connection.close();
            return;
        }

        const password_hash = await bcrypt.hash('Password123!', 12);

        await User.insertMany([
            { username: 'admin', email: 'admin@example.com', password_hash, role: 'admin' },
            { username: 'author1', email: 'author1@example.com', password_hash, role: 'author' },
            { username: 'author2', email: 'author2@example.com', password_hash, role: 'author' }
        ]);

        logger.info('Seed data inserted: 3 users (admin, author1, author2) with password: Password123!');
    } catch (err) {
        logger.error('Seed failed:', err);
        // Don't exit on seed failure, it's non-fatal
    } finally {
        await mongoose.connection.close();
    }
}

seed();
