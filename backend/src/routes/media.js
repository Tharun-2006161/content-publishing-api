const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const config = require('../config');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { AppError } = require('../middleware/errorHandler');

// Ensure upload directory exists
const uploadDir = config.upload.dir;
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    if (config.upload.allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError(`Unsupported file type: ${file.mimetype}. Allowed: ${config.upload.allowedTypes.join(', ')}`, 400));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: config.upload.maxSizeMb * 1024 * 1024 },
});

/**
 * @route POST /media/upload
 * @desc Upload a media file (images only)
 * @access Private (author)
 */
router.post(
    '/upload',
    verifyToken,
    authorize('author', 'admin'),
    upload.single('file'),
    (req, res) => {
        if (!req.file) {
            throw new AppError('No file uploaded', 400);
        }

        const protocol = req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

        res.status(201).json({
            success: true,
            media: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                url: fileUrl,
                path: `/uploads/${req.file.filename}`,
            },
        });
    }
);

module.exports = router;
