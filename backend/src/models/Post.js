const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Post = sequelize.define('Post', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING(600),
        allowNull: false,
        unique: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    },
    status: {
        type: DataTypes.ENUM('draft', 'scheduled', 'published'),
        allowNull: false,
        defaultValue: 'draft',
    },
    author_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    scheduled_for: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    published_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'posts',
    underscored: true,
    timestamps: true,
    indexes: [
        { unique: true, fields: ['slug'] },
        { fields: ['author_id'] },
        { fields: ['status'] },
        { fields: ['scheduled_for'] },
        { fields: ['published_at'] },
        // Full-text search index created in migration
    ],
});

module.exports = Post;
