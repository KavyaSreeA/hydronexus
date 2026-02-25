const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import and initialize in-memory database
const connectDB = require('./utils/database');
connectDB();

// Import routes
const authRoutes = require('./routes/auth');
const drainageRoutes = require('./routes/drainage');
const alertRoutes = require('./routes/alerts');
const adminRoutes = require('./routes/admin');
const citizenRoutes = require('./routes/citizen');

// Import middleware
const authMiddleware = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// Import controllers
const alertController = require('./controllers/alertController');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Security middleware - configure helmet to allow inline scripts
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Store io instance for use in controllers
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/drainage', drainageRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', authMiddleware.requireRole(['admin']), adminRoutes);
app.use('/api/citizen', citizenRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/citizen', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'citizen.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/monitoring', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'monitoring.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join rooms based on user type
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  // Handle real-time drainage data
  socket.on('drainage-update', (data) => {
    // Broadcast to admin users
    socket.to('admin').emit('drainage-data', data);
  });

  // Handle citizen reports
  socket.on('citizen-report', (data) => {
    // Process and broadcast to admin
    socket.to('admin').emit('new-report', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!' 
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌊 HydroNexus server running on port ${PORT}`);
  console.log(`📱 Citizen Interface: http://localhost:${PORT}/citizen`);
  console.log(`🏛️ Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`📊 Monitoring: http://localhost:${PORT}/monitoring`);
  
  // Initialize alert monitoring system
  alertController.initializeMonitoring(io);
});