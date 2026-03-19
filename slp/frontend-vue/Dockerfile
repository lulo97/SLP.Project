FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_BACKEND_URL
ARG VITE_TTS_URL
ARG VITE_FILESTORAGE_URL

ENV VITE_API_BACKEND_URL=$VITE_API_BACKEND_URL
ENV VITE_TTS_URL=$VITE_TTS_URL
ENV VITE_FILESTORAGE_URL=$VITE_FILESTORAGE_URL

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ── runtime ─────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 3002

CMD ["serve", "-s", "dist", "-l", "3002"]