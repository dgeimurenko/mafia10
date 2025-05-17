const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let users = {}; // socket.id -> { nickname, slot, role }

app.use(express.static('public'));

io.on('connection', socket => {
  socket.on('setPlayerInfo', ({ nickname, slot }) => {
    users[socket.id] = {
      nickname,
      slot: parseInt(slot),
      role: null
    };
    updateUsers();
  });

  socket.on('startGame', () => {
    const roles = [
      'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 
      'Шериф', 'Мафия', 'Мафия', 'Дон Мафии'
    ];
    const shuffledRoles = shuffleArray(roles);

    let index = 0;
    for (const id in users) {
      users[id].role = shuffledRoles[index++];
      io.to(id).emit('gameStarted', users[id].role);
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

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
