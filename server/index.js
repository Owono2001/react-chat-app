// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

// --- ADD THIS MAP ---
// Stores connected users: socket.id -> username
const users = new Map();
// --- END OF ADDITION ---

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3001;

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- ADD THIS LISTENER for when user provides username ---
  socket.on('user joined', (username) => {
    if (username) { // Ensure username is not empty
        users.set(socket.id, username); // Store user
        console.log(`${username} (${socket.id}) joined the chat.`);
        // Broadcast the updated user list to ALL clients
        io.emit('user list', Array.from(users.values()));
    }
  });
  // --- END OF ADDED LISTENER ---


  // --- MODIFY THIS LISTENER for disconnect ---
  socket.on('disconnect', () => {
    const username = users.get(socket.id); // Get username before deleting
    if (username) {
        users.delete(socket.id); // Remove user from map
        console.log(`${username} (${socket.id}) disconnected.`);
        // Broadcast the updated user list to ALL remaining clients
        io.emit('user list', Array.from(users.values()));
    } else {
        // Handle cases where disconnect happens before username is set (optional logging)
         console.log(`User ${socket.id} disconnected (no username was set).`);
    }
  });
  // --- END OF MODIFICATION ---


  socket.on('chat message', (msgObject) => {
    msgObject.timestamp = new Date();
    console.log(`Message from ${socket.id} (${msgObject.username}): ${msgObject.text}`);
    io.emit('chat message', msgObject);
  });

  // --- ADD TYPING LISTENERS ---
  socket.on('start typing', (username) => {
    // Broadcast to all clients EXCEPT the one who is typing
    socket.broadcast.emit('user typing', username);
    // Optional: log on server
    // console.log(`${username} is typing...`);
  });

  socket.on('stop typing', (username) => {
    // Broadcast to all clients EXCEPT the one who stopped typing
    socket.broadcast.emit('user stopped typing', username);
    // Optional: log on server
    // console.log(`${username} stopped typing.`);
  });
  // --- END OF ADDED LISTENERS ---

});

app.get('/', (req, res) => {
  res.send('<h1>Chat Server Backend</h1><p>Socket.IO is likely running!</p>');
});

server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
});