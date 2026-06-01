# Use official Node runtime as base
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy dependency configs
COPY package.json ./

# Install packages
RUN npm install

# Copy application files
COPY . .

# Build the Next.js application
RUN npm run build

# Expose Next.js port
EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "run", "start"]
