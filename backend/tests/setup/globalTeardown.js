const { connectDB, mongoose } = require('../../src/config/database');

module.exports = async () => {
    // Teardown for MongoDB
    await connectDB();
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
};