const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
// import cors from 'cors'

const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/authRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const participantRouteons = require('./routes/participantRoutes');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: true, // Allow all origins (or specify array of allowed origins)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware to attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS - Allow all origins for local network access
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/participants', participantRouteons);

// Error handler middleware
app.use(errorHandler);

// Track socket-to-participant mapping
const socketParticipantMap = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  // Join exercise room
  socket.on('joinExercise', (exerciseId) => {
    socket.join(`exercise-${exerciseId}`);
    console.log(`📥 Socket ${socket.id} joined exercise-${exerciseId}`);
  });

  // Join participant room and track mapping
  socket.on('joinAsParticipant', async (participantId) => {
    socket.join(`participant-${participantId}`);
    console.log(`📥 Socket ${socket.id} joined participant-${participantId}`);

    // Store socket-to-participant mapping
    socketParticipantMap.set(socket.id, participantId);

    // Update socketId and handle reconnection
    try {
      const Participant = require('./models/Participant');
      const participant = await Participant.findOne({ participantId });

      if (participant) {
        participant.socketId = socket.id;

        // Auto-restore if participant had left (reconnection)
        if (participant.status === 'left') {
          participant.status = 'active';
          console.log(`🔄 Participant ${participant.name} (${participantId}) reconnected — status restored to active`);

          // Notify facilitator about rejoin
          io.to(`exercise-${participant.exercise}`).emit('participantRejoined', {
            participantId,
            name: participant.name,
            status: 'active'
          });

          // Notify participant that they've been restored
          socket.emit('reconnected', { status: 'active' });
        }

        await participant.save();
      }
    } catch (err) {
      console.error('Failed to update participant on connect:', err.message);
    }
  });

  // Handle disconnection - update participant status
  socket.on('disconnect', async () => {
    console.log('❌ Client disconnected:', socket.id);

    const participantId = socketParticipantMap.get(socket.id);
    if (participantId) {
      socketParticipantMap.delete(socket.id);

      try {
        const Participant = require('./models/Participant');
        const participant = await Participant.findOne({ participantId });

        if (participant && participant.status === 'active') {
          participant.status = 'left';
          participant.socketId = null;
          await participant.save();

          console.log(`👋 Participant ${participant.name} (${participantId}) marked as left`);

          // Notify facilitator
          io.to(`exercise-${participant.exercise}`).emit('participantDisconnected', {
            participantId,
            name: participant.name,
            status: 'left'
          });
        }
      } catch (err) {
        console.error('Failed to update participant on disconnect:', err.message);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(5000, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});