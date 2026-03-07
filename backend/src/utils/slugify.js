const slugifyLib = require('slugify');
const sequelize = require('../config/database');

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
        let query = `SELECT id FROM posts WHERE slug = :slug`;
        const replacements = { slug };

        if (excludeId) {
            query += ` AND id != :excludeId`;
            replacements.excludeId = excludeId;
        }

        const [rows] = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT,
        });

        if (!rows) {
            return slug;
        }

        slug = `${baseSlug}-${counter}`;
        counter++;
    }
}

module.exports = { generateUniqueSlug };
