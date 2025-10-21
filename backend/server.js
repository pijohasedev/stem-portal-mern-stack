// In backend/server.js

// ## 1. ALL IMPORTS GO AT THE TOP ##
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
// Tambahkan dotenv untuk DEVELOPMENT (di localhost) - TIDAK digunakan di Render production
const dotenv = require('dotenv');
const initiativesRouter = require('./routes/initiatives');
const usersRouter = require('./routes/users');
const reportsRouter = require('./routes/reports');
const policiesRouter = require('./routes/policies');
const terasRouter = require('./routes/teras');
const strategiesRouter = require('./routes/strategies');
const treeRouter = require('./routes/tree');
const departmentRoutes = require('./routes/department');

// PENTING: Untuk localhost, dotenv.config() diperlukan untuk membaca .env
// Di Render, pemboleh ubah persekitaran diinject secara automatik
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}


// ## 2. DATABASE CONNECTION ##
// GUNAKAN process.env.MONGO_URI (yang anda set di Render)
// JANGAN guna URL 'mongodb://localhost:27017/stem-portal'
const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/stem-portal';

mongoose.connect(dbURI)
  .then(() => console.log('✅ Connected to MongoDB database'))
  .catch(err => console.error('❌ Could not connect to MongoDB:', err));


// ## 3. APP AND PORT INITIALIZATION ##
const app = express();
const PORT = process.env.PORT || 3001;

// Tambahkan URL Frontend Vercel anda di sini!
const allowedOrigins = [
  'https://stem-portal.vercel.app',
  'https://stem-portal-mern-stack.vercel.app', // URL Vercel anda
  'http://localhost:5173', // Contoh untuk development tempatan Vite
];

const corsOptions = {
  origin: function (origin, callback) {
    // Membenarkan permintaan tanpa origin (cth., mobile apps, atau permintaan postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};


// ## 4. MIDDLEWARE ##
app.use(cors(corsOptions));
app.use(express.json());

// ## 5. ROUTES ##
app.get('/', (req, res) => {
  res.send('STEM Portal Backend is running!');
});

// Use the routers for specific API paths
app.use('/api/initiatives', initiativesRouter);
app.use('/api/users', usersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/policies', policiesRouter);
app.use('/api/teras', terasRouter);
app.use('/api/strategies', strategiesRouter);
app.use('/api/tree', treeRouter);
app.use('/api/departments', departmentRoutes);


// ## 6. START THE SERVER (MUST BE LAST) ##
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
