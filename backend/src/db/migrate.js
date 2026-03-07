const sequelize = require('../config/database');
const logger = require('../utils/logger');

async function migrate() {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established.');

        // Create ENUM types first (PostgreSQL)
        const qi = sequelize.getQueryInterface();

        // Create user_role enum
        await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('author', 'admin');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

        // Create post_status enum
        await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

        // Users table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'author',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT users_email_unique UNIQUE (email),
        CONSTRAINT users_username_unique UNIQUE (username)
      );
    `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);`);

        // Posts table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(600) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        status post_status NOT NULL DEFAULT 'draft',
        author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scheduled_for TIMESTAMP WITH TIME ZONE,
        published_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT posts_slug_unique UNIQUE (slug)
      );
    `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts (author_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_posts_status ON posts (status);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_posts_scheduled_for ON posts (scheduled_for);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts (published_at);`);

        // Full-text search GIN index
        await sequelize.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))) STORED;
    `);
        await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN (search_vector);
    `);

        // Post revisions table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS post_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        title_snapshot VARCHAR(500) NOT NULL,
        content_snapshot TEXT NOT NULL DEFAULT '',
        revision_author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        revision_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_revisions_post_id ON post_revisions (post_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_revisions_timestamp ON post_revisions (revision_timestamp);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_revisions_author ON post_revisions (revision_author_id);`);

        logger.info('Database migration completed successfully.');
    } catch (err) {
        logger.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

migrate();
