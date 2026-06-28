const fs = require('fs');
const path = require('path');

const files = {
    'tests/setup/globalSetup.js': () => `const { connectDB, mongoose } = require('../../src/config/database');

module.exports = async () => {
    // Setup for MongoDB
    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cms_test_db';
    
    await connectDB();
    await mongoose.connection.dropDatabase();
    
    // Create necessary collections and indexes if needed (Mongoose auto-creates indexes, but we can enforce)
    const { User, Post, PostRevision } = require('../../src/models');
    await User.init();
    await Post.init();
    await PostRevision.init();
    
    await mongoose.connection.close();
};`,
    'tests/setup/globalTeardown.js': () => `const { connectDB, mongoose } = require('../../src/config/database');

module.exports = async () => {
    // Teardown for MongoDB
    await connectDB();
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
};`,
    'tests/search.test.js': (content) => {
        let text = content.replace(/const sequelize = require\('\.\.\/src\/config\/database'\);/g, 'const { connectDB, mongoose } = require(\'../src/config/database\');')
            .replace(/await sequelize\.query\(`DELETE FROM posts WHERE author_id = '\$\{userId\}'`\);/g, 'const { Post, User } = require(\'../src/models\'); await Post.deleteMany({ author_id: userId });')
            .replace(/await sequelize\.query\(`DELETE FROM users WHERE id = '\$\{userId\}'`\);/g, 'await User.deleteMany({ _id: userId });')
            .replace(/await sequelize\.close\(\);/g, 'await mongoose.connection.close();');
        return text;
    },
    'tests/scheduler.test.js': (content) => {
        let text = content.replace(/const sequelize = require\('\.\.\/src\/config\/database'\);/g, 'const { connectDB, mongoose } = require(\'../src/config/database\');')
            .replace(/await sequelize\.query\(`DELETE FROM posts WHERE author_id = '\$\{userId\}'`\);/g, 'const { Post, User } = require(\'../src/models\'); await Post.deleteMany({ author_id: userId });')
            .replace(/await sequelize\.query\(`DELETE FROM users WHERE id = '\$\{userId\}'`\);/g, 'await User.deleteMany({ _id: userId });')
            .replace(/await sequelize\.close\(\);/g, 'await mongoose.connection.close();')
            .replace(/await sequelize\.query\(\s*`UPDATE posts SET status = 'scheduled', scheduled_for = NOW\(\) - INTERVAL '1 minute' WHERE id = :id`,\s*\{ replacements: \{ id: postId \} \}\s*\);/g, 
                `await Post.updateOne({ _id: postId }, { $set: { status: 'scheduled', scheduled_for: new Date(Date.now() - 60000) } });`);
        return text;
    },
    'tests/posts.test.js': (content) => {
        let text = content.replace(/const sequelize = require\('\.\.\/src\/config\/database'\);/g, 'const { connectDB, mongoose } = require(\'../src/config/database\');')
            .replace(/await sequelize\.query\(`DELETE FROM posts WHERE author_id = '\$\{userId\}'`\);/g, 'const { Post, User } = require(\'../src/models\'); await Post.deleteMany({ author_id: userId });')
            .replace(/await sequelize\.query\(`DELETE FROM users WHERE id = '\$\{userId\}'`\);/g, 'await User.deleteMany({ _id: userId });')
            .replace(/await sequelize\.close\(\);/g, 'await mongoose.connection.close();');
        return text;
    },
    'tests/auth.test.js': (content) => {
        let text = content.replace(/const sequelize = require\('\.\.\/src\/config\/database'\);/g, 'const { connectDB, mongoose } = require(\'../src/config/database\');')
            .replace(/await sequelize\.query\(`DELETE FROM users WHERE email = '\$\{testUser\.email\}'`\);/g, 'const { User } = require(\'../src/models\'); await User.deleteMany({ email: testUser.email });')
            .replace(/await sequelize\.close\(\);/g, 'await mongoose.connection.close();');
        return text;
    }
};

for (const [file, replacer] of Object.entries(files)) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = typeof replacer === 'function' ? replacer(content) : replacer;
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + file);
    }
}
