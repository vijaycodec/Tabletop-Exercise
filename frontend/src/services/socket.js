import io from 'socket.io-client';

// Dynamically build socket URL
// - Production (HTTPS): connect to same origin so Nginx proxies /socket.io/ to backend
// - Local dev / LAN (HTTP): connect directly to backend port 5000
const getSocketUrl = () => {
  if (window.location.protocol === 'https:') {
    return window.location.origin; // e.g. https://ttx.cyberpull.space
  }
  return `http://${window.location.hostname}:5000`;
};

class SocketService {
  constructor() {
    this.socket = null;
    this.exerciseRooms = new Set();
    this.participantRooms = new Set();
    this.isConnected = false;
  }

  connect() {
    if (!this.socket) {
      const SOCKET_URL = getSocketUrl();
      console.log('Connecting to socket server at', SOCKET_URL);
      const isProduction = window.location.protocol === 'https:';
      this.socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        transports: ['polling', 'websocket'],
        upgrade: true
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected successfully with ID:', this.socket.id);
        this.isConnected = true;

        // Rejoin all rooms after reconnection
        this.exerciseRooms.forEach(exerciseId => {
          console.log('Rejoining exercise room:', exerciseId);
          this.socket.emit('joinExercise', exerciseId);
        });

        this.participantRooms.forEach(participantId => {
          console.log('Rejoining participant room:', participantId);
          this.socket.emit('joinAsParticipant', participantId);
        });
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.isConnected = false;
      });
    }
    return this.socket;
  }

  joinExercise(exerciseId) {
    this.exerciseRooms.add(exerciseId);
    if (this.socket && this.isConnected) {
      console.log('📥 Joining exercise room:', exerciseId);
      this.socket.emit('joinExercise', exerciseId);
    } else {
      console.warn('⚠️ Socket not connected, will join room when connected');
    }
  }

  joinAsParticipant(participantId) {
    this.participantRooms.add(participantId);
    if (this.socket && this.isConnected) {
      console.log('📥 Joining as participant:', participantId);
      this.socket.emit('joinAsParticipant', participantId);
    } else {
      console.warn('⚠️ Socket not connected, will join room when connected');
    }
  }

  on(event, callback) {
    if (this.socket) {
      console.log('👂 Setting up listener for event:', event);
      this.socket.on(event, callback);
    } else {
      console.error('❌ Cannot set up listener - socket not initialized');
    }
  }

  off(event, callback) {
    if (this.socket) {
      console.log('🔇 Removing listener for event:', event);
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.error('❌ Cannot emit - socket not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.exerciseRooms.clear();
      this.participantRooms.clear();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export default new SocketService();