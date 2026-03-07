FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy source
COPY src/ ./src/

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3000

# Start script waits for DB then migrates, seeds, and serves
CMD ["sh", "-c", "node src/db/migrate.js && node src/db/seed.js && node src/server.js"]
