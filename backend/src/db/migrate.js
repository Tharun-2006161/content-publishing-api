const { connectDB, mongoose } = require('../config/database');
const logger = require('../utils/logger');
(async () => {
    await connectDB();
    logger.info('MongoDB migration complete (schema is dynamic, no action needed).');
    await mongoose.connection.close();
    process.exit(0);
})();