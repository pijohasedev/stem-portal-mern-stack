# Guna imej Node.js sebagai asas
FROM node:18-alpine

# Set folder kerja dalam kontena
WORKDIR /app

# Salin fail package untuk install library
COPY package*.json ./

# Install library (dependencies)
RUN npm install

# Salin semua kod projek anda ke dalam kontena
COPY . .

# Beritahu port mana aplikasi anda guna (biasanya 3000)
EXPOSE 3000

# Arahan untuk mulakan aplikasi
CMD ["npm", "start"]