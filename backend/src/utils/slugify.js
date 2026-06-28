const slugifyLib = require('slugify');
const { Post } = require('../models');

/**
 * Generate a unique slug from a title.
 * Appends numeric suffix if collision detected.
 */
async function generateUniqueSlug(title, excludeId = null) {
    const baseSlug = slugifyLib(title, {
        lower: true,
        strict: true,
        trim: true,
    });

    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const query = { slug };
        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        const existing = await Post.findOne(query);

        if (!existing) {
            return slug;
        }

        slug = `${baseSlug}-${counter}`;
        counter++;
    }
}

module.exports = { generateUniqueSlug };
