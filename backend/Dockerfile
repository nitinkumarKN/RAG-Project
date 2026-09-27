FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY uploads ./uploads

EXPOSE 5000
CMD ["npm", "start"]
