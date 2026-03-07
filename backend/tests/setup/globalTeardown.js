const sequelize = require('../../src/config/database');

module.exports = async function globalTeardown() {
    try {
        await sequelize.authenticate();
        // Clean up test data
        await sequelize.query('DROP TABLE IF EXISTS post_revisions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS posts CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS users CASCADE;');
        await sequelize.query('DROP TYPE IF EXISTS post_status;');
        await sequelize.query('DROP TYPE IF EXISTS user_role;');
        await sequelize.close();
    } catch (err) {
        // Ignore teardown errors
    }
};
