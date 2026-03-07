process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'cms_db';
process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'cms_user';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'cms_password';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.UPLOAD_DIR = '/tmp/cms_test_uploads';

const sequelize = require('../../src/config/database');
const { connectRedis } = require('../../src/config/redis');

module.exports = async function globalSetup() {
    // Run migrations for test DB
    await sequelize.authenticate();

    await sequelize.query(`
    DO $$ BEGIN CREATE TYPE user_role AS ENUM ('author', 'admin');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
    await sequelize.query(`
    DO $$ BEGIN CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

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

    await sequelize.query(`
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))) STORED;
  `);

    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_posts_status ON posts (status);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN (search_vector);`);

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

    await sequelize.close();
};
