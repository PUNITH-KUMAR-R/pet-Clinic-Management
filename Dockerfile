# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency configuration files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the frontend assets and compile the server.ts backend
RUN npm run build

# Stage 2: Production execution stage
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package.json
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built assets and compiled server from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist

# Switch to non-root user
USER node

# Expose Port 3000 (Express server default)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
