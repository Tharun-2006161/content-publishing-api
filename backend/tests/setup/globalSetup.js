const { connectDB, mongoose } = require('../../src/config/database');

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
};