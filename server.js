const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let onlineUsers = new Set();

app.use(express.static('public'));

io.on('connection', socket => {
  onlineUsers.add(socket.id);
  io.emit('updateUsers', Array.from(onlineUsers));

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('updateUsers', Array.from(onlineUsers));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
