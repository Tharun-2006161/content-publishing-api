# ContentFlow CMS - Content Publishing API

A production-ready Content Management System backend API with a React dashboard. Built with Node.js, Express, PostgreSQL, Redis, and Docker.

## 🏗️ Architecture

```
┌──────────────────────────────────────┐
│           Docker Compose             │
│                                      │
│  React Frontend (port 5173)          │
│         │                            │
│         ▼                            │
│  Express API (port 3000)             │
│    ├── JWT Auth Middleware           │
│    ├── Author Routes (protected)     │
│    ├── Public Routes (open)          │
│    └── Media Upload (multer)         │
│         │              │             │
│         ▼              ▼             │
│    PostgreSQL       Redis            │
│   (port 5432)     (port 6379)        │
│                                      │
│  Background Worker (every 60s)       │
│    └── Publishes scheduled posts     │
└──────────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# 1. Clone and copy env
cp .env.example .env

# 2. Start everything
docker-compose up --build

# 3. Access the app
# Frontend:  http://localhost:5173
# API:       http://localhost:3000
# API Docs:  http://localhost:3000/api-docs
```

**Demo credentials** (auto-seeded):
| Email | Password | Role |
|---|---|---|
| admin@example.com | Password123! | admin |
| author1@example.com | Password123! | author |
| author2@example.com | Password123! | author |

## 🔑 API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register author |
| POST | `/auth/login` | Public | Login, get JWT |
| GET | `/auth/me` | Bearer | Current user |

### Posts (Author — requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts?page=1&limit=10` | List own posts |
| POST | `/posts` | Create draft post |
| GET | `/posts/:id` | Get own post |
| PUT | `/posts/:id` | Update post (creates revision) |
| DELETE | `/posts/:id` | Delete post |
| POST | `/posts/:id/publish` | Publish immediately |
| POST | `/posts/:id/schedule` | Schedule for future |
| GET | `/posts/:id/revisions` | Version history |

### Public (No auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts/published` | List published posts (cached) |
| GET | `/posts/published/:id` | Get published post (cached) |
| GET | `/search?q=query` | Full-text search |

### Media (Author)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/media/upload` | Upload image |

## 📋 Content Lifecycle

```
Draft ──► Published
  │
  └──► Scheduled ──► Published (automatic, within 60s)
```

## 🧪 Running Tests

```bash
# With Docker
docker-compose run --rm -e NODE_ENV=test api npm test

# Locally (requires running postgres + redis)
cd backend && npm test
```

The test suite covers:
- Authentication (register, login, JWT validation)
- Post CRUD and lifecycle (draft → scheduled → published)
- Versioning (revision created on each update)
- Full-text search
- Background scheduler (idempotent)

## 🗄️ Database Schema

```sql
users         (id, username, email, password_hash, role, created_at, updated_at)
posts         (id, title, slug, content, status, author_id, scheduled_for, published_at, search_vector, ...)
post_revisions(id, post_id, title_snapshot, content_snapshot, revision_author_id, revision_timestamp)
```

Full-text search uses PostgreSQL `tsvector` generated column with GIN index.

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | cms_db | PostgreSQL database |
| `POSTGRES_USER` | cms_user | PostgreSQL user |
| `POSTGRES_PASSWORD` | cms_password | PostgreSQL password |
| `REDIS_URL` | redis://redis:6379 | Redis connection |
| `JWT_SECRET` | *(set this!)* | JWT signing secret |
| `JWT_EXPIRES_IN` | 7d | Token expiry |
| `WORKER_INTERVAL_MS` | 60000 | Scheduler interval |
| `VITE_API_URL` | http://localhost:3000 | Frontend API URL |

## 📁 Project Structure

```
content-publishing-api/
├── docker-compose.yml
├── submission.yml
├── .env.example
├── backend/
│   ├── Dockerfile          # API server
│   ├── Dockerfile.worker   # Background worker
│   ├── src/
│   │   ├── app.js          # Express app
│   │   ├── server.js       # Entry point
│   │   ├── config/         # DB, Redis, env config
│   │   ├── models/         # Sequelize models
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic, cache
│   │   ├── middleware/      # Auth, RBAC, errors
│   │   ├── utils/          # Logger, slugify
│   │   ├── db/             # Migrate, seed
│   │   └── worker/         # Scheduler
│   └── tests/              # Jest test suite
└── frontend/
    ├── Dockerfile
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── contexts/
    │   └── pages/
    └── nginx.conf
```

## 🔒 Security Features

- JWT tokens with expiry
- Passwords hashed with bcrypt (12 rounds)
- Parameterized SQL queries (no injection)
- Helmet.js security headers
- CORS configuration
- File type validation for uploads
- Authors can only modify their own posts

## ⚡ Performance Features

- Redis cache-aside for published posts (5min TTL)
- Cache invalidation on status change
- PostgreSQL GIN index for O(log n) full-text search
- Database indexes on `status`, `scheduled_for`, `published_at`, `author_id`
- Paginated endpoints (max 100 per page)
