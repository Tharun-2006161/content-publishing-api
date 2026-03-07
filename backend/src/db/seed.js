const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const logger = require('../utils/logger');

async function seed() {
    try {
        await sequelize.authenticate();

        // Check if already seeded
        const [rows] = await sequelize.query("SELECT COUNT(*) as count FROM users");
        if (parseInt(rows[0].count) > 0) {
            logger.info('Database already seeded, skipping.');
            await sequelize.close();
            return;
        }

        const passwordHash = await bcrypt.hash('Password123!', 12);

        await sequelize.query(`
      INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
      VALUES
        (gen_random_uuid(), 'admin', 'admin@example.com', '${passwordHash}', 'admin', NOW(), NOW()),
        (gen_random_uuid(), 'author1', 'author1@example.com', '${passwordHash}', 'author', NOW(), NOW()),
        (gen_random_uuid(), 'author2', 'author2@example.com', '${passwordHash}', 'author', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);

        logger.info('Seed data inserted: 3 users (admin, author1, author2) with password: Password123!');
    } catch (err) {
        logger.error('Seed failed:', err);
        // Don't exit on seed failure, it's non-fatal
    } finally {
        await sequelize.close();
    }
}

seed();
