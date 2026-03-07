const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PostRevision = sequelize.define('PostRevision', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    post_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    title_snapshot: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    content_snapshot: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    },
    revision_author_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    revision_timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'post_revisions',
    underscored: true,
    timestamps: false,
    indexes: [
        { fields: ['post_id'] },
        { fields: ['revision_author_id'] },
        { fields: ['revision_timestamp'] },
    ],
});

module.exports = PostRevision;
