require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/auth');

if (!process.env.JWT_SECRET) throw new Error('Set JWT_SECRET in server/.env');
const app = express();
app.use(helmet(), cors({ origin: process.env.CLIENT_URL }), express.json({ limit: '100kb' }), morgan('dev'));
app.use('/api', require('./routes'));
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 5000, () => console.log('API ready on port', process.env.PORT || 5000)))
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
