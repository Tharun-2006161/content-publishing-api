const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { User } = require('../models');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('author').default('author'),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

/**
 * @route POST /auth/register
 * @desc Register a new author
 * @access Public
 */
router.post('/register', async (req, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);

    const existing = await User.findOne({ where: { email: value.email } });
    if (existing) throw new AppError('Email already registered', 409);

    const existingUsername = await User.findOne({ where: { username: value.username } });
    if (existingUsername) throw new AppError('Username already taken', 409);

    const password_hash = await bcrypt.hash(value.password, 12);
    const user = await User.create({
        username: value.username,
        email: value.email,
        password_hash,
        role: value.role || 'author',
    });

    const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({
        success: true,
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
});

/**
 * @route POST /auth/login
 * @desc Authenticate and get JWT token
 * @access Public
 */
router.post('/login', async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);

    const user = await User.findOne({ where: { email: value.email } });
    if (!user) throw new AppError('Invalid email or password', 401);

    const isValid = await bcrypt.compare(value.password, user.password_hash);
    if (!isValid) throw new AppError('Invalid email or password', 401);

    const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    res.json({
        success: true,
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
});

/**
 * @route GET /auth/me
 * @desc Get current authenticated user
 * @access Private
 */
router.get('/me', require('../middleware/auth').verifyToken, async (req, res) => {
    const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'username', 'email', 'role', 'created_at'],
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, user });
});

module.exports = router;
