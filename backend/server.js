// In backend/server.js

// ## 1. ALL IMPORTS GO AT THE TOP ##
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const initiativesRouter = require('./routes/initiatives');
const usersRouter = require('./routes/users'); // All require statements are now grouped here
const reportsRouter = require('./routes/reports'); // <-- IMPORT the new report router
const policiesRouter = require('./routes/policies'); // <--V2 IMPORT the new policies router
const terasRouter = require('./routes/teras'); // <--V2 IMPORT the new teras router
const strategiesRouter = require('./routes/strategies'); // <--V2 IMPORT the new strategies router
const treeRouter = require('./routes/tree');
const departmentRoutes = require('./routes/department.js');


// ## 2. DATABASE CONNECTION ##
const dbURI = 'mongodb://localhost:27017/stem-portal';
mongoose.connect(dbURI)
  .then(() => console.log('✅ Connected to MongoDB database'))
  .catch(err => console.error('❌ Could not connect to MongoDB:', err));

// ## 3. APP AND PORT INITIALIZATION ##
const app = express();
const PORT = 3001;

// ## 4. MIDDLEWARE ##
app.use(cors());
app.use(express.json());

// ## 5. ROUTES ##
app.get('/', (req, res) => {
  res.send('STEM Portal Backend is running!');
});
// Use the routers for specific API paths
app.use('/api/initiatives', initiativesRouter);
app.use('/api/users', usersRouter); // The user router is now correctly placed here
app.use('/api/reports', reportsRouter); // <-- USE the new report router
app.use('/api/policies', policiesRouter); // <--V2 USE the new policies router
app.use('/api/teras', terasRouter); // <--V2 USE the new teras router
app.use('/api/strategies', strategiesRouter); // <--V2 USE the new strategies router
app.use('/api/tree', treeRouter);
app.use('/api/departments', departmentRoutes);


// ## 6. START THE SERVER (MUST BE LAST) ##
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});