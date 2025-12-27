const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const Report = require('./models/Report');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/random-video-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', require('./routes'));

// Socket.io logic for user matching and signaling
let waitingQueue = [];

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('find-match', (interests = []) => {
    // Add to waiting queue with timestamp
    waitingQueue.push({ socket, interests, joinedAt: Date.now() });

    // Try to match
    matchUsers();
  });

  socket.on('skip', () => {
    // Remove from current room if in one
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-disconnected', socket.id);
      socket.leave(socket.roomId);
      delete socket.roomId;
    }
    // Add back to queue
    waitingQueue.push({ socket, interests: socket.interests || [], joinedAt: Date.now() });
    matchUsers();
  });

  socket.on('offer', (data) => {
    socket.to(socket.roomId).emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.to(socket.roomId).emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.to(socket.roomId).emit('ice-candidate', data);
  });

  socket.on('join-room', (roomId, userId, interest) => {
    socket.join(roomId);
    socket.roomId = roomId;
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room && room.size === 2) {
      const users = Array.from(room);
      const partnerId = users.find(id => id !== socket.id);
      socket.emit('user-connected', partnerId);
      socket.to(roomId).emit('user-connected', socket.id);
    }
  });

  socket.on('chat-message', (message) => {
    if (socket.roomId) {
      // Basic profanity filtering
      const profanities = ['fuck', 'shit', 'damn', 'bitch', 'asshole']; // Add more as needed
      let filteredMessage = message;
      profanities.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        filteredMessage = filteredMessage.replace(regex, '*'.repeat(word.length));
      });
      socket.to(socket.roomId).emit('chat-message', filteredMessage);
    }
  });

  socket.on('report', async (data) => {
    const { reportedId, reason } = data;
    const reporterId = socket.id;
    try {
      const report = new Report({
        reporterId,
        reportedId,
        reason
      });
      await report.save();
      console.log('Report saved:', report);
    } catch (error) {
      console.error('Error saving report:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    // Remove from queue
    waitingQueue = waitingQueue.filter(item => item.socket !== socket);
    // Notify partner if in room
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-disconnected', socket.id);
    }
  });
});

function matchUsers() {
  if (waitingQueue.length >= 2) {
    let user1, user2;

    // Try to find a match with common interests
    for (let i = 0; i < waitingQueue.length; i++) {
      for (let j = i + 1; j < waitingQueue.length; j++) {
        const u1 = waitingQueue[i];
        const u2 = waitingQueue[j];
        const commonInterests = u1.interests.filter(interest => u2.interests.includes(interest));
        if (commonInterests.length > 0) {
          user1 = u1;
          user2 = u2;
          waitingQueue.splice(j, 1);
          waitingQueue.splice(i, 1);
          break;
        }
      }
      if (user1 && user2) break;
    }

    // If no common interests, check for timeout (30 seconds) and pair randomly
    if (!user1 || !user2) {
      const now = Date.now();
      const timedOutUsers = waitingQueue.filter(user => now - user.joinedAt > 30000);
      if (timedOutUsers.length >= 2) {
        user1 = timedOutUsers.shift();
        user2 = timedOutUsers.shift();
        waitingQueue = waitingQueue.filter(user => user !== user1 && user !== user2);
      } else if (waitingQueue.length >= 2) {
        // Pair the two oldest users if no timeout yet
        user1 = waitingQueue.shift();
        user2 = waitingQueue.shift();
      }
    }

    if (user1 && user2) {
      const roomId = `room_${user1.socket.id}_${user2.socket.id}`;
      user1.socket.roomId = roomId;
      user2.socket.roomId = roomId;
      user1.socket.interests = user1.interests;
      user2.socket.interests = user2.interests;

      user1.socket.join(roomId);
      user2.socket.join(roomId);

      user1.socket.emit('paired', { roomId, partnerId: user2.socket.id });
      user2.socket.emit('paired', { roomId, partnerId: user1.socket.id });
    }
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});