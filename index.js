require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kanban';

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Routes
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CodeRush Kanban Backend',
    database: mongoStatus,
    storageFallback: mongoStatus !== 'connected' ? 'active (persistent file storage)' : 'inactive',
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'CodeRush Hackathon — Smart Kanban Task Board API',
    endpoints: {
      tasks: '/api/tasks',
      health: '/api/health',
    },
  });
});

// Connect to MongoDB gracefully
console.log('Connecting to MongoDB at:', MONGO_URI);
mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 2500,
  })
  .then(() => {
    console.log('✓ Successfully connected to MongoDB');
  })
  .catch((err) => {
    console.warn('! MongoDB connection failed/offline. Falling back to persistent file storage engine.');
    console.warn('  Reason:', err.message);
  });

app.listen(PORT, () => {
  console.log(`✓ Server is running on port ${PORT}`);
});
