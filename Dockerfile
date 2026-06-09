FROM node:22-alpine

WORKDIR /app

# Copy server
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm install --production

WORKDIR /app
COPY server/ ./server/
COPY client/dist/ ./client/dist/

WORKDIR /app/server
EXPOSE 3001

# 确保数据目录可写
RUN mkdir -p /app/server/data && chmod 777 /app/server/data

CMD ["node", "src/index.js"]
