const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let users = {}; // socket.id -> nickname

app.use(express.static('public'));

io.on('connection', socket => {
  socket.on('setNickname', nickname => {
    users[socket.id] = nickname || 'Anonymous';
    io.emit('updateUsers', Object.values(users));
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('updateUsers', Object.values(users));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
