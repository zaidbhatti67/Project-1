# Step 1: Build the Vite frontend
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Set up the backend
FROM node:18-slim
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/ ./server/
COPY --from=builder /app/dist ./dist

# Generate Prisma Client and push schema (SQLite)
RUN cd server && npx prisma generate && npx prisma db push

# Hugging Face Spaces runs on port 7860
ENV PORT=7860
EXPOSE 7860

WORKDIR /app/server
CMD ["node", "server.js"]
