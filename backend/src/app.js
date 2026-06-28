require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const { connectRedis } = require('./config/redis');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const publicRoutes = require('./routes/public');
const searchRoutes = require('./routes/search');
const mediaRoutes = require('./routes/media');

const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin: process.env.FRONTEND_URL || true, // 'true' reflects the request origin
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(config.upload.dir));

// Swagger documentation
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Content Publishing API',
            version: '1.0.0',
            description: 'A production-ready CMS API with content versioning, scheduled publishing, and full-text search',
        },
        servers: [{ url: `http://localhost:${config.port}`, description: 'Development server' }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
        },
    },
    apis: ['./src/routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// Route mounting
// IMPORTANT: /posts/published MUST be mounted BEFORE /posts to avoid :id capturing 'published'
app.use('/posts/published', publicRoutes);
app.use('/search', searchRoutes);
app.use('/auth', authRoutes);
app.use('/posts', postsRoutes);
app.use('/media', mediaRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'content-publishing-api' });
});

// 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize Redis on startup
connectRedis().catch(err => logger.error('Redis init error:', err.message));

module.exports = app;
