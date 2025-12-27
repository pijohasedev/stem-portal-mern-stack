FROM node:18-alpine
WORKDIR /app

# Salin fail package dari root
COPY package*.json ./

# Install dependencies (Node akan install library yang disenaraikan di root package.json)
RUN npm install

# Salin semua folder termasuk folder 'backend' dan 'frontend'
COPY . .

EXPOSE 3000

# Jalankan server dari folder backend
CMD ["npm", "start"]