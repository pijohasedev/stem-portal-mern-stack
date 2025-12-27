# Stage 1: Build Frontend
FROM node:18-alpine AS build-stage
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Run Backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# Salin hasil build dari Stage 1 ke folder yang boleh diakses backend
COPY --from=build-stage /app/frontend/dist ./frontend/dist

EXPOSE 3000
CMD ["npm", "start"]