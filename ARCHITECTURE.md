# Architecture - ContentFlow CMS

## System Overview

ContentFlow CMS is a multi-service application containerized with Docker Compose. It consists of five independent services that communicate over a shared Docker network.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        cms_network (bridge)                      │
│                                                                  │
│  ┌──────────────────┐       ┌──────────────────────────────┐    │
│  │   React Frontend  │       │      Express API Server       │    │
│  │   (Nginx :80)     │──────▶│      (Node.js :3000)          │    │
│  │                  │       │                               │    │
│  │  • Login/Register │       │  Routes:                      │    │
│  │  • Post Dashboard │       │  • POST /auth/*               │    │
│  │  • Post Editor    │       │  • GET|POST|PUT|DELETE /posts  │    │
│  │  • Media Upload   │       │  • GET /posts/published        │    │
│  │  • Public Blog    │       │  • GET /search                │    │
│  │  • Search UI      │       │  • POST /media/upload         │    │
│  └──────────────────┘       └─────────────┬────────────────┘    │
│                                           │                      │
│                              ┌────────────┼────────────┐         │
│                              ▼            ▼            ▼         │
│                    ┌──────────────┐ ┌──────────┐ ┌──────────┐   │
│                    │  PostgreSQL  │ │  Redis   │ │  Uploads │   │
│                    │  :5432       │ │  :6379   │ │  Volume  │   │
│                    │              │ │          │ │          │   │
│                    │ Tables:      │ │ Cache:   │ │ /uploads │   │
│                    │ • users      │ │ posts:*  │ │ (images) │   │
│                    │ • posts      │ │ ttl=5min │ │          │   │
│                    │ • revisions  │ │          │ │          │   │
│                    └──────────────┘ └──────────┘ └──────────┘   │
│                              ▲                                   │
│                    ┌─────────┴─────────┐                        │
│                    │  Background Worker │                        │
│                    │  (Node.js)         │                        │
│                    │                   │                        │
│                    │  Runs every 60s:  │                        │
│                    │  SELECT scheduled │                        │
│                    │  posts WHERE      │                        │
│                    │  scheduled_for    │                        │
│                    │  <= NOW()         │                        │
│                    │  → UPDATE status  │                        │
│                    │    = 'published'  │                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Image | Port | Responsibility |
|---------|-------|------|----------------|
| `db` | postgres:16-alpine | 5432 | Persistent storage |
| `redis` | redis:7-alpine | 6379 | Cache + session store |
| `api` | Custom Node.js | 3000 | REST API server |
| `worker` | Custom Node.js | — | Scheduled post publisher |
| `frontend` | Custom Nginx | 5173→80 | React SPA |

## Data Flow

### Authentication Flow
```
Client → POST /auth/login → bcrypt.compare → JWT sign → response
Client → Subsequent requests: Authorization: Bearer <JWT>
API Middleware: jwt.verify → attach req.user → route handler
```

### Post Update + Versioning (Transactional)
```
PUT /posts/:id
  ├── BEGIN TRANSACTION
  │   ├── SELECT post (FOR UPDATE lock)
  │   ├── INSERT into post_revisions (old title + content)
  │   └── UPDATE posts (new title + content + new slug)
  ├── COMMIT
  └── Redis: DEL post:published:id, DEL posts:published:*:*
```

### Scheduled Publishing (Background Worker)
```
Node-schedule (every 60s)
  ├── BEGIN TRANSACTION
  │   └── UPDATE posts
  │       SET status='published', published_at=NOW()
  │       WHERE status='scheduled' AND scheduled_for <= NOW()
  ├── COMMIT (idempotent - already-published posts not matched)
  └── Redis: DEL posts:published:*:* (cache invalidation)
```

### Cache-Aside Pattern
```
GET /posts/published/:id
  ├── Redis GET post:published:{id}
  │   ├── HIT → return cached JSON
  │   └── MISS → PostgreSQL SELECT → Redis SETEX (300s) → return
```

## Database Design Decisions

### Full-Text Search
Uses PostgreSQL `tsvector` as a **generated stored column**:
```sql
search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))
) STORED;
```
Backed by a GIN index for sub-100ms query times. The `plainto_tsquery` function normalizes search input (stemming, stop words).

### Indexes
```sql
idx_posts_status         -- Worker: WHERE status='scheduled'
idx_posts_scheduled_for  -- Worker: AND scheduled_for <= NOW()
idx_posts_published_at   -- Public listing: ORDER BY published_at
idx_posts_author_id      -- Author CRUD: WHERE author_id=?
idx_posts_search_vector  -- GIN: search_vector @@ query
idx_revisions_post_id    -- Foreign key traversal
```

### Slug Uniqueness
Auto-generated via `slugify(title)`. If collision detected, a numeric counter is appended (`my-post`, `my-post-1`, `my-post-2`...) using optimistic DB checks.

## Security Design

- **JWT**: HS256 signed, configurable expiry (default 7d)
- **Passwords**: bcrypt with 12 salt rounds
- **SQL Injection**: Sequelize parameterized queries throughout
- **Authorization**: Author-scoped queries (`WHERE author_id = req.user.id`)
- **File Uploads**: Type whitelist (MIME check) + size limit (10MB)
- **Headers**: Helmet.js (CSP, HSTS, XSS protection)

## Scalability Considerations

- **Stateless API**: No server-side sessions; JWT enables horizontal scaling
- **Redis SETEX**: Cache TTL auto-expires stale data even if invalidation misses
- **Worker idempotency**: The SQL `WHERE status='scheduled'` clause prevents double-publishing
- **Connection pooling**: Sequelize pool (`max: 10`) prevents DB connection exhaustion
