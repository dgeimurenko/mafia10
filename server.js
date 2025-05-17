const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let users = {}; // socket.id -> { nickname, slot, randomNumber }

app.use(express.static('public'));

io.on('connection', socket => {
  socket.on('setPlayerInfo', ({ nickname, slot }) => {
    users[socket.id] = {
      nickname,
      slot: parseInt(slot),
      randomNumber: null
    };
    updateUsers();
  });

  socket.on('startGame', () => {
    const shuffled = shuffleNumbers(1, 10);
    let index = 0;

    for (const id in users) {
      users[id].randomNumber = shuffled[index++];
      io.to(id).emit('gameStarted', users[id].randomNumber);
    }

    updateUsers();
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    updateUsers();
  });

  function updateUsers() {
    const list = Object.values(users)
      .sort((a, b) => a.slot - b.slot)
      .map(u => ({ nickname: u.nickname, slot: u.slot }));
    io.emit('updateUsers', list);
  }

  function shuffleNumbers(min, max) {
    const numbers = [];
    for (let i = min; i <= max; i++) numbers.push(i);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
