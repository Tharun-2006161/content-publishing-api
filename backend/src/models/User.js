const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('author', 'admin'),
        allowNull: false,
        defaultValue: 'author',
    },
}, {
    tableName: 'users',
    underscored: true,
    timestamps: true,
    indexes: [
        { unique: true, fields: ['email'] },
        { unique: true, fields: ['username'] },
        { fields: ['role'] },
    ],
});

module.exports = User;
